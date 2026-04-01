#!/usr/bin/env python3
import json
import re
import subprocess
from pathlib import Path


ROOT = Path("/Users/hsh/Desktop/ssboard")
CONFIG_PATH = ROOT / "voiceover" / "meta" / "ssboard_voiceover.json"
OUTPUT_DIR = ROOT / "voiceover" / "audio"
META_DIR = ROOT / "voiceover" / "meta"


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE).strip().lower()
    text = re.sub(r"[\s_-]+", "-", text)
    return text or "slide"


def get_duration_seconds(audio_path: Path) -> float:
    result = subprocess.run(
        ["/usr/bin/afinfo", str(audio_path)],
        capture_output=True,
        text=True,
        check=True,
    )
    match = re.search(r"estimated duration:\s*([0-9.]+)\s*sec", result.stdout)
    if not match:
        raise RuntimeError(f"Could not parse duration for {audio_path}")
    return float(match.group(1))


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    voice = config["voice"]
    rate = str(config["rate"])
    lead_in = float(config["lead_in_seconds"])
    tail = float(config["tail_seconds"])
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    timeline = []

    for item in config["slides"]:
        slide_num = item["slide"]
        title = item["title"]
        text = item["text"]
        stem = f"{slide_num:02d}-{slugify(title)}"
        aiff_path = OUTPUT_DIR / f"{stem}.aiff"
        m4a_path = OUTPUT_DIR / f"{stem}.m4a"

        subprocess.run(
            ["/usr/bin/say", "-v", voice, "-r", rate, text, "-o", str(aiff_path)],
            check=True,
        )
        subprocess.run(
            [
                "/usr/bin/afconvert",
                "-f",
                "m4af",
                "-d",
                "aac",
                str(aiff_path),
                str(m4a_path),
            ],
            check=True,
        )

        duration = get_duration_seconds(aiff_path)
        timeline.append(
            {
                "slide": slide_num,
                "title": title,
                "text": text,
                "aiff_path": str(aiff_path),
                "m4a_path": str(m4a_path),
                "speech_seconds": round(duration, 2),
                "recommended_auto_advance_seconds": round(duration + lead_in + tail, 2),
            }
        )

    output = {
        "voice_engine": config["voice_engine"],
        "voice": voice,
        "rate": config["rate"],
        "lead_in_seconds": lead_in,
        "tail_seconds": tail,
        "slides": timeline,
    }
    (META_DIR / "ssboard_voiceover_timeline.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Generated {len(timeline)} slide audio files in {OUTPUT_DIR}")
    print(f"Wrote timeline metadata to {META_DIR / 'ssboard_voiceover_timeline.json'}")


if __name__ == "__main__":
    main()
