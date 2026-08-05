import networkx as nx


def normalize_cycle(cycle):
    min_node = min(cycle)
    min_index = cycle.index(min_node)
    return cycle[min_index:] + cycle[:min_index]


def detect_cycles(G):
    unique_cycles = set()
    results = []

    # ── 1. Reciprocal 2-node cycles (A→B and B→A) ──
    seen_pairs = set()
    for u, v in G.edges():
        if G.has_edge(v, u):
            pair = tuple(sorted([u, v]))
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                results.append({
                    "members": list(pair),
                    "pattern": "cycle_length_2"
                })

    # ── 2. Strongly-connected-component cycles (3–6 nodes) ──
    for scc in nx.strongly_connected_components(G):
        if len(scc) < 3:
            continue
        subgraph = G.subgraph(scc).copy()
        for cycle in nx.simple_cycles(subgraph, length_bound=5):
            if 3 <= len(cycle) <= 5:
                normalized = tuple(normalize_cycle(cycle))
                if normalized not in unique_cycles:
                    unique_cycles.add(normalized)
                    results.append({
                        "members": list(normalized),
                        "pattern": f"cycle_length_{len(cycle)}"
                    })
                    if len(results) >= 100:
                        break
        if len(results) >= 100:
            break

    return results
