def detect_shell_chains(G, cycle_results, max_depth=5):
    """
    Detect shell chains:
    - Path length >= 4 nodes (3+ hops)
    - Intermediate nodes must have total_degree <= 3
    - Intermediate nodes must NOT belong to any detected cycle
    """
    shell_results = []
    visited_chains = set()

    # Collect all cycle members to exclude
    cycle_nodes = set(node for cycle in cycle_results for node in cycle["members"])

    # Only start DFS from low-degree non-cycle nodes (performance optimization)
    candidate_nodes = [
        n for n in G.nodes
        if G.degree(n) <= 3 and n not in cycle_nodes
    ]

    def dfs(current, path):
        if len(path) > max_depth:
            return

        for neighbor in G.successors(current):
            if neighbor in path:
                continue

            # skip neighbors that are in cycles or high-degree
            if neighbor in cycle_nodes or G.degree(neighbor) > 3:
                continue

            new_path = path + [neighbor]

            if len(new_path) >= 4:
                chain_tuple = tuple(new_path)
                if chain_tuple not in visited_chains:
                    visited_chains.add(chain_tuple)
                    shell_results.append({
                        "members": new_path,
                        "pattern": "shell_chain"
                    })

            dfs(neighbor, new_path)

    for node in candidate_nodes:
        dfs(node, [node])

    return shell_results
