"""Readers turn a data source into a Dataset, one reader per format."""

from conspectus.readers.base import Reader, ReaderError
from conspectus.readers.factory import create_reader
from conspectus.readers.json_reader import JsonReader
from conspectus.readers.sqlite_reader import SqliteReader

__all__ = ["JsonReader", "Reader", "ReaderError", "SqliteReader", "create_reader"]
