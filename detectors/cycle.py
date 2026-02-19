import networkx as nx

def normalize_cycle(cycle):
    min_node = min(cycle)
    min_index = cycle.index(min_node)
    return cycle[min_index:] + cycle[:min_index]

def detect_cycles(G):
    unique_cycles = set()
    results = []

    # Step 1: Only check SCCs
    for scc in nx.strongly_connected_components(G):
        if len(scc) < 3:
            continue
        subgraph = G.subgraph(scc).copy()
        # Step 2: Find simple cycles in SCC
        for cycle in nx.simple_cycles(subgraph):
            if 3 <= len(cycle) <= 5:
                normalized = tuple(normalize_cycle(cycle))
                if normalized not in unique_cycles:
                    unique_cycles.add(normalized)
                    results.append({
                        "members": list(normalized),
                        "pattern": f"cycle_length_{len(cycle)}"
                    })
    return results
