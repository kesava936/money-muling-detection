from collections import defaultdict
from datetime import timedelta


# Adaptive threshold: scales with dataset size
MIN_THRESHOLD = 3
MAX_THRESHOLD = 10
WINDOW_HOURS = 72


def _adaptive_threshold(total_transactions):
    """Lower threshold for small datasets, scale up for large ones."""
    if total_transactions < 50:
        return MIN_THRESHOLD
    if total_transactions < 200:
        return 5
    if total_transactions < 500:
        return 7
    return MAX_THRESHOLD


def detect_smurfing(df):
    total_tx = len(df)
    threshold = _adaptive_threshold(total_tx)

    fan_in_results = []
    fan_out_results = []

    # Group incoming and outgoing transactions
    incoming = defaultdict(list)
    outgoing = defaultdict(list)

    for row in df.itertuples(index=False):
        sender = row.sender_id
        receiver = row.receiver_id
        timestamp = row.timestamp

        incoming[receiver].append((sender, timestamp))
        outgoing[sender].append((receiver, timestamp))

    # Track already-reported accounts to avoid duplicates
    seen_fan_in = set()
    seen_fan_out = set()

    # --- FAN-IN DETECTION ---
    for account, transactions in incoming.items():
        if len(transactions) < threshold:
            continue
        if account in seen_fan_in:
            continue

        # sort by timestamp
        transactions.sort(key=lambda x: x[1])

        # Find the largest qualifying window to capture all members
        best_members = None
        left = 0

        for right in range(len(transactions)):
            while (
                transactions[right][1] - transactions[left][1]
                > timedelta(hours=WINDOW_HOURS)
            ):
                left += 1

            window_size = right - left + 1

            if window_size >= threshold:
                members = list(
                    set(sender for sender, _ in transactions[left:right + 1])
                )

                if len(members) >= max(2, threshold // 2):
                    if best_members is None or len(members) > len(best_members):
                        best_members = members

        if best_members is not None:
            seen_fan_in.add(account)
            fan_in_results.append({
                "account": account,
                "members": best_members,
                "pattern": "fan_in"
            })

    # --- FAN-OUT DETECTION ---
    for account, transactions in outgoing.items():
        if len(transactions) < threshold:
            continue
        if account in seen_fan_out:
            continue

        transactions.sort(key=lambda x: x[1])

        best_members = None
        left = 0

        for right in range(len(transactions)):
            while (
                transactions[right][1] - transactions[left][1]
                > timedelta(hours=WINDOW_HOURS)
            ):
                left += 1

            window_size = right - left + 1

            if window_size >= threshold:
                members = list(
                    set(receiver for receiver, _ in transactions[left:right + 1])
                )

                if len(members) >= max(2, threshold // 2):
                    if best_members is None or len(members) > len(best_members):
                        best_members = members

        if best_members is not None:
            seen_fan_out.add(account)
            fan_out_results.append({
                "account": account,
                "members": best_members,
                "pattern": "fan_out"
            })

    return {
        "fan_in": fan_in_results,
        "fan_out": fan_out_results
    }