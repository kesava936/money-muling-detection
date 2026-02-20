import CytoscapeComponent from "react-cytoscapejs";
import { useEffect, useState, useMemo } from "react";

// ─── Color per pattern ────────────────────────────────────────
const PATTERN_COLORS = {
  cycle: "#ef4444",
  fan_in: "#f97316",
  fan_out: "#eab308",
  shell_chain: "#a855f7",
  isolated_account: "#3b82f6",
};

// ─── Layout chooser ───────────────────────────────────────────
function chooseLayout(nodeCount) {
  if (nodeCount <= 30) {
    return {
      name: "cose",
      animate: false,
      fit: true,
      padding: 60,
      nodeRepulsion: 6000,
      idealEdgeLength: 120,
      gravity: 0.3,
      numIter: 300,
    };
  }
  if (nodeCount <= 80) {
    return {
      name: "breadthfirst",
      animate: false,
      fit: true,
      padding: 50,
      directed: true,
      spacingFactor: 1.4,
    };
  }
  return {
    name: "circle",
    animate: false,
    fit: true,
    padding: 50,
    spacingFactor: 2.2,
  };
}

// ─── Build elements ───────────────────────────────────────────
function buildElements(data) {
  const nodeSet = new Set();
  const edgeSet = new Set();
  const elements = [];

  data.fraud_rings.forEach((ring) => {
    const color = PATTERN_COLORS[ring.pattern_type] || "#3b82f6";
    const pattern = ring.pattern_type;
    const members = ring.member_accounts;

    // Nodes
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
          pattern,
          color,
        },
      });
    });

    if (members.length < 2) return;

    const addEdge = (src, tgt) => {
      const id = `e-${src}-${tgt}`;
      if (edgeSet.has(id)) return;
      edgeSet.add(id);

      elements.push({
        data: {
          id,
          source: src,
          target: tgt,
          color,
          pattern,
        },
      });
    };

    if (pattern === "cycle") {
      for (let i = 0; i < members.length; i++) {
        addEdge(members[i], members[(i + 1) % members.length]);
      }
    } else if (pattern === "fan_in") {
      const agg = members[0]; // aggregator is first
      members.slice(1).forEach((src) => addEdge(src, agg));
    } else if (pattern === "fan_out") {
      const dist = members[0]; // distributor is first
      members.slice(1).forEach((tgt) => addEdge(dist, tgt));
    } else {
      for (let i = 0; i < members.length - 1; i++) {
        addEdge(members[i], members[i + 1]);
      }
    }
  });

  return elements;
}

// ─── Stylesheet (memoized, no function-based opacity) ─────────
function buildStylesheet(nodeCount) {
  return [
    {
      selector: "node",
      style: {
        label: "data(label)",
        "background-color": "data(color)",
        color: "#fff",
        "font-size": nodeCount > 60 ? "7px" : nodeCount > 30 ? "9px" : "11px",
        width: nodeCount > 60 ? 28 : nodeCount > 30 ? 38 : 50,
        height: nodeCount > 60 ? 28 : nodeCount > 30 ? 38 : 50,
        "border-width": 2,
        "border-color": "data(color)",
        "border-opacity": 0.7,
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "data(color)",
        "line-opacity": 0.6,
        "target-arrow-color": "data(color)",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        "arrow-scale": 0.9,
      },
    },
  ];
}

// ─── Component ────────────────────────────────────────────────
function GraphView({ data }) {
  const [allElements, setAllElements] = useState([]);
  const [selectedPattern, setSelectedPattern] = useState(null);

  useEffect(() => {
    if (!data?.fraud_rings) return;
    setAllElements(buildElements(data));
    setSelectedPattern(null);
  }, [data]);

  // ── Filter elements by selected pattern ──────────────────
  const filteredElements = useMemo(() => {
    if (!selectedPattern) return allElements;
    return allElements.filter(
      (el) => el.data.pattern === selectedPattern
    );
  }, [allElements, selectedPattern]);

  const nodeCount = useMemo(
    () => filteredElements.filter((el) => !el.data.source).length,
    [filteredElements]
  );

  // Layout re-computed when nodeCount or filteredElements changes
  const layout = useMemo(
    () => chooseLayout(nodeCount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredElements]
  );

  const stylesheet = useMemo(
    () => buildStylesheet(nodeCount),
    [nodeCount]
  );

  if (!data?.fraud_rings) return null;

  const patterns = [...new Set(data.fraud_rings.map((r) => r.pattern_type))];

  const patternLabels = {
    cycle: "🔄 Cycle",
    fan_in: "🎯 Fan-In",
    fan_out: "📡 Fan-Out",
    shell_chain: "⛓️ Shell Chain",
    isolated_account: "🔵 Isolated",
  };

  const totalNodes = allElements.filter((el) => !el.data.source).length;
  const totalEdges = allElements.filter((el) => el.data.source).length;

  return (
    <div className="graph-section">
      <div className="graph-container">

        {/* Header */}
        <div className="graph-header">
          <div>
            <div className="section-title">
              🕸️ Transaction Graph
            </div>
            <div style={{ fontSize: 12 }}>
              {selectedPattern
                ? `${nodeCount} nodes · ${filteredElements.filter(e => e.data.source).length} edges (filtered)`
                : `${totalNodes} nodes · ${totalEdges} edges`}
            </div>
          </div>

          {/* Pattern Filter */}
          <div className="graph-legend">
            {patterns.map((p) => (
              <div
                key={p}
                onClick={() =>
                  setSelectedPattern(selectedPattern === p ? null : p)
                }
                style={{
                  cursor: "pointer",
                  opacity: selectedPattern && selectedPattern !== p ? 0.35 : 1,
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: selectedPattern === p ? "rgba(255,255,255,0.1)" : "transparent",
                  transition: "all 0.2s",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: PATTERN_COLORS[p],
                    marginRight: 6,
                  }}
                />
                {patternLabels[p] || p}
              </div>
            ))}
            {selectedPattern && (
              <div
                onClick={() => setSelectedPattern(null)}
                style={{
                  cursor: "pointer",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "#94a3b8",
                  border: "1px solid rgba(148,163,184,0.3)",
                  marginLeft: 4,
                }}
              >
                ✕ Clear filter
              </div>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filteredElements.length === 0 ? (
          <div
            style={{
              height: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 40 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {selectedPattern
                ? `No ${patternLabels[selectedPattern] || selectedPattern} patterns in this dataset`
                : "No fraud patterns detected"}
            </div>
            <div style={{ fontSize: 13 }}>
              {selectedPattern
                ? "Click 'Clear filter' to see all patterns"
                : "Try uploading a larger dataset or lower detection thresholds"}
            </div>
          </div>
        ) : (
          /* Cytoscape Canvas */
          <CytoscapeComponent
            key={selectedPattern || "all"}   /* remount on filter change to re-run layout cleanly */
            elements={filteredElements}
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
        )}
      </div>
    </div>
  );
}

export default GraphView;