import networkx as nx


def normalize_cycle(cycle):
    # Rotate so smallest node comes first (canonical form)
    min_node = min(cycle)
    idx = cycle.index(min_node)
    return cycle[idx:] + cycle[:idx]


def detect_cycles(G, max_cycles=200):
    """
    Detect simple cycles of length 3–5.

    Optimizations:
    - Only searches within Strongly Connected Components (remote improvement)
    - Early exit after max_cycles to prevent hanging on dense graphs (our fix)
    """
    unique_cycles = set()
    results = []

    # Only check nodes that can possibly be in a cycle (SCC optimization)
    for scc in nx.strongly_connected_components(G):
        if len(scc) < 3:
            continue

        subgraph = G.subgraph(scc).copy()

        # consume generator lazily — break early once cap is hit
        for cycle in nx.simple_cycles(subgraph):
            length = len(cycle)

            if 3 <= length <= 5:
                normalized = normalize_cycle(cycle)
                cycle_tuple = tuple(normalized)

                if cycle_tuple not in unique_cycles:
                    unique_cycles.add(cycle_tuple)
                    results.append({
                        "members": list(normalized),
                        "pattern": f"cycle_length_{length}"
                    })

                    # early exit cap
                    if len(results) >= max_cycles:
                        return results

    return results
