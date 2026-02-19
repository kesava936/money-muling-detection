# json_builder.py
# STEP 2: Ring ID generation + fraud ring building

def build_rings_and_assign_ids(detections, suspicious_accounts):
    """
    detections -> from person 1
    suspicious_accounts -> from scoring_engine (step 1)

    returns:
    suspicious_accounts with ring_id
    fraud_rings list
    """

    ring_counter = 1
    fraud_rings = []

    # map account -> ring_id
    account_to_ring = {}

    # helper function to generate ring id
    def get_ring_id():
        nonlocal ring_counter
        rid = f"RING_{ring_counter:03}"
        ring_counter += 1
        return rid

    # =====================================
    # 1. HANDLE CYCLES
    # =====================================
    for cycle in detections.get("cycles", []):
        ring_id = get_ring_id()
        members = cycle["members"]

        # assign ring to each account
        for acc in members:
            account_to_ring[acc] = ring_id

        fraud_rings.append({
            "ring_id": ring_id,
            "member_accounts": members,
            "pattern_type": "cycle",
            "risk_score": 95.0
        })

    # =====================================
    # 2. FAN-IN
    # =====================================
    for cluster in detections.get("fan_in", []):
        ring_id = get_ring_id()
        aggregator = cluster.get("aggregator", cluster.get("account"))
        senders = cluster.get("senders", cluster.get("members", []))
        members = [aggregator] + senders if aggregator else senders

        for acc in members:
            account_to_ring[acc] = ring_id

        fraud_rings.append({
            "ring_id": ring_id,
            "member_accounts": members,
            "pattern_type": "fan_in",
            "risk_score": 85.0
        })

    # =====================================
    # 3. FAN-OUT
    # =====================================
    for cluster in detections.get("fan_out", []):
        ring_id = get_ring_id()
        distributor = cluster.get("distributor", cluster.get("account"))
        receivers = cluster.get("receivers", cluster.get("members", []))
        members = [distributor] + receivers if distributor else receivers

        for acc in members:
            account_to_ring[acc] = ring_id

        fraud_rings.append({
            "ring_id": ring_id,
            "member_accounts": members,
            "pattern_type": "fan_out",
            "risk_score": 85.0
        })

    # =====================================
    # 4. SHELL CHAINS
    # =====================================
    for chain in detections.get("shell_chains", []):
        ring_id = get_ring_id()
        members = chain.get("path", chain.get("members", []))

        for acc in members:
            account_to_ring[acc] = ring_id

        fraud_rings.append({
            "ring_id": ring_id,
            "member_accounts": members,
            "pattern_type": "shell_chain",
            "risk_score": 75.0
        })

    # =====================================
    # 5. ADD ring_id TO suspicious_accounts
    # =====================================
    for acc in suspicious_accounts:
        account_id = acc["account_id"]
        acc["ring_id"] = account_to_ring.get(account_id, "RING_UNKNOWN")

    return suspicious_accounts, fraud_rings
