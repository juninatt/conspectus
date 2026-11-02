import sqlite3
from contextlib import closing
from datetime import date, datetime
from pathlib import Path

import pytest

from conspectus.models import Column, ColumnType
from conspectus.readers import Reader, ReaderError, SqliteReader


def create_database(path: Path, *statements: str) -> Path:
    with closing(sqlite3.connect(path)) as connection:
        for statement in statements:
            connection.execute(statement)
        connection.commit()
    return path


@pytest.fixture
def database(tmp_path: Path) -> Path:
    return create_database(
        tmp_path / "app.db",
        """
        CREATE TABLE events (
            id INTEGER, label TEXT, score REAL, active BOOLEAN,
            day DATE, at TIMESTAMP, note TEXT
        )
        """,
        """
        INSERT INTO events VALUES
            (1, 'first', 0.5, 1, '2026-10-01', '2026-10-01 08:00:00', NULL),
            (2, 'second', 1.25, 0, '2026-10-02', '2026-10-02 09:30:00', 'late')
        """,
    )


def test_reads_table_using_declared_types(database: Path) -> None:
    reader: Reader = SqliteReader(database, table="events")

    dataset = reader.read()

    assert dataset.columns == [
        Column(name="id", type=ColumnType.INTEGER, nullable=False),
        Column(name="label", type=ColumnType.STRING, nullable=False),
        Column(name="score", type=ColumnType.NUMBER, nullable=False),
        Column(name="active", type=ColumnType.BOOLEAN, nullable=False),
        Column(name="day", type=ColumnType.DATE, nullable=False),
        Column(name="at", type=ColumnType.DATETIME, nullable=False),
        Column(name="note", type=ColumnType.STRING, nullable=True),
    ]
    assert dataset.rows[0] == {
        "id": 1,
        "label": "first",
        "score": 0.5,
        "active": True,
        "day": date(2026, 10, 1),
        "at": datetime(2026, 10, 1, 8, 0),
        "note": None,
    }


def test_ignores_declared_type_that_values_do_not_fit(tmp_path: Path) -> None:
    path = create_database(
        tmp_path / "app.db",
        "CREATE TABLE t (due DATE, flag BOOLEAN)",
        "INSERT INTO t VALUES ('soon', 2)",
    )

    dataset = SqliteReader(path, table="t").read()

    assert [column.type for column in dataset.columns] == [
        ColumnType.STRING,
        ColumnType.INTEGER,
    ]


def test_infers_types_of_query_results(database: Path) -> None:
    reader = SqliteReader(
        database,
        query="SELECT active, count(*) AS events FROM events GROUP BY active",
    )

    dataset = reader.read()

    # Query results carry no declared types, so 0/1 is inferred as integer …
    assert dataset.columns[0].type == ColumnType.INTEGER
    assert dataset.rows == [{"active": 0, "events": 1}, {"active": 1, "events": 1}]


def test_applies_overrides_to_query_results(database: Path) -> None:
    reader = SqliteReader(
        database,
        query="SELECT active, count(*) AS events FROM events GROUP BY active",
        column_types={"active": ColumnType.BOOLEAN},
    )

    # … unless the type is set explicitly.
    assert reader.read().rows[0] == {"active": False, "events": 1}


def test_empty_table_keeps_its_columns(tmp_path: Path) -> None:
    path = create_database(tmp_path / "app.db", "CREATE TABLE t (day DATE, n INT)")

    dataset = SqliteReader(path, table="t").read()

    assert [(column.name, column.type) for column in dataset.columns] == [
        ("day", ColumnType.DATE),
        ("n", ColumnType.STRING),
    ]
    assert dataset.rows == []


@pytest.mark.parametrize(
    "query",
    ["DELETE FROM events", "UPDATE events SET label = 'x'", "DROP TABLE events"],
)
def test_query_cannot_modify_the_database(database: Path, query: str) -> None:
    with pytest.raises(ReaderError, match="readonly"):
        SqliteReader(database, query=query).read()

    assert len(SqliteReader(database, table="events").read().rows) == 2


def test_table_name_is_quoted(database: Path) -> None:
    with pytest.raises(ReaderError, match="no such table"):
        SqliteReader(database, table='events"; DROP TABLE events; --').read()

    assert len(SqliteReader(database, table="events").read().rows) == 2


def test_rejects_missing_file(tmp_path: Path) -> None:
    with pytest.raises(ReaderError, match="file not found"):
        SqliteReader(tmp_path / "missing.db", table="t").read()


def test_rejects_file_that_is_not_a_database(tmp_path: Path) -> None:
    path = tmp_path / "app.db"
    path.write_text("not a database", encoding="utf-8")

    with pytest.raises(ReaderError, match="not a database"):
        SqliteReader(path, table="t").read()


def test_rejects_unknown_table(database: Path) -> None:
    with pytest.raises(ReaderError, match="no such table: nope"):
        SqliteReader(database, table="nope").read()


def test_rejects_binary_values(tmp_path: Path) -> None:
    path = create_database(
        tmp_path / "app.db",
        "CREATE TABLE t (name TEXT, picture BLOB)",
        "INSERT INTO t VALUES ('a', x'00ff')",
    )

    with pytest.raises(
        ReaderError, match="row 1, column 'picture': binary values are not supported"
    ):
        SqliteReader(path, table="t").read()


def test_rejects_duplicate_column_names(database: Path) -> None:
    with pytest.raises(ReaderError, match="duplicate column name.*'a'"):
        SqliteReader(database, query="SELECT 1 AS a, 2 AS a").read()


def test_watches_database_and_wal_file(database: Path) -> None:
    reader = SqliteReader(database, table="events")

    assert reader.watched_paths() == [database, database.parent / "app.db-wal"]


@pytest.mark.parametrize(
    ("table", "query"), [(None, None), ("t", "SELECT 1")], ids=["neither", "both"]
)
def test_requires_exactly_one_of_table_and_query(
    database: Path, table: str | None, query: str | None
) -> None:
    with pytest.raises(ValueError, match="exactly one"):
        SqliteReader(database, table=table, query=query)
