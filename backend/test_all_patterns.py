"""
Comprehensive test suite for the Money Muling Detection pipeline.
Tests each fraud pattern type with known inputs and validates:
  - Correct pattern detection
  - Correct graph node/edge counts
  - Correct suspicious account flagging
  - Correct fraud ring generation
"""

import json
import time
import sys
import os

# Ensure we can import from the backend directory
sys.path.insert(0, os.path.dirname(__file__))

from main import run_pipeline

PASS = "✅ PASS"
FAIL = "❌ FAIL"
WARN = "⚠️  WARN"

results = []


def run_test(name, csv_path, checks):
    """Run a single test case and validate against expected checks."""
    print(f"\n{'='*70}")
    print(f"TEST: {name}")
    print(f"File: {csv_path}")
    print(f"{'='*70}")

    try:
        start = time.time()
        G, detections, final_json = run_pipeline(csv_path, start)
    except Exception as e:
        print(f"{FAIL} Pipeline crashed: {e}")
        results.append({"name": name, "status": "FAIL", "reason": str(e)})
        return

    graph = final_json.get("graph", {})
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    rings = final_json.get("fraud_rings", [])
    suspicious = final_json.get("suspicious_accounts", [])
    summary = final_json.get("summary", {})

    print(f"\n  Graph:  {len(nodes)} nodes, {len(edges)} edges")
    print(f"  Rings:  {len(rings)}")
    print(f"  Suspicious: {len(suspicious)} accounts")
    print(f"  Time:   {summary.get('processing_time_seconds', '?')}s")

    # Show detected patterns
    ring_patterns = [r["pattern_type"] for r in rings]
    pattern_counts = {}
    for p in ring_patterns:
        pattern_counts[p] = pattern_counts.get(p, 0) + 1
    print(f"  Pattern breakdown: {pattern_counts}")

    # Show rings detail
    for ring in rings:
        print(f"    {ring['ring_id']}: {ring['pattern_type']} "
              f"→ {ring['member_accounts']} (risk={ring['risk_score']})")

    # Show suspicious accounts
    for acc in suspicious[:5]:
        print(f"    {acc['account_id']}: score={acc['suspicion_score']}, "
              f"patterns={acc['detected_patterns']}, ring={acc['ring_id']}")
    if len(suspicious) > 5:
        print(f"    ... and {len(suspicious) - 5} more")

    # Run checks
    print(f"\n  --- Validation ---")
    all_passed = True

    for check_name, check_fn in checks.items():
        try:
            passed, detail = check_fn(
                nodes=nodes, edges=edges, rings=rings,
                suspicious=suspicious, summary=summary,
                detections=detections, graph_obj=G
            )
            status = PASS if passed else FAIL
            if not passed:
                all_passed = False
            print(f"  {status} {check_name}: {detail}")
        except Exception as e:
            print(f"  {FAIL} {check_name}: Exception → {e}")
            all_passed = False

    results.append({
        "name": name,
        "status": "PASS" if all_passed else "FAIL",
        "nodes": len(nodes),
        "edges": len(edges),
        "rings": len(rings),
        "suspicious": len(suspicious),
    })


# =====================================================================
# TEST 1: Simple 3-node Cycle
# =====================================================================
run_test(
    "3-Node Cycle (A→B→C→A)",
    "test_data/test_cycle_3.csv",
    {
        "Exactly 3 nodes": lambda nodes, **kw: (
            len(nodes) == 3,
            f"Got {len(nodes)} nodes"
        ),
        "Exactly 3 edges": lambda edges, **kw: (
            len(edges) == 3,
            f"Got {len(edges)} edges"
        ),
        "Detects 1 cycle ring": lambda rings, **kw: (
            sum(1 for r in rings if r["pattern_type"] == "cycle") >= 1,
            f"Cycle rings: {sum(1 for r in rings if r['pattern_type'] == 'cycle')}"
        ),
        "Cycle members are A, B, C": lambda rings, **kw: (
            any(
                set(r["member_accounts"]) == {"A", "B", "C"}
                for r in rings if r["pattern_type"] == "cycle"
            ),
            f"Ring members: {[r['member_accounts'] for r in rings if r['pattern_type'] == 'cycle']}"
        ),
        "All 3 accounts flagged suspicious": lambda suspicious, **kw: (
            len(suspicious) >= 3,
            f"Suspicious count: {len(suspicious)}"
        ),
        "Graph has ring edges": lambda edges, **kw: (
            any(e.get("is_ring_edge") for e in edges),
            f"Ring edges: {sum(1 for e in edges if e.get('is_ring_edge'))}"
        ),
        "Nodes have suspicion scores > 0": lambda nodes, **kw: (
            all(n["suspicion_score"] > 0 for n in nodes if n["is_suspicious"]),
            f"Scores: {[n['suspicion_score'] for n in nodes]}"
        ),
    },
)

# =====================================================================
# TEST 2: 2-Node Reciprocal Cycle
# =====================================================================
run_test(
    "2-Node Reciprocal Cycle (A↔B)",
    "test_data/test_cycle_2.csv",
    {
        "Exactly 2 nodes": lambda nodes, **kw: (
            len(nodes) == 2,
            f"Got {len(nodes)} nodes"
        ),
        "Exactly 2 edges (A→B and B→A)": lambda edges, **kw: (
            len(edges) == 2,
            f"Got {len(edges)} edges"
        ),
        "Detects cycle pattern": lambda rings, **kw: (
            any(r["pattern_type"] == "cycle" for r in rings),
            f"Patterns: {[r['pattern_type'] for r in rings]}"
        ),
        "Both accounts in cycle": lambda rings, **kw: (
            any(
                set(r["member_accounts"]) == {"A", "B"}
                for r in rings if r["pattern_type"] == "cycle"
            ),
            f"Ring members: {[r['member_accounts'] for r in rings if r['pattern_type'] == 'cycle']}"
        ),
    },
)

# =====================================================================
# TEST 3: 5-Node Cycle
# =====================================================================
run_test(
    "5-Node Cycle (A→B→C→D→E→A)",
    "test_data/test_cycle_5.csv",
    {
        "Exactly 5 nodes": lambda nodes, **kw: (
            len(nodes) == 5,
            f"Got {len(nodes)} nodes"
        ),
        "Exactly 5 edges": lambda edges, **kw: (
            len(edges) == 5,
            f"Got {len(edges)} edges"
        ),
        "Detects cycle pattern": lambda rings, **kw: (
            any(r["pattern_type"] == "cycle" for r in rings),
            f"Patterns: {[r['pattern_type'] for r in rings]}"
        ),
        "All 5 members in a cycle ring": lambda rings, **kw: (
            any(
                set(r["member_accounts"]) == {"A", "B", "C", "D", "E"}
                for r in rings if r["pattern_type"] == "cycle"
            ),
            f"Ring members: {[r['member_accounts'] for r in rings if r['pattern_type'] == 'cycle']}"
        ),
        "5 suspicious accounts": lambda suspicious, **kw: (
            len(suspicious) >= 5,
            f"Suspicious: {len(suspicious)}"
        ),
    },
)

# =====================================================================
# TEST 4: Fan-In
# =====================================================================
run_test(
    "Fan-In (5 senders → BOSS)",
    "test_data/test_fan_in.csv",
    {
        "6 nodes (5 senders + BOSS)": lambda nodes, **kw: (
            len(nodes) == 6,
            f"Got {len(nodes)} nodes"
        ),
        "5 edges": lambda edges, **kw: (
            len(edges) == 5,
            f"Got {len(edges)} edges"
        ),
        "Detects fan_in pattern": lambda rings, **kw: (
            any(r["pattern_type"] == "fan_in" for r in rings),
            f"Patterns: {[r['pattern_type'] for r in rings]}"
        ),
        "BOSS is in a fan_in ring": lambda rings, **kw: (
            any(
                "BOSS" in r["member_accounts"]
                for r in rings if r["pattern_type"] == "fan_in"
            ),
            f"Fan-in rings: {[r['member_accounts'] for r in rings if r['pattern_type'] == 'fan_in']}"
        ),
        "BOSS has high in-degree": lambda nodes, **kw: (
            any(n["id"] == "BOSS" and n["in_degree"] == 5 for n in nodes),
            f"BOSS in_degree: {next((n['in_degree'] for n in nodes if n['id'] == 'BOSS'), '?')}"
        ),
    },
)

# =====================================================================
# TEST 5: Fan-Out
# =====================================================================
run_test(
    "Fan-Out (DIST → 5 receivers)",
    "test_data/test_fan_out.csv",
    {
        "6 nodes (DIST + 5 receivers)": lambda nodes, **kw: (
            len(nodes) == 6,
            f"Got {len(nodes)} nodes"
        ),
        "5 edges": lambda edges, **kw: (
            len(edges) == 5,
            f"Got {len(edges)} edges"
        ),
        "Detects fan_out pattern": lambda rings, **kw: (
            any(r["pattern_type"] == "fan_out" for r in rings),
            f"Patterns: {[r['pattern_type'] for r in rings]}"
        ),
        "DIST is in a fan_out ring": lambda rings, **kw: (
            any(
                "DIST" in r["member_accounts"]
                for r in rings if r["pattern_type"] == "fan_out"
            ),
            f"Fan-out rings: {[r['member_accounts'] for r in rings if r['pattern_type'] == 'fan_out']}"
        ),
        "DIST has high out-degree": lambda nodes, **kw: (
            any(n["id"] == "DIST" and n["out_degree"] == 5 for n in nodes),
            f"DIST out_degree: {next((n['out_degree'] for n in nodes if n['id'] == 'DIST'), '?')}"
        ),
    },
)

# =====================================================================
# TEST 6: Shell Chain
# =====================================================================
run_test(
    "Shell Chain (X1→X2→X3→X4→X5)",
    "test_data/test_shell_chain.csv",
    {
        "5 nodes": lambda nodes, **kw: (
            len(nodes) == 5,
            f"Got {len(nodes)} nodes"
        ),
        "4 edges": lambda edges, **kw: (
            len(edges) == 4,
            f"Got {len(edges)} edges"
        ),
        "Detects shell_chain pattern": lambda rings, **kw: (
            any(r["pattern_type"] == "shell_chain" for r in rings),
            f"Patterns: {[r['pattern_type'] for r in rings]}"
        ),
        "Shell chain has >=4 members": lambda rings, **kw: (
            any(
                len(r["member_accounts"]) >= 4
                for r in rings if r["pattern_type"] == "shell_chain"
            ),
            f"Shell chains: {[(r['member_accounts']) for r in rings if r['pattern_type'] == 'shell_chain']}"
        ),
    },
)

# =====================================================================
# TEST 7: Clean Data (No Fraud)
# =====================================================================
run_test(
    "Clean Linear Flow (shell chain detection expected)",
    "test_data/test_clean.csv",
    {
        "6 nodes": lambda nodes, **kw: (
            len(nodes) == 6,
            f"Got {len(nodes)} nodes"
        ),
        "5 edges": lambda edges, **kw: (
            len(edges) == 5,
            f"Got {len(edges)} edges"
        ),
        "No cycle rings": lambda rings, **kw: (
            not any(r["pattern_type"] == "cycle" for r in rings),
            f"Cycle rings: {sum(1 for r in rings if r['pattern_type'] == 'cycle')}"
        ),
        "No fan_in rings": lambda rings, **kw: (
            not any(r["pattern_type"] == "fan_in" for r in rings),
            f"Fan-in rings: {sum(1 for r in rings if r['pattern_type'] == 'fan_in')}"
        ),
        "No fan_out rings": lambda rings, **kw: (
            not any(r["pattern_type"] == "fan_out" for r in rings),
            f"Fan-out rings: {sum(1 for r in rings if r['pattern_type'] == 'fan_out')}"
        ),
        "Shell chain detected (linear chain IS suspicious)": lambda rings, **kw: (
            any(r["pattern_type"] == "shell_chain" for r in rings),
            f"Shell chains: {sum(1 for r in rings if r['pattern_type'] == 'shell_chain')}"
        ),
    },
)

# =====================================================================
# TEST 8: Mixed Patterns
# =====================================================================
run_test(
    "Mixed (Cycle + Fan-In + Fan-Out + Shell Chain + Legit)",
    "test_data/test_mixed.csv",
    {
        "All 25 unique accounts as nodes": lambda nodes, **kw: (
            len(nodes) == 25,
            f"Got {len(nodes)} nodes"
        ),
        "19 edges": lambda edges, **kw: (
            len(edges) == 19,
            f"Got {len(edges)} edges"
        ),
        "Detects cycle": lambda rings, **kw: (
            any(r["pattern_type"] == "cycle" for r in rings),
            f"Cycle rings: {[r['member_accounts'] for r in rings if r['pattern_type'] == 'cycle']}"
        ),
        "Detects fan_in": lambda rings, **kw: (
            any(r["pattern_type"] == "fan_in" for r in rings),
            f"Fan-in rings: {[r['member_accounts'] for r in rings if r['pattern_type'] == 'fan_in']}"
        ),
        "Detects fan_out": lambda rings, **kw: (
            any(r["pattern_type"] == "fan_out" for r in rings),
            f"Fan-out rings: {[r['member_accounts'] for r in rings if r['pattern_type'] == 'fan_out']}"
        ),
        "Detects shell_chain": lambda rings, **kw: (
            any(r["pattern_type"] == "shell_chain" for r in rings),
            f"Shell chain rings: {[r['member_accounts'] for r in rings if r['pattern_type'] == 'shell_chain']}"
        ),
        "Legit accounts NOT suspicious": lambda suspicious, **kw: (
            not any(
                a["account_id"].startswith("LEGIT_")
                for a in suspicious
            ),
            f"Legit in suspicious: {[a['account_id'] for a in suspicious if a['account_id'].startswith('LEGIT_')]}"
        ),
        "Cycle members (C_A-D) are suspicious": lambda suspicious, **kw: (
            all(
                any(a["account_id"] == c for a in suspicious)
                for c in ["C_A", "C_B", "C_C", "C_D"]
            ),
            f"Cycle accounts found: {[a['account_id'] for a in suspicious if a['account_id'].startswith('C_')]}"
        ),
        "Some edges are ring edges": lambda edges, **kw: (
            sum(1 for e in edges if e.get("is_ring_edge")) > 0,
            f"Ring edges: {sum(1 for e in edges if e.get('is_ring_edge'))} / {len(edges)}"
        ),
        "Graph node metadata complete": lambda nodes, **kw: (
            all(
                all(k in n for k in ["id", "suspicion_score", "in_degree", "out_degree", "total_sent", "total_received"])
                for n in nodes
            ),
            "All required fields present" if all(
                all(k in n for k in ["id", "suspicion_score", "in_degree", "out_degree", "total_sent", "total_received"])
                for n in nodes
            ) else "Missing fields"
        ),
        "Graph edge metadata complete": lambda edges, **kw: (
            all(
                all(k in e for k in ["id", "source", "target", "total_amount", "tx_count", "is_ring_edge"])
                for e in edges
            ),
            "All required fields present" if all(
                all(k in e for k in ["id", "source", "target", "total_amount", "tx_count", "is_ring_edge"])
                for e in edges
            ) else "Missing fields"
        ),
    },
)

# =====================================================================
# TEST 9: Existing transactions.csv (large dataset)
# =====================================================================
run_test(
    "Large Dataset (transactions.csv — 1000 rows)",
    "transactions.csv",
    {
        "Many nodes (>100)": lambda nodes, **kw: (
            len(nodes) > 100,
            f"Got {len(nodes)} nodes"
        ),
        "Many edges (>500)": lambda edges, **kw: (
            len(edges) > 500,
            f"Got {len(edges)} edges"
        ),
        "Multiple fraud rings detected": lambda rings, **kw: (
            len(rings) > 5,
            f"Got {len(rings)} rings"
        ),
        "Multiple suspicious accounts": lambda suspicious, **kw: (
            len(suspicious) > 10,
            f"Got {len(suspicious)} suspicious"
        ),
        "Processing under 2 seconds": lambda summary, **kw: (
            summary.get("processing_time_seconds", 99) < 2,
            f"Took {summary.get('processing_time_seconds', '?')}s"
        ),
        "Summary totals match": lambda nodes, edges, summary, **kw: (
            summary.get("total_graph_nodes") == len(nodes) and
            summary.get("total_graph_edges") == len(edges),
            f"Summary nodes={summary.get('total_graph_nodes')} vs actual={len(nodes)}, "
            f"Summary edges={summary.get('total_graph_edges')} vs actual={len(edges)}"
        ),
    },
)


# =====================================================================
# FINAL SUMMARY
# =====================================================================
print("\n")
print("=" * 70)
print("                     FINAL TEST SUMMARY")
print("=" * 70)

passed = sum(1 for r in results if r["status"] == "PASS")
failed = sum(1 for r in results if r["status"] == "FAIL")

for r in results:
    icon = PASS if r["status"] == "PASS" else FAIL
    extra = ""
    if "nodes" in r:
        extra = f" ({r['nodes']}n, {r['edges']}e, {r['rings']}r, {r['suspicious']}s)"
    print(f"  {icon} {r['name']}{extra}")

print(f"\n  Total: {passed} passed, {failed} failed out of {len(results)} tests")
print("=" * 70)

if failed > 0:
    sys.exit(1)
