import time
import json

from main import run_pipeline
from final_json_builder import save_json


if __name__ == "__main__":
    import sys

    start = time.time()
    file_path = sys.argv[1] if len(sys.argv) > 1 else "sample.csv"

    _, _, final_json = run_pipeline(file_path, start)

    print(json.dumps(final_json, indent=2))

    # save file
    save_json(final_json)
