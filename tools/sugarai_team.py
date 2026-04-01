#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
TEAM_CONFIG_JSON_PATH = REPO_ROOT / ".codex" / "team_roles.json"


@dataclass(frozen=True)
class RoleSpec:
    name: str
    display_name: str
    description: str
    instructions: Path
    skill_allowlist: tuple[str, ...]
    needs_worktree: bool
    worktree_path: Path


@dataclass(frozen=True)
class SkillSpec:
    name: str
    path: Path


def load_team_config() -> tuple[dict, dict[str, RoleSpec]]:
    if TEAM_CONFIG_JSON_PATH.exists():
        with TEAM_CONFIG_JSON_PATH.open("r", encoding="utf-8") as handle:
            raw = json.load(handle)
    else:
        raise SystemExit(
            "Missing .codex/team_roles.json. This launcher uses JSON config so it works on Python 3.9+."
        )

    roles: dict[str, RoleSpec] = {}
    for role_name, role_data in raw["roles"].items():
        roles[role_name] = RoleSpec(
            name=role_name,
            display_name=role_data["display_name"],
            description=role_data["description"],
            instructions=(REPO_ROOT / role_data["instructions"]).resolve(),
            skill_allowlist=tuple(role_data["skill_allowlist"]),
            needs_worktree=bool(role_data["needs_worktree"]),
            worktree_path=(REPO_ROOT / role_data["worktree_path"]).resolve(),
        )
    return raw, roles


def discover_skill_specs() -> list[SkillSpec]:
    roots = [
        REPO_ROOT / ".agents" / "skills",
        Path.home() / ".agents" / "skills",
        Path.home() / ".codex" / "skills",
        Path.home() / ".codex" / "plugins",
    ]

    discovered: dict[Path, SkillSpec] = {}
    for root in roots:
        if not root.exists():
            continue
        for skill_md in root.rglob("SKILL.md"):
            name = read_skill_name(skill_md)
            discovered[skill_md.resolve()] = SkillSpec(name=name, path=skill_md.resolve())
    return sorted(discovered.values(), key=lambda item: (item.name, str(item.path)))


def read_skill_name(skill_md: Path) -> str:
    text = skill_md.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()
    if lines and lines[0].strip() == "---":
        for line in lines[1:40]:
            if line.strip() == "---":
                break
            match = re.match(r"\s*name\s*:\s*([a-z0-9-]+)\s*$", line)
            if match:
                return match.group(1)
    return skill_md.parent.name


def toml_string(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def build_skills_config_override(
    skills: list[SkillSpec], allowlist: tuple[str, ...]
) -> tuple[str, list[str], int]:
    allowed = set(allowlist)
    project_skill_dir = REPO_ROOT / ".agents" / "skills"
    local_allow_paths = {
        (project_skill_dir / name / "SKILL.md").resolve()
        for name in allowlist
        if (project_skill_dir / name / "SKILL.md").exists()
    }
    local_allowed_names = {path.parent.name for path in local_allow_paths}
    discovered_names = {skill.name for skill in skills}
    missing = sorted(
        name
        for name in allowed
        if name not in discovered_names and (project_skill_dir / name / "SKILL.md").exists() is False
    )
    disabled_items = []
    for skill in skills:
        if skill.path in local_allow_paths:
            continue
        if skill.name in allowed and skill.name not in local_allowed_names:
            continue
        disabled_items.append(
            "{ path = " + toml_string(str(skill.path)) + ", enabled = false }"
        )
    return "[" + ", ".join(disabled_items) + "]", missing, len(disabled_items)


def build_launch_command(role: RoleSpec, skills_override: str) -> list[str]:
    cwd = REPO_ROOT
    if role.needs_worktree and role.worktree_path.exists():
        cwd = role.worktree_path

    return [
        "codex",
        "-C",
        str(cwd),
        "-c",
        f"model_instructions_file={toml_string(str(role.instructions))}",
        "-c",
        f"skills.config={skills_override}",
    ]


def run_launch(args: argparse.Namespace) -> int:
    _, roles = load_team_config()
    role = roles[args.role]
    skills = discover_skill_specs()
    skills_override, missing, disabled_count = build_skills_config_override(skills, role.skill_allowlist)
    command = build_launch_command(role, skills_override)
    if args.prompt:
        command.append(args.prompt)

    print(f"Role: {role.name}")
    print(f"Allowlisted skills: {', '.join(role.skill_allowlist)}")
    print(f"Discovered skills: {len(skills)}")
    print(f"Disabled skills: {disabled_count}")
    if missing:
        print("Missing allowlisted skills: " + ", ".join(missing), file=sys.stderr)
    if role.needs_worktree and not role.worktree_path.exists():
        print(
            f"Worktree not found for {role.name}; falling back to repo root {REPO_ROOT}.",
            file=sys.stderr,
        )

    if args.print_only:
        print(shlex.join(command))
        return 0

    os.execvp(command[0], command)
    return 0


def run_roles(_: argparse.Namespace) -> int:
    _, roles = load_team_config()
    for role in roles.values():
        worktree_state = "worktree" if role.needs_worktree else "repo-root"
        skill_list = ", ".join(role.skill_allowlist)
        print(f"{role.name}: {worktree_state} | skills=[{skill_list}]")
    return 0


def run_bootstrap(args: argparse.Namespace) -> int:
    team_meta, roles = load_team_config()
    worktree_root = (REPO_ROOT / team_meta["worktree_root"]).resolve()
    worktree_root.mkdir(parents=True, exist_ok=True)

    repo_ready = is_git_repo(REPO_ROOT)
    if args.init_git and not repo_ready:
        git(["init", "-b", args.initial_branch], cwd=REPO_ROOT)
        repo_ready = True

    if args.create_worktrees:
        if not repo_ready:
            raise SystemExit("Cannot create worktrees before the repository is initialized with git.")
        if not has_commit(REPO_ROOT):
            if args.empty_initial_commit:
                git(["commit", "--allow-empty", "-m", "chore: initialize sugar-ai-team"], cwd=REPO_ROOT)
            else:
                raise SystemExit(
                    "Cannot create worktrees before the repository has an initial commit. "
                    "Use --empty-initial-commit if you want the bootstrapper to create one."
                )
        base_branch = args.base_branch or current_branch(REPO_ROOT) or args.initial_branch
        for role in roles.values():
            if not role.needs_worktree:
                continue
            ensure_worktree(
                repo_root=REPO_ROOT,
                role=role,
                base_branch=base_branch,
                branch_prefix=team_meta["branch_prefix"],
                task_id=args.task_id,
            )

    print(f"Bootstrap complete for {team_meta['team_name']}.")
    return 0


def ensure_worktree(
    repo_root: Path,
    role: RoleSpec,
    base_branch: str,
    branch_prefix: str,
    task_id: str,
) -> None:
    branch_name = f"{branch_prefix}/{role.name}/{task_id}"
    if role.worktree_path.exists():
        print(f"Skipping {role.name}: worktree path already exists at {role.worktree_path}")
        return

    role.worktree_path.parent.mkdir(parents=True, exist_ok=True)
    if git_branch_exists(repo_root, branch_name):
        git(["worktree", "add", str(role.worktree_path), branch_name], cwd=repo_root)
    else:
        git(["worktree", "add", "-b", branch_name, str(role.worktree_path), base_branch], cwd=repo_root)
    print(f"Created {role.name} worktree at {role.worktree_path} on branch {branch_name}")


def is_git_repo(path: Path) -> bool:
    result = subprocess.run(
        ["git", "-C", str(path), "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


def has_commit(path: Path) -> bool:
    result = subprocess.run(
        ["git", "-C", str(path), "rev-parse", "--verify", "HEAD"],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


def current_branch(path: Path) -> str | None:
    result = subprocess.run(
        ["git", "-C", str(path), "branch", "--show-current"],
        capture_output=True,
        text=True,
        check=False,
    )
    branch = result.stdout.strip()
    return branch or None


def git_branch_exists(path: Path, branch_name: str) -> bool:
    result = subprocess.run(
        ["git", "-C", str(path), "show-ref", "--verify", f"refs/heads/{branch_name}"],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


def git(args: list[str], cwd: Path) -> None:
    command = ["git", "-C", str(cwd), *args]
    print(shlex.join(command))
    subprocess.run(command, check=True)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Bootstrap and launch sugar-ai-team roles.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    roles_parser = subparsers.add_parser("roles", help="List configured team roles and skill allowlists.")
    roles_parser.set_defaults(func=run_roles)

    launch_parser = subparsers.add_parser(
        "launch",
        help="Launch a role with strict skill allowlisting. All other discovered skills are disabled.",
    )
    launch_parser.add_argument("role", help="Role name defined in .codex/team_roles.json.")
    launch_parser.add_argument("prompt", nargs="?", help="Optional initial prompt to pass to Codex.")
    launch_parser.add_argument(
        "--print-only",
        action="store_true",
        help="Print the resolved Codex launch command instead of executing it.",
    )
    launch_parser.set_defaults(func=run_launch)

    bootstrap_parser = subparsers.add_parser(
        "bootstrap",
        help="Prepare team directories, optionally initialize git, and optionally create role worktrees.",
    )
    bootstrap_parser.add_argument("--init-git", action="store_true", help="Run git init if the repo is not initialized.")
    bootstrap_parser.add_argument(
        "--initial-branch",
        default="main",
        help="Initial branch name to use when running git init. Default: main.",
    )
    bootstrap_parser.add_argument(
        "--create-worktrees",
        action="store_true",
        help="Create worktrees for frontend-engineer, backend-engineer, ai-engineer, and qa-reviewer.",
    )
    bootstrap_parser.add_argument(
        "--empty-initial-commit",
        action="store_true",
        help="Create an empty initial commit when worktrees are requested but the repo has no commits.",
    )
    bootstrap_parser.add_argument(
        "--base-branch",
        default=None,
        help="Base branch to branch worktrees from. Defaults to the current branch when available.",
    )
    bootstrap_parser.add_argument(
        "--task-id",
        default="bootstrap",
        help="Task id used in generated worktree branch names. Default: bootstrap.",
    )
    bootstrap_parser.set_defaults(func=run_bootstrap)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
