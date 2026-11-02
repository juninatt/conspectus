"""The configured sources and their datasets, read on demand and cached."""

import os
from collections.abc import Callable
from pathlib import Path

from conspectus.config import Source
from conspectus.models import Dataset
from conspectus.readers import Reader, create_reader

type FileKey = tuple[int, int]


class UnknownSourceError(LookupError):
    def __init__(self, source_id: str) -> None:
        super().__init__(source_id)
        self.source_id = source_id


class Catalog:
    """Gives access to sources by id.

    A dataset is cached after it has been read and served from memory until
    its file's modification time or size changes, so responses are fast but
    never stale.
    """

    def __init__(
        self,
        sources: list[Source],
        reader_factory: Callable[[Source], Reader] = create_reader,
    ) -> None:
        self._sources = {source.id: source for source in sources}
        self._create_reader = reader_factory
        self._cache: dict[str, tuple[FileKey, Dataset]] = {}

    @property
    def sources(self) -> list[Source]:
        return list(self._sources.values())

    def source(self, source_id: str) -> Source:
        try:
            return self._sources[source_id]
        except KeyError:
            raise UnknownSourceError(source_id) from None

    def dataset(self, source_id: str) -> Dataset:
        """Return the dataset for a source; raises ReaderError if unreadable."""
        source = self.source(source_id)

        # Taken before reading: if the file changes during the read, the next
        # request sees a newer key and reads it again.
        key = _file_key(source.path)
        cached = self._cache.get(source_id)
        if key is not None and cached is not None and cached[0] == key:
            return cached[1]

        dataset = self._create_reader(source).read()
        if key is not None:
            self._cache[source_id] = (key, dataset)
        return dataset


def _file_key(path: Path) -> FileKey | None:
    try:
        stat = os.stat(path)
    except OSError:
        return None
    return stat.st_mtime_ns, stat.st_size
