import os
from pathlib import Path

import pytest

from conspectus.catalog import Catalog, UnknownSourceError
from conspectus.config import JsonSource, Source
from conspectus.readers import JsonReader, Reader, ReaderError


def make_source(path: Path, name: str = "Readings") -> JsonSource:
    return JsonSource(name=name, format="json", path=path)


class CountingFactory:
    def __init__(self) -> None:
        self.reads = 0

    def __call__(self, source: Source) -> Reader:
        self.reads += 1
        return JsonReader(source.path, source.columns)


def test_lists_sources_and_finds_them_by_id(tmp_path: Path) -> None:
    source = make_source(tmp_path / "a.json", name="Weather stations")
    catalog = Catalog([source])

    assert catalog.sources == [source]
    assert catalog.source("weather-stations") == source


def test_rejects_unknown_id(tmp_path: Path) -> None:
    catalog = Catalog([make_source(tmp_path / "a.json")])

    with pytest.raises(UnknownSourceError) as error:
        catalog.dataset("nope")

    assert error.value.source_id == "nope"


def test_serves_unchanged_file_from_cache(tmp_path: Path) -> None:
    path = tmp_path / "a.json"
    path.write_text('[{"n": 1}]', encoding="utf-8")
    factory = CountingFactory()
    catalog = Catalog([make_source(path)], factory)

    first = catalog.dataset("readings")
    second = catalog.dataset("readings")

    assert first is second
    assert factory.reads == 1


def test_rereads_changed_file(tmp_path: Path) -> None:
    path = tmp_path / "a.json"
    path.write_text('[{"n": 1}]', encoding="utf-8")
    catalog = Catalog([make_source(path)])
    catalog.dataset("readings")

    path.write_text('[{"n": 2}]', encoding="utf-8")
    stat = path.stat()
    os.utime(path, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000_000))

    assert catalog.dataset("readings").rows == [{"n": 2}]


def test_does_not_cache_failures(tmp_path: Path) -> None:
    path = tmp_path / "a.json"
    catalog = Catalog([make_source(path)])

    with pytest.raises(ReaderError):
        catalog.dataset("readings")

    path.write_text('[{"n": 1}]', encoding="utf-8")
    assert catalog.dataset("readings").rows == [{"n": 1}]
