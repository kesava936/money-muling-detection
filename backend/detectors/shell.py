def detect_shell_chains(G, cycle_results, max_depth=5, max_chains=200):
    """
    Detect shell-chain layering patterns: sequential hops through
    low-degree intermediate accounts that are NOT part of cycles.

    Optimised: caps total results, uses global visited set to prune
    overlapping sub-paths, and limits DFS fan-out.
    """
    shell_results = []
    visited_chains = set()

    # All cycle nodes to avoid
    cycle_nodes = set(
        node for cycle in cycle_results for node in cycle["members"]
    )

    # Only consider nodes with degree <= 3 as intermediates
    candidate_nodes = [
        n for n in G.nodes
        if G.degree(n) <= 3 and n not in cycle_nodes
    ]

    # Global visited set to avoid re-exploring already-covered nodes
    globally_visited = set()

    def dfs(current, path):
        if len(shell_results) >= max_chains:
            return
        if len(path) > max_depth:
            return

        for neighbor in G.successors(current):
            if len(shell_results) >= max_chains:
                return
            if neighbor in path:
                continue
            if neighbor in cycle_nodes or G.degree(neighbor) > 3:
                continue

            new_path = path + [neighbor]

            if len(new_path) >= 4:
                chain_key = tuple(sorted(new_path))
                if chain_key not in visited_chains:
                    visited_chains.add(chain_key)
                    shell_results.append({
                        "members": list(new_path),
                        "pattern": "shell_chain"
                    })

            # Only recurse if not already explored deeply from this node
            if neighbor not in globally_visited:
                dfs(neighbor, new_path)

        globally_visited.add(current)

    for node in candidate_nodes:
        if len(shell_results) >= max_chains:
            break
        if node not in globally_visited:
            dfs(node, [node])

    return shell_results
