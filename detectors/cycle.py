import networkx as nx


def normalize_cycle(cycle):
    # Rotate so smallest node comes first (canonical form)
    min_node = min(cycle)
    idx = cycle.index(min_node)
    return cycle[idx:] + cycle[:idx]


def detect_cycles(G, max_cycles=200):
    """
    Detect simple cycles of length 3–5.

    max_cycles: hard cap to prevent hanging on dense graphs.
                Once we've collected enough cycles we stop early.
    """
    unique_cycles = set()
    results = []

    # nx.simple_cycles is a generator — we consume it lazily
    # so we can break early without iterating the whole graph.
    for cycle in nx.simple_cycles(G):
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

                # ← early exit: stop after enough cycles found
                if len(results) >= max_cycles:
                    break

    return results