from parser import parse_csv
from graph_builder import build_graph
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

    for _, row in df.iterrows():
        sender = row["sender_id"]
        receiver = row["receiver_id"]
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

    final_json = build_final_json(
        suspicious_accounts,
        fraud_rings,
        total_accounts=len(transaction_counts),
        start_time=start_time
    )

    return G, detections, final_json


if __name__ == "__main__":
    import json
    import time

    file_path = "sample.csv"

    try:
        start = time.time()
        G, results, final_json = run_pipeline(file_path, start)
        print("Number of nodes:", G.number_of_nodes())
        print("Number of edges:", G.number_of_edges())

        print("\n=== Detection Results ===")
        print("Cycles:", results["cycles"])
        print("Fan-In:", results["fan_in"])
        print("Fan-Out:", results["fan_out"])
        print("Shell Chains:", results["shell_chains"])
        print("\n=== Final Output ===")
        print(json.dumps(final_json, indent=2))

    except Exception as e:
        print("Error occurred:", str(e))
