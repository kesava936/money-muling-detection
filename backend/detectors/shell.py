def detect_shell_chains(G, cycle_results, max_depth=5):
    """
    Detect shell chains:
    - Path length >= 4 nodes (3+ hops)
    - Intermediate nodes must have total_degree <= 3
    - Intermediate nodes must NOT belong to any detected cycle
    """

    shell_results = []
    visited_chains = set()

    # Collect all cycle members
    cycle_nodes = set()
    for cycle in cycle_results:
        for node in cycle["members"]:
            cycle_nodes.add(node)

    def dfs(current, path):
        if len(path) > max_depth:
            return

        for neighbor in G.successors(current):
            if neighbor in path:
                continue

            new_path = path + [neighbor]

            if len(new_path) >= 4:
                intermediates = new_path[1:-1]
                valid_chain = True

                for node in intermediates:
                    total_degree = G.degree(node)

                    if total_degree > 3 or node in cycle_nodes:
                        valid_chain = False
                        break

                if valid_chain:
                    chain_tuple = tuple(new_path)
                    if chain_tuple not in visited_chains:
                        visited_chains.add(chain_tuple)
                        shell_results.append({
                            "members": new_path,
                            "pattern": "shell_chain"
                        })

            dfs(neighbor, new_path)

    for node in G.nodes():
        dfs(node, [node])

    return shell_results