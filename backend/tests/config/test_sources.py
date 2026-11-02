from pathlib import Path

import pytest

from conspectus.config import ConfigError, SqliteSource, load_sources, source_id
from conspectus.models import ColumnType


def write_config(tmp_path: Path, content: str) -> Path:
    path = tmp_path / "sources.yaml"
    path.write_text(content, encoding="utf-8")
    return path


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Weather stations", "weather-stations"),
        ("Build_times 2026", "build-times-2026"),
        ("  Tidy -- spacing!  ", "tidy-spacing"),
        ("Åsa's mätdata", "asa-s-matdata"),
    ],
)
def test_derives_id_from_name(name: str, expected: str) -> None:
    assert source_id(name) == expected


def test_loads_json_source(tmp_path: Path) -> None:
    path = write_config(
        tmp_path,
        """
sources:
  - name: Weather stations
    description: Hourly readings
    format: json
    path: data/measurements.json
    columns:
      serviced: date
""",
    )

    [source] = load_sources(path)

    assert source.id == "weather-stations"
    assert source.name == "Weather stations"
    assert source.description == "Hourly readings"
    assert source.columns == {"serviced": ColumnType.DATE}


def test_resolves_relative_path_from_config_folder(tmp_path: Path) -> None:
    path = write_config(
        tmp_path, "sources: [{name: A, format: json, path: data/a.json}]"
    )

    [source] = load_sources(path)

    assert source.path == (tmp_path / "data" / "a.json").resolve()


def test_keeps_absolute_path(tmp_path: Path) -> None:
    data_file = (tmp_path / "elsewhere" / "a.json").resolve()
    path = write_config(
        tmp_path, f"sources: [{{name: A, format: json, path: '{data_file}'}}]"
    )

    [source] = load_sources(path)

    assert source.path == data_file


def test_optional_fields_have_defaults(tmp_path: Path) -> None:
    path = write_config(tmp_path, "sources: [{name: A, format: json, path: a.json}]")

    [source] = load_sources(path)

    assert source.description is None
    assert source.columns == {}


def test_accepts_empty_source_list(tmp_path: Path) -> None:
    assert load_sources(write_config(tmp_path, "sources: []")) == []


def test_rejects_missing_file(tmp_path: Path) -> None:
    with pytest.raises(ConfigError, match="Cannot read source configuration"):
        load_sources(tmp_path / "missing.yaml")


@pytest.mark.parametrize(
    ("content", "message"),
    [
        ("sources: [", "Invalid YAML"),
        ("", "expected a mapping with a 'sources' list"),
        ("- name: A", "expected a mapping with a 'sources' list"),
        (
            "sources: [{name: A, format: json}]",
            r"source 1 \('A'\), path: Field required",
        ),
        (
            "sources: [{name: A, format: json, path: a.json, pth: b.json}]",
            "source 1 \\('A'\\), pth: Extra inputs are not permitted",
        ),
        (
            "sources: [{name: A, format: csv, path: a.json}]",
            "source 1 \\('A'\\): Input tag 'csv' .* expected tags: 'json', 'sqlite'",
        ),
        (
            "sources: [{name: A, format: json, path: a.json, columns: {x: text}}]",
            "source 1 \\('A'\\), columns.x: Input should be 'string'",
        ),
        (
            "sources: [{name: '!!', format: json, path: a.json}]",
            "name: must contain at least one letter or digit",
        ),
        (
            "sources: [{name: Weather, format: json, path: a.json},"
            " {name: weather!, format: json, path: b.json}]",
            "'Weather' and 'weather!' both get the id 'weather'",
        ),
        ("sources: []\nextra: 1", "extra: Extra inputs are not permitted"),
    ],
    ids=[
        "malformed YAML",
        "empty file",
        "not a mapping",
        "missing field",
        "unknown field",
        "unsupported format",
        "unknown column type",
        "name without letters",
        "duplicate id",
        "unknown top-level key",
    ],
)
def test_rejects_invalid_configuration(
    tmp_path: Path, content: str, message: str
) -> None:
    with pytest.raises(ConfigError, match=message):
        load_sources(write_config(tmp_path, content))


def test_loads_sqlite_sources(tmp_path: Path) -> None:
    path = write_config(
        tmp_path,
        """
sources:
  - name: Events
    format: sqlite
    path: app.db
    table: events
  - name: Daily events
    format: sqlite
    path: app.db
    query: SELECT day, count(*) AS events FROM events GROUP BY day
""",
    )

    table_source, query_source = load_sources(path)

    assert isinstance(table_source, SqliteSource)
    assert table_source.table == "events"
    assert table_source.path == (tmp_path / "app.db").resolve()
    assert isinstance(query_source, SqliteSource)
    assert query_source.query is not None


@pytest.mark.parametrize(
    "fields",
    ["", ", table: t, query: SELECT 1"],
    ids=["neither", "both"],
)
def test_sqlite_source_needs_table_or_query(tmp_path: Path, fields: str) -> None:
    path = write_config(
        tmp_path, f"sources: [{{name: A, format: sqlite, path: a.db{fields}}}]"
    )

    with pytest.raises(ConfigError, match="set exactly one of 'table' and 'query'"):
        load_sources(path)


def test_json_source_rejects_sqlite_fields(tmp_path: Path) -> None:
    path = write_config(
        tmp_path, "sources: [{name: A, format: json, path: a.json, table: t}]"
    )

    with pytest.raises(ConfigError, match=r"source 1 \('A'\), table: Extra inputs"):
        load_sources(path)
