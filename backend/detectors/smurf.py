from collections import defaultdict
from datetime import timedelta


THRESHOLD = 10  # requirement: 10+ accounts in 72h window
WINDOW_HOURS = 72


def detect_smurfing(df):
    fan_in_results = []
    fan_out_results = []

    # Group incoming and outgoing transactions
    incoming = defaultdict(list)
    outgoing = defaultdict(list)

    for _, row in df.iterrows():
        sender = row["sender_id"]
        receiver = row["receiver_id"]
        timestamp = row["timestamp"]

        incoming[receiver].append((sender, timestamp))
        outgoing[sender].append((receiver, timestamp))

    # --- FAN IN DETECTION ---
    for account, transactions in incoming.items():
        if len(transactions) < THRESHOLD:
            continue

        # sort by timestamp
        transactions.sort(key=lambda x: x[1])

        left = 0

        for right in range(len(transactions)):
            while (
                transactions[right][1] - transactions[left][1]
                > timedelta(hours=WINDOW_HOURS)
            ):
                left += 1

            window_size = right - left + 1

            if window_size >= THRESHOLD:
                members = list(
                    set(sender for sender, _ in transactions[left:right+1])
                )

                fan_in_results.append({
                    "account": account,
                    "members": members,
                    "pattern": "fan_in"
                })
                break

    # --- FAN OUT DETECTION ---
    for account, transactions in outgoing.items():
        if len(transactions) < THRESHOLD:
            continue

        transactions.sort(key=lambda x: x[1])

        left = 0

        for right in range(len(transactions)):
            while (
                transactions[right][1] - transactions[left][1]
                > timedelta(hours=WINDOW_HOURS)
            ):
                left += 1

            window_size = right - left + 1

            if window_size >= THRESHOLD:
                members = list(
                    set(receiver for receiver, _ in transactions[left:right+1])
                )

                fan_out_results.append({
                    "account": account,
                    "members": members,
                    "pattern": "fan_out"
                })
                break

    return {
        "fan_in": fan_in_results,
        "fan_out": fan_out_results
    }