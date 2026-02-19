import networkx as nx


def normalize_cycle(cycle):
    # Rotate so smallest node comes first
    min_node = min(cycle)
    min_index = cycle.index(min_node)
    normalized = cycle[min_index:] + cycle[:min_index]
    return normalized


def detect_cycles(G):
    unique_cycles = set()
    results = []

    all_cycles = list(nx.simple_cycles(G))

    for cycle in all_cycles:
        length = len(cycle)

        if 3 <= length <= 5:
            normalized = normalize_cycle(cycle)
            cycle_tuple = tuple(normalized)

            if cycle_tuple not in unique_cycles:
                unique_cycles.add(cycle_tuple)

                results.append({
                    "members": normalized,
                    "pattern": f"cycle_length_{length}"
                })

    return results