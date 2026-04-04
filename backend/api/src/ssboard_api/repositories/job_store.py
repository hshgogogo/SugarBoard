from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from threading import RLock
from uuid import UUID

from ssboard_api.api.schemas import AnalysisJob


@dataclass(slots=True)
class StoredJob:
    job: AnalysisJob
    target_job: AnalysisJob | None = None
    created_at: datetime | None = None


class InMemoryJobStore:
    def __init__(self) -> None:
        self._lock = RLock()
        self._jobs: dict[UUID, StoredJob] = {}

    def upsert(self, stored: StoredJob) -> StoredJob:
        with self._lock:
            self._jobs[stored.job.id] = stored
        return stored

    def get(self, job_id: UUID) -> StoredJob | None:
        with self._lock:
            return self._jobs.get(job_id)

    def list(self) -> list[StoredJob]:
        with self._lock:
            return sorted(self._jobs.values(), key=lambda item: item.job.created_at, reverse=True)
