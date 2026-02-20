import pandas as pd


REQUIRED_COLUMNS = [
    "transaction_id",
    "sender_id",
    "receiver_id",
    "amount",
    "timestamp"
]


def parse_csv(file_path):
    df = pd.read_csv(file_path)

    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")

    df = df.dropna(subset=["sender_id", "receiver_id"])

    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        errors="coerce"
    )

    # Drop rows where timestamp couldn't be parsed
    bad = df["timestamp"].isna().sum()
    if bad > 0:
        print(f"Warning: {bad} rows had unparseable timestamps and were dropped.")
    df = df.dropna(subset=["timestamp"])

    df = df.drop_duplicates()

    return df