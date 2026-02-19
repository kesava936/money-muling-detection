from flask import Flask, request, jsonify
import time
import os

from main import run_pipeline
from final_json_builder import save_json

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "outputs"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# ======================================================
# MAIN API
# ======================================================
@app.route("/analyze", methods=["POST"])
def analyze():

    start_time = time.time()

    # check file
    if "file" not in request.files:
        return jsonify({"error": "No CSV uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    # save uploaded file
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    print("CSV received:", filepath)

    try:
        _, _, final_json = run_pipeline(filepath, start_time)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    # ======================================================
    # STEP 7: SAVE JSON
    # ======================================================
    save_json(final_json)

    # ======================================================
    # STEP 8: RETURN RESPONSE
    # ======================================================
    return jsonify(final_json)


# ======================================================
# RUN SERVER
# ======================================================
if __name__ == "__main__":
    app.run(debug=True)
