"""Turns raw column values into a typed Dataset; shared by all readers."""

from pathlib import Path

from conspectus.models import Column, ColumnType, Dataset
from conspectus.readers.base import ReaderError
from conspectus.readers.inference import (
    Scalar,
    TypeMismatch,
    check_type,
    convert,
    infer_type,
)


def build_dataset(
    source: Path,
    values_by_name: dict[str, list[Scalar]],
    overrides: dict[str, ColumnType],
    hints: dict[str, ColumnType] | None = None,
) -> Dataset:
    """Pick a type per column and convert its values.

    Columns keep the order of `values_by_name`, and every list must have one
    value per row. The type is chosen by priority:
    1. `overrides` – set by the user; every value must fit, or this fails.
    2. `hints` – declared by the format (e.g. a SQLite column type); used
       when every value fits, otherwise ignored.
    3. inference from the values.
    """
    hints = hints or {}
    row_count = len(next(iter(values_by_name.values()), []))

    if row_count:
        unknown = [name for name in overrides if name not in values_by_name]
        if unknown:
            raise ReaderError(
                f"{source}: type set for unknown column(s) "
                + ", ".join(f"'{name}'" for name in unknown)
            )

    columns = [
        Column(
            name=name,
            type=_column_type(source, name, values, overrides, hints),
            nullable=None in values,
        )
        for name, values in values_by_name.items()
    ]
    rows = [
        {
            column.name: convert(values_by_name[column.name][index], column.type)
            for column in columns
        }
        for index in range(row_count)
    ]
    return Dataset(columns=columns, rows=rows)


def _column_type(
    source: Path,
    name: str,
    values: list[Scalar],
    overrides: dict[str, ColumnType],
    hints: dict[str, ColumnType],
) -> ColumnType:
    if (column_type := overrides.get(name)) is not None:
        try:
            check_type(values, column_type)
        except TypeMismatch as error:
            row = f", row {error.row}" if error.row is not None else ""
            raise ReaderError(
                f"{source}{row}, column '{name}': {error.reason}"
            ) from error
        return column_type

    if (column_type := hints.get(name)) is not None:
        try:
            check_type(values, column_type)
        except TypeMismatch:
            pass
        else:
            return column_type

    return infer_type(values)
