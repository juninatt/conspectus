"""The interface every reader implements."""

from pathlib import Path
from typing import Protocol

from conspectus.models import Dataset


class ReaderError(Exception):
    """The source could not be read or is not in the expected shape."""


class Reader(Protocol):
    """Reads one configured source into a Dataset.

    Each reader receives everything it needs (path, table name …) when it is
    created, so reading itself takes no arguments and all formats look alike.
    """

    def read(self) -> Dataset: ...

    def watched_paths(self) -> list[Path]:
        """Files whose changes mean the data may have changed (used for caching)."""
        ...
