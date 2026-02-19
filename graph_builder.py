import networkx as nx


def build_graph(df):
    G = nx.DiGraph()

    for _, row in df.iterrows():
        sender = row["sender_id"]
        receiver = row["receiver_id"]

        G.add_edge(
            sender,
            receiver,
            amount=row["amount"],
            timestamp=row["timestamp"]
        )

    return G