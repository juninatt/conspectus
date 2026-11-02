"""Column types for values whose type is not known up front, such as JSON.

Inference rules:
- Missing values (None) are ignored when inferring; a column of only missing
  values is a string column.
- Only ISO 8601 strings are recognised as dates, so ambiguous formats like
  01/10/2026 stay strings instead of being guessed.
- A column mixing date-only and date-time strings is a datetime column.
- Any other mix of types makes the column a string column.

A type can also be set explicitly. Then every value must fit it, otherwise
check_type reports the first value that does not. An explicit boolean type
also accepts 0 and 1, as stored by databases without a boolean type; these
are never inferred as booleans, since they are usually counts.
"""

import json
import re
from collections.abc import Sequence
from datetime import date, datetime

from conspectus.models import ColumnType, Value

type Scalar = str | int | float | bool | None

_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
_DATETIME = re.compile(
    r"\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})?"
)

# Most specific first; STRING fits everything and is the fallback.
_INFERENCE_ORDER = [
    ColumnType.BOOLEAN,
    ColumnType.INTEGER,
    ColumnType.NUMBER,
    ColumnType.DATE,
    ColumnType.DATETIME,
]


class TypeMismatch(ValueError):
    """A value does not fit an explicitly set column type."""

    def __init__(self, row: int | None, reason: str) -> None:
        super().__init__(reason)
        self.row = row
        self.reason = reason


def infer_type(values: Sequence[Scalar]) -> ColumnType:
    present = [value for value in values if value is not None]
    if not present:
        return ColumnType.STRING
    for column_type in _INFERENCE_ORDER:
        if all(_fits(value, column_type) for value in present):
            if column_type is ColumnType.DATETIME and _mixes_time_zones(present):
                break
            return column_type
    return ColumnType.STRING


def check_type(values: Sequence[Scalar], column_type: ColumnType) -> None:
    """Raise TypeMismatch unless every value fits the given column type."""
    for number, value in enumerate(values, start=1):
        if value is not None and not _fits(value, column_type, explicit=True):
            raise TypeMismatch(number, f"{value!r} is not a valid {column_type}")
    present = [value for value in values if value is not None]
    if column_type is ColumnType.DATETIME and _mixes_time_zones(present):
        raise TypeMismatch(None, "mixes date-times with and without a time zone")


def convert(value: Scalar, column_type: ColumnType) -> Value:
    """Convert a raw value to the Python type matching its column type."""
    if value is None:
        return None
    match column_type:
        case ColumnType.STRING:
            return value if isinstance(value, str) else json.dumps(value)
        case ColumnType.NUMBER:
            return float(value)
        case ColumnType.BOOLEAN:
            return bool(value)
        case ColumnType.DATE if isinstance(value, str):
            return date.fromisoformat(value)
        case ColumnType.DATETIME if isinstance(value, str):
            return datetime.fromisoformat(value)
        case _:
            return value


def _fits(
    value: str | int | float | bool, column_type: ColumnType, explicit: bool = False
) -> bool:
    match column_type:
        case ColumnType.STRING:
            return True
        case ColumnType.BOOLEAN:
            return isinstance(value, bool) or (
                explicit and isinstance(value, int) and value in (0, 1)
            )
        case ColumnType.INTEGER:
            return isinstance(value, int) and not isinstance(value, bool)
        case ColumnType.NUMBER:
            return isinstance(value, int | float) and not isinstance(value, bool)
        case ColumnType.DATE:
            return isinstance(value, str) and _parse_date(value) is not None
        case ColumnType.DATETIME:
            return isinstance(value, str) and _parse_datetime(value) is not None


def _parse_date(value: str) -> date | None:
    if not _DATE.fullmatch(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _parse_datetime(value: str) -> datetime | None:
    if not (_DATE.fullmatch(value) or _DATETIME.fullmatch(value)):
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _mixes_time_zones(values: Sequence[Scalar]) -> bool:
    # Values with and without a time zone cannot be compared or sorted together.
    moments = [_parse_datetime(value) for value in values if isinstance(value, str)]
    aware = {moment.tzinfo is not None for moment in moments if moment is not None}
    return len(aware) > 1
