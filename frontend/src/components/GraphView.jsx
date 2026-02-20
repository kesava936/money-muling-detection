import CytoscapeComponent from "react-cytoscapejs";
import { useEffect, useState, useRef } from "react";

// ─── Color per pattern ────────────────────────────────────────
const PATTERN_COLORS = {
  cycle: "#ef4444",
  fan_in: "#f97316",
  fan_out: "#eab308",
  shell_chain: "#a855f7",
};

// ─── Pick a fast layout based on node count ───────────────────
function chooseLayout(nodeCount) {
  if (nodeCount <= 30) {
    // cose is nice for small graphs
    return {
      name: "cose",
      animate: false,
      fit: true,
      padding: 60,
      nodeRepulsion: 6000,
      idealEdgeLength: 120,
      gravity: 0.3,
      numIter: 300,         // capped iterations so it doesn't hang
    };
  }
  if (nodeCount <= 80) {
    // breadthfirst is O(n) — instant even for 80 nodes
    return {
      name: "breadthfirst",
      animate: false,
      fit: true,
      padding: 50,
      directed: true,
      spacingFactor: 1.4,
    };
  }
  // circle is O(n), always instant, works for 100s of nodes
  return {
    name: "circle",
    animate: false,
    fit: true,
    padding: 50,
    spacingFactor: 1.2,
  };
}

// ─── Build elements from API response ─────────────────────────
function buildElements(data) {
  const nodeSet = new Set();
  const edgeSet = new Set();
  const elements = [];

  data.fraud_rings.forEach((ring) => {
    const color = PATTERN_COLORS[ring.pattern_type] || "#3b82f6";
    const pattern = ring.pattern_type;
    const members = ring.member_accounts;

    // ── Nodes ──
    members.forEach((acc) => {
      if (nodeSet.has(acc)) return;
      nodeSet.add(acc);

      const scoreObj = data.suspicious_accounts.find(
        (a) => a.account_id === acc
      );
      elements.push({
        data: {
          id: acc,
          label: acc,
          risk_score: scoreObj?.suspicion_score ?? 10,
          ringId: ring.ring_id,
          pattern,
          color,
        },
      });
    });

    // ── Edges — use correct topology per pattern type ──
    if (members.length < 2) return;

    const addEdge = (src, tgt) => {
      const id = `e-${src}-${tgt}`;
      if (edgeSet.has(id)) return;   // no duplicate edges
      edgeSet.add(id);
      elements.push({ data: { id, source: src, target: tgt, color } });
    };

    if (pattern === "cycle") {
      // close the ring: A→B→C→A
      for (let i = 0; i < members.length; i++) {
        addEdge(members[i], members[(i + 1) % members.length]);
      }
    } else if (pattern === "fan_in") {
      // all → last (aggregator)
      const agg = members[members.length - 1];
      members.slice(0, -1).forEach((src) => addEdge(src, agg));
    } else if (pattern === "fan_out") {
      // first → all (distributor)
      const dist = members[0];
      members.slice(1).forEach((tgt) => addEdge(dist, tgt));
    } else {
      // shell_chain / default: linear chain A→B→C→D
      for (let i = 0; i < members.length - 1; i++) {
        addEdge(members[i], members[i + 1]);
      }
    }
  });

  return elements;
}

// ─── Component ────────────────────────────────────────────────
function GraphView({ data }) {
  const [elements, setElements] = useState([]);
  const [graphKey, setGraphKey] = useState(0);
  const [layout, setLayout] = useState({ name: "circle", animate: false, fit: true });
  const [nodeCount, setNodeCount] = useState(0);
  const [selectedPattern, setSelectedPattern] = useState(null);

  useEffect(() => {
    if (!data?.fraud_rings) return;

    const els = buildElements(data);
    const nodes = els.filter((el) => !el.data.source);

    setElements(els);
    setNodeCount(nodes.length);
    setLayout(chooseLayout(nodes.length));
    setSelectedPattern(null);
    setGraphKey((k) => k + 1);
  }, [data]);

  if (!elements.length) return null;

  // detect which patterns exist in this dataset
  const patterns = [...new Set(
    data.fraud_rings.map((r) => r.pattern_type)
  )];

  // filter by selected pattern
  const visibleElements = selectedPattern
    ? elements.filter(
      (el) => !el.data.pattern || el.data.pattern === selectedPattern
    )
    : elements;

  const stylesheet = [
    {
      selector: "node",
      style: {
        label: "data(label)",
        "background-color": "data(color)",
        color: "#fff",
        "font-family": "JetBrains Mono, monospace",
        "font-size": nodeCount > 60 ? "7px" : nodeCount > 30 ? "9px" : "11px",
        "font-weight": "600",
        "text-valign": "center",
        "text-halign": "center",
        width: nodeCount > 60 ? 28 : nodeCount > 30 ? 38 : 50,
        height: nodeCount > 60 ? 28 : nodeCount > 30 ? 38 : 50,
        "border-width": 2,
        "border-color": "data(color)",
        "border-opacity": 0.7,
      },
    },
    {
      selector: "node[risk_score > 80]",
      style: {
        "border-width": 3,
        "border-opacity": 1,
        "overlay-padding": "4px",
      },
    },
    {
      selector: "node:selected",
      style: { "border-width": 4, "border-color": "#fff" },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "data(color)",
        "line-opacity": 0.55,
        "target-arrow-color": "data(color)",
        "target-arrow-shape": "triangle",
        "target-arrow-opacity": 0.8,
        "curve-style": "bezier",
        "arrow-scale": 0.9,
      },
    },
  ];

  const patternLabels = {
    cycle: "🔄 Cycle",
    fan_in: "🎯 Fan-In",
    fan_out: "📡 Fan-Out",
    shell_chain: "⛓️ Shell Chain",
  };

  return (
    <div className="graph-section">
      <div className="graph-container">

        {/* ── Header ── */}
        <div className="graph-header">
          <div>
            <div className="section-title" style={{ marginBottom: 2 }}>
              <span style={{ fontSize: 20 }}>🕸️</span>
              Transaction Graph
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {nodeCount} nodes · {visibleElements.filter(e => e.data.source).length} edges
              {nodeCount > 30 && (
                <span style={{
                  marginLeft: 10,
                  fontSize: 11,
                  color: "var(--accent-cyan)",
                  background: "rgba(6,182,212,0.1)",
                  border: "1px solid rgba(6,182,212,0.2)",
                  borderRadius: 6,
                  padding: "2px 8px",
                }}>
                  ⚡ Fast layout ({layout.name})
                </span>
              )}
            </div>
          </div>

          {/* Legend / filter */}
          <div className="graph-legend">
            {patterns.map((p) => (
              <div
                key={p}
                className="legend-item"
                onClick={() => setSelectedPattern(selectedPattern === p ? null : p)}
                style={{
                  cursor: "pointer",
                  opacity: selectedPattern && selectedPattern !== p ? 0.35 : 1,
                  transition: "opacity 0.2s",
                  userSelect: "none",
                  padding: "4px 10px",
                  borderRadius: 20,
                  border: `1px solid ${selectedPattern === p ? PATTERN_COLORS[p] : "transparent"}`,
                  background: selectedPattern === p
                    ? `${PATTERN_COLORS[p]}15`
                    : "transparent",
                }}
              >
                <span
                  className="legend-dot"
                  style={{ background: PATTERN_COLORS[p] }}
                />
                {patternLabels[p] || p}
              </div>
            ))}
          </div>
        </div>

        {/* ── Cytoscape Canvas ── */}
        <CytoscapeComponent
          key={graphKey}
          elements={visibleElements}
          style={{
            width: "100%",
            height: nodeCount > 60 ? "650px" : "520px",
            background: "transparent",
          }}
          layout={layout}
          minZoom={0.15}
          maxZoom={3}
          wheelSensitivity={0.3}
          stylesheet={stylesheet}
        />

      </div>
    </div>
  );
}

export default GraphView;
