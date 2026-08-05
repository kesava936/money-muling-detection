import networkx as nx
from collections import defaultdict


def build_graph(df):
    G = nx.DiGraph()

    # Aggregate edge data: total amount, transaction count, timestamps
    edge_data = defaultdict(lambda: {"amount": 0.0, "count": 0, "timestamps": []})

    for _, row in df.iterrows():
        sender = str(row["sender_id"])
        receiver = str(row["receiver_id"])
        amount = float(row["amount"])
        timestamp = row["timestamp"]

        key = (sender, receiver)
        edge_data[key]["amount"] += amount
        edge_data[key]["count"] += 1
        edge_data[key]["timestamps"].append(str(timestamp))

    for (sender, receiver), meta in edge_data.items():
        G.add_edge(
            sender,
            receiver,
            total_amount=round(meta["amount"], 2),
            tx_count=meta["count"],
            timestamps=meta["timestamps"],
        )

    return G


def extract_graph_data(G, suspicious_accounts, fraud_rings):
    """
    Build explicit nodes[] and edges[] lists for the frontend
    Cytoscape graph, including all account metadata.
    """
    # Pre-index suspicious account data
    acc_lookup = {}
    for acc in suspicious_accounts:
        acc_lookup[acc["account_id"]] = acc

    # Pre-index ring memberships
    account_ring_map = {}
    for ring in fraud_rings:
        for member in ring["member_accounts"]:
            if member not in account_ring_map:
                account_ring_map[member] = []
            account_ring_map[member].append(ring["ring_id"])

    # Build ring-edge lookup: which edges belong to a ring
    ring_edges = set()
    for ring in fraud_rings:
        members = ring["member_accounts"]
        pattern = ring["pattern_type"]
        if pattern == "cycle":
            for i in range(len(members)):
                ring_edges.add((members[i], members[(i + 1) % len(members)]))
        elif pattern == "fan_in" and len(members) >= 2:
            agg = members[0]
            for src in members[1:]:
                ring_edges.add((src, agg))
        elif pattern == "fan_out" and len(members) >= 2:
            dist = members[0]
            for tgt in members[1:]:
                ring_edges.add((dist, tgt))
        elif pattern == "shell_chain":
            for i in range(len(members) - 1):
                ring_edges.add((members[i], members[i + 1]))

    # ── Build nodes ──
    nodes = []
    for node_id in G.nodes():
        acc_info = acc_lookup.get(node_id, {})
        total_sent = sum(
            G[node_id][nbr].get("total_amount", 0) for nbr in G.successors(node_id)
        )
        total_received = sum(
            G[nbr][node_id].get("total_amount", 0) for nbr in G.predecessors(node_id)
        )
        nodes.append({
            "id": str(node_id),
            "suspicion_score": acc_info.get("suspicion_score", 0),
            "ring_ids": account_ring_map.get(node_id, []),
            "detected_patterns": acc_info.get("detected_patterns", []),
            "in_degree": G.in_degree(node_id),
            "out_degree": G.out_degree(node_id),
            "total_sent": round(total_sent, 2),
            "total_received": round(total_received, 2),
            "tx_count": G.in_degree(node_id) + G.out_degree(node_id),
            "is_suspicious": node_id in acc_lookup,
        })

    # ── Build edges ──
    edges = []
    for u, v, data in G.edges(data=True):
        edges.append({
            "id": f"e-{u}-{v}",
            "source": str(u),
            "target": str(v),
            "total_amount": data.get("total_amount", 0),
            "tx_count": data.get("tx_count", 1),
            "is_ring_edge": (u, v) in ring_edges,
        })

    return {"nodes": nodes, "edges": edges}