import json
import time
import os


def build_final_json(suspicious_accounts, fraud_rings, total_accounts, start_time):
    """
    Builds final JSON exactly as hackathon requires
    """

    # =========================
    # SORT suspicious_accounts DESC (IMPORTANT)
    # =========================
    suspicious_accounts = sorted(
        suspicious_accounts,
        key=lambda x: x["suspicion_score"],
        reverse=True
    )

    # =========================
    # SUMMARY BLOCK
    # =========================
    summary = {
        "total_accounts_analyzed": total_accounts,
        "suspicious_accounts_flagged": len(suspicious_accounts),
        "fraud_rings_detected": len(fraud_rings),
        "processing_time_seconds": round(time.time() - start_time, 2)
    }

    # =========================
    # FINAL JSON
    # =========================
    final_json = {
        "suspicious_accounts": suspicious_accounts,
        "fraud_rings": fraud_rings,
        "summary": summary
    }

    return final_json


# ===============================
# SAVE JSON (for download button)
# ===============================
def save_json(final_json, path="outputs/result.json"):
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with open(path, "w") as f:
        json.dump(final_json, f, indent=2)
