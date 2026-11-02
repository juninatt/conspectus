"""Write the API's OpenAPI schema to a file, for generating frontend types."""

import json
import sys
from pathlib import Path

from conspectus.main import create_app


def main() -> None:
    target = Path(sys.argv[1])
    target.parent.mkdir(parents=True, exist_ok=True)
    schema = create_app().openapi()
    target.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
