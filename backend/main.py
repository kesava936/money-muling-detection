from parser import parse_csv
from graph_builder import build_graph, extract_graph_data
from detectors.cycle import detect_cycles
from detectors.smurf import detect_smurfing
from detectors.shell import detect_shell_chains
from scoring_engine import calculate_suspicion_scores
from ring_builder import build_rings_and_assign_ids
from final_json_builder import build_final_json


def detect_patterns(df, G):
    raw_cycles = detect_cycles(G)
    smurf = detect_smurfing(df)
    raw_shell = detect_shell_chains(G, raw_cycles)

    cycles = [
        {"length": len(cycle["members"]), "members": cycle["members"]}
        for cycle in raw_cycles
    ]

    fan_in = [
        {"aggregator": cluster["account"], "senders": cluster["members"]}
        for cluster in smurf["fan_in"]
    ]

    fan_out = [
        {"distributor": cluster["account"], "receivers": cluster["members"]}
        for cluster in smurf["fan_out"]
    ]

    shell_chains = [{"path": chain["members"]} for chain in raw_shell]

    return {
        "cycles": cycles,
        "fan_in": fan_in,
        "fan_out": fan_out,
        "shell_chains": shell_chains
    }


def count_transactions(df):
    counts = {}

    for row in df.itertuples(index=False):
        sender = str(row.sender_id)
        receiver = str(row.receiver_id)
        counts[sender] = counts.get(sender, 0) + 1
        counts[receiver] = counts.get(receiver, 0) + 1

    return counts


def run_pipeline(file_path, start_time):
    df = parse_csv(file_path)
    G = build_graph(df)
    detections = detect_patterns(df, G)
    transaction_counts = count_transactions(df)

    suspicious_accounts = calculate_suspicion_scores(
        detections,
        transaction_counts
    )
    suspicious_accounts, fraud_rings = build_rings_and_assign_ids(
        detections,
        suspicious_accounts
    )

    # Build explicit graph data for frontend rendering
    graph_data = extract_graph_data(G, suspicious_accounts, fraud_rings)

    final_json = build_final_json(
        suspicious_accounts,
        fraud_rings,
        graph_data,
        total_accounts=len(transaction_counts),
        start_time=start_time
    )

    return G, detections, final_json


if __name__ == "__main__":
    import json
    import time

    file_path = "transactions.csv"

    try:
        start = time.time()
        G, results, final_json = run_pipeline(file_path, start)
        print("Number of nodes:", G.number_of_nodes())
        print("Number of edges:", G.number_of_edges())

        print("\n=== Detection Results ===")
        print("Cycles:", len(results["cycles"]))
        print("Fan-In:", len(results["fan_in"]))
        print("Fan-Out:", len(results["fan_out"]))
        print("Shell Chains:", len(results["shell_chains"]))

        print("\n=== Graph Data ===")
        print("Graph nodes:", len(final_json["graph"]["nodes"]))
        print("Graph edges:", len(final_json["graph"]["edges"]))

        print("\n=== Summary ===")
        print(json.dumps(final_json["summary"], indent=2))

    except Exception as e:
        import traceback
        print("Error occurred:", str(e))
        traceback.print_exc()
