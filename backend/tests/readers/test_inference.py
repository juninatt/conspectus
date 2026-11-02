from datetime import UTC, date, datetime

import pytest

from conspectus.models import ColumnType, Value
from conspectus.readers.inference import (
    Scalar,
    TypeMismatch,
    check_type,
    convert,
    infer_type,
)


@pytest.mark.parametrize(
    ("values", "expected"),
    [
        ([1, 2], ColumnType.INTEGER),
        ([1, 2.5], ColumnType.NUMBER),
        ([True, False], ColumnType.BOOLEAN),
        (["a", "b"], ColumnType.STRING),
        (["2026-10-01"], ColumnType.DATE),
        (["2026-10-01T14:30:00"], ColumnType.DATETIME),
        (["2026-10-01 14:30"], ColumnType.DATETIME),
        (["2026-10-01T14:30:00Z", "2026-10-01T15:00+02:00"], ColumnType.DATETIME),
        (["2026-10-01", "2026-10-01T14:30:00"], ColumnType.DATETIME),
        ([None, 3], ColumnType.INTEGER),
        ([None, None], ColumnType.STRING),
        ([], ColumnType.STRING),
    ],
)
def test_infers_type(values: list[Scalar], expected: ColumnType) -> None:
    assert infer_type(values) == expected


@pytest.mark.parametrize(
    "values",
    [
        [1, "a"],
        [True, 1],
        ["2026-10-01", "soon"],
        ["01/10/2026"],
        ["20261001"],
        ["2026-13-01"],
        ["2026-10-01T14:30:00Z", "2026-10-01T14:30:00"],
    ],
    ids=[
        "number and text",
        "boolean and number",
        "date and text",
        "ambiguous date format",
        "compact date format",
        "invalid month",
        "mixed time zone awareness",
    ],
)
def test_falls_back_to_string(values: list[Scalar]) -> None:
    assert infer_type(values) == ColumnType.STRING


@pytest.mark.parametrize(
    ("value", "column_type", "expected"),
    [
        ("text", ColumnType.STRING, "text"),
        (1, ColumnType.STRING, "1"),
        (True, ColumnType.STRING, "true"),
        (3, ColumnType.NUMBER, 3.0),
        (7, ColumnType.INTEGER, 7),
        (False, ColumnType.BOOLEAN, False),
        ("2026-10-01", ColumnType.DATE, date(2026, 10, 1)),
        (
            "2026-10-01T14:30:00Z",
            ColumnType.DATETIME,
            datetime(2026, 10, 1, 14, 30, tzinfo=UTC),
        ),
        ("2026-10-01", ColumnType.DATETIME, datetime(2026, 10, 1)),
        (None, ColumnType.INTEGER, None),
    ],
)
def test_converts_value(
    value: Scalar, column_type: ColumnType, expected: Value
) -> None:
    converted = convert(value, column_type)

    assert converted == expected
    assert type(converted) is type(expected)


@pytest.mark.parametrize(
    ("values", "column_type"),
    [
        ([1, None, 2], ColumnType.INTEGER),
        ([1, 2.5], ColumnType.NUMBER),
        ([1, "a", True], ColumnType.STRING),
        (["2026-10-01", "2026-10-01T14:30"], ColumnType.DATETIME),
    ],
)
def test_check_type_accepts_fitting_values(
    values: list[Scalar], column_type: ColumnType
) -> None:
    check_type(values, column_type)


@pytest.mark.parametrize(
    ("values", "column_type", "row", "reason"),
    [
        ([1, 2.5], ColumnType.INTEGER, 2, "2.5 is not a valid integer"),
        ([1, True], ColumnType.NUMBER, 2, "True is not a valid number"),
        (["2026-10-01", "soon"], ColumnType.DATE, 2, "'soon' is not a valid date"),
        (
            ["2026-10-01T14:30Z", "2026-10-01T14:30"],
            ColumnType.DATETIME,
            None,
            "mixes date-times with and without a time zone",
        ),
    ],
)
def test_check_type_reports_first_mismatch(
    values: list[Scalar], column_type: ColumnType, row: int | None, reason: str
) -> None:
    with pytest.raises(TypeMismatch) as error:
        check_type(values, column_type)

    assert error.value.row == row
    assert error.value.reason == reason


def test_explicit_boolean_accepts_zero_and_one() -> None:
    check_type([0, 1, None, True], ColumnType.BOOLEAN)

    assert convert(1, ColumnType.BOOLEAN) is True
    assert convert(0, ColumnType.BOOLEAN) is False


@pytest.mark.parametrize("value", [2, 1.0, "1"])
def test_explicit_boolean_rejects_other_values(value: Scalar) -> None:
    with pytest.raises(TypeMismatch):
        check_type([value], ColumnType.BOOLEAN)


def test_zero_and_one_are_not_inferred_as_boolean() -> None:
    assert infer_type([0, 1, 1]) == ColumnType.INTEGER
