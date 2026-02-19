from parser import parse_csv
from graph_builder import build_graph
from detectors.cycle import detect_cycles
from detectors.smurf import detect_smurfing
from detectors.shell import detect_shell_chains


def detect_patterns(df, G):
    cycles = detect_cycles(G)
    smurf = detect_smurfing(df)
    shell = detect_shell_chains(G, cycles)

    return {
        "cycles": cycles,
        "fan_in": smurf["fan_in"],
        "fan_out": smurf["fan_out"],
        "shell_chains": shell
    }


if __name__ == "__main__":
    file_path = "sample.csv"

    try:
        df = parse_csv(file_path)
        G = build_graph(df)

        print("Number of nodes:", G.number_of_nodes())
        print("Number of edges:", G.number_of_edges())

        results = detect_patterns(df, G)

        print("\n=== Detection Results ===")
        print("Cycles:", results["cycles"])
        print("Fan-In:", results["fan_in"])
        print("Fan-Out:", results["fan_out"])
        print("Shell Chains:", results["shell_chains"])

    except Exception as e:
        print("Error occurred:", str(e))