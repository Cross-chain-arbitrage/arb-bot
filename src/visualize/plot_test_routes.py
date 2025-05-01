import networkx as nx
import matplotlib.pyplot as plt
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Constants
DATA_FILE_PATH = 'data/routes/'
MIN_LIMIT = 1e6

def load_data(file_path):
    try:
        with open(file_path) as f:
            return json.load(f)
    except FileNotFoundError:
        logging.error(f"File not found: {file_path}")
        return None
    except json.JSONDecodeError:
        logging.error(f"Error decoding JSON from file: {file_path}")
        return None

def extract_nodes_and_links(data, token, chain, direction):
    nodes = set()
    links = []
    node_map = {}

    for route in data.get(token, []):
        decimals = route.get("decimals", 0)
        source, target = route.get("route", "").split(" -> ")

        if direction == "from" and source != chain:
            continue
        if direction == "to" and target != chain:
            continue

        if source not in node_map:
            node_map[source] = source
        if target not in node_map:
            node_map[target] = target

        nodes.add(node_map[source])
        nodes.add(node_map[target])
        limit = route.get("limit", 0) / 10 ** decimals

        limit_str = format_limit(limit)
        links.append({"source": node_map[source], "target": node_map[target], "limit": limit_str, "route": route.get("route", "")})

    logging.info(f"Nodes: {nodes}")
    logging.info(f"Links: {links}")
    return nodes, links

def format_limit(limit):
    if limit >= 1e6:
        return f"{limit / 1e6:.1f}m"
    elif limit >= 1000:
        return f"{limit / 1000:.1f}k"
    else:
        return f"{limit:.1f}"

def create_graph(nodes, links):
    G = nx.DiGraph()
    G.add_nodes_from(nodes)
    for link in links:
        G.add_edge(link["source"], link["target"], limit=link["limit"], route=link["route"])
    return G

def draw_graph(G):
    # Set up the layout
    pos = nx.spring_layout(G)

    # Draw nodes
    nx.draw_networkx_nodes(G, pos, node_size=700)

    # Draw edges with arrows
    arrow_size = 20
    nx.draw_networkx_edges(G, pos, 
                           arrowstyle='->',
                           arrowsize=arrow_size, 
                           edge_color='r', 
                           width=2)

    # Add node labels
    nx.draw_networkx_labels(G, pos, 
                            font_size=20, 
                            font_family='sans-serif')

    # Add edge labels (limits)
    edge_labels = {(u, v): f"{d['limit']}" for u, v, d in G.edges(data=True)}
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels)

    # Set title and display
    plt.title("Stablecoin Routes Visualization")
    plt.show()

def main():
    token = input("Enter the token to filter by: ")

    # print(token)
    
    data = load_data(DATA_FILE_PATH + token + ".json")
    # print(data)
    if data is None:
        return
    
    chain = input("Enter the chain to filter by: ")
    direction = input("Enter the direction (from/to): ")
    nodes, links = extract_nodes_and_links(data, token, chain, direction)
    G = create_graph(nodes, links)
    draw_graph(G)

if __name__ == "__main__":
    main()