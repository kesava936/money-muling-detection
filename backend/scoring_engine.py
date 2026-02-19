# ============================================
# STEP 1: Suspicion Scoring System
# ============================================

# Base scores for each fraud pattern
BASE_SCORES = {
    "cycle_length_3": 85,
    "cycle_length_4": 80,
    "cycle_length_5": 75,
    "fan_in": 70,
    "fan_out": 70,
    "shell_chain": 65
}


def calculate_suspicion_scores(detections, transaction_counts):
    """
    detections: output from person 1
    transaction_counts: number of transactions per account (dict)

    returns:
    list of suspicious accounts with suspicion scores
    """

    account_scores = {}

    def add_score(account, score, pattern):
        if account not in account_scores:
            account_scores[account] = {"score": 0, "patterns": []}
        account_scores[account]["score"] += score
        account_scores[account]["patterns"].append(pattern)

    # ===============================
    # 1. CYCLE SCORING
    # ===============================
    for cycle in detections.get("cycles", []):
        members = cycle.get("members", [])
        length = cycle.get("length", len(members))
        pattern_name = f"cycle_length_{length}"
        base_score = BASE_SCORES.get(pattern_name, 75)

        for acc in members:
            add_score(acc, base_score, pattern_name)

    # ===============================
    # 2. FAN-IN SCORING
    # ===============================
    for cluster in detections.get("fan_in", []):
        base_score = BASE_SCORES["fan_in"]
        aggregator = cluster.get("aggregator", cluster.get("account"))
        senders = cluster.get("senders", cluster.get("members", []))
        all_accounts = [aggregator] + senders if aggregator else senders

        for acc in all_accounts:
            add_score(acc, base_score, "fan_in")

    # ===============================
    # 3. FAN-OUT SCORING
    # ===============================
    for cluster in detections.get("fan_out", []):
        base_score = BASE_SCORES["fan_out"]
        distributor = cluster.get("distributor", cluster.get("account"))
        receivers = cluster.get("receivers", cluster.get("members", []))
        all_accounts = [distributor] + receivers if distributor else receivers

        for acc in all_accounts:
            add_score(acc, base_score, "fan_out")

    # ===============================
    # 4. SHELL CHAIN SCORING
    # ===============================
    for chain in detections.get("shell_chains", []):
        base_score = BASE_SCORES["shell_chain"]
        path = chain.get("path", chain.get("members", []))

        for acc in path:
            add_score(acc, base_score, "shell_chain")

    # ===============================
    # 5. MULTI-PATTERN BONUS
    # ===============================
    for acc in account_scores:
        unique_patterns = list(set(account_scores[acc]["patterns"]))
        extra = len(unique_patterns) - 1

        if extra > 0:
            account_scores[acc]["score"] += extra * 10

        # cap at 100
        if account_scores[acc]["score"] > 100:
            account_scores[acc]["score"] = 100

        account_scores[acc]["score"] = round(account_scores[acc]["score"], 2)
        account_scores[acc]["patterns"] = unique_patterns

    # ===============================
    # 6. FALSE POSITIVE REDUCTION
    # ===============================
    for acc in account_scores:
        tx_count = transaction_counts.get(acc, 0)
        patterns = account_scores[acc]["patterns"]

        in_cycle = any("cycle" in p for p in patterns)

        if tx_count > 100 and not in_cycle:
            account_scores[acc]["score"] *= 0.4
            account_scores[acc]["score"] = round(account_scores[acc]["score"], 2)

    # ===============================
    # 7. BUILD FINAL LIST
    # ===============================
    suspicious_accounts = []

    for acc, data in account_scores.items():
        suspicious_accounts.append({
            "account_id": acc,
            "suspicion_score": float(data["score"]),
            "detected_patterns": data["patterns"],
            "ring_id": ""   # added in step 2
        })

    # ===============================
    # 8. SORT DESCENDING
    # ===============================
    suspicious_accounts.sort(
        key=lambda x: x["suspicion_score"],
        reverse=True
    )

    return suspicious_accounts
