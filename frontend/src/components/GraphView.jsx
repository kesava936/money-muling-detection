import CytoscapeComponent from "react-cytoscapejs";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";

// ─── Color palette ─────────────────────────────────────────────
const PATTERN_COLORS = {
  cycle: "#ef4444",
  fan_in: "#f97316",
  fan_out: "#eab308",
  shell_chain: "#a855f7",
  isolated_account: "#3b82f6",
};

const RISK_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  moderate: "#eab308",
  low: "#22c55e",
  none: "#475569",
};

function getRiskLevel(score) {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 50) return "moderate";
  if (score > 0) return "low";
  return "none";
}

function getRiskLabel(score) {
  if (score >= 80) return "🚨 CRITICAL";
  if (score >= 65) return "⚠️ HIGH";
  if (score >= 50) return "⚡ MODERATE";
  if (score > 0) return "✓ LOW";
  return "— CLEAN";
}

// ─── Layout configs ────────────────────────────────────────────
const LAYOUTS = {
  cose: {
    name: "cose",
    animate: false,
    fit: true,
    padding: 60,
    nodeRepulsion: () => 8000,
    idealEdgeLength: () => 140,
    gravity: 0.25,
    numIter: 400,
  },
  concentric: {
    name: "concentric",
    animate: false,
    fit: true,
    padding: 50,
    minNodeSpacing: 50,
    concentric: (node) => node.data("suspicion_score") || 0,
    levelWidth: () => 2,
  },
  circle: {
    name: "circle",
    animate: false,
    fit: true,
    padding: 50,
    spacingFactor: 1.8,
  },
  breadthfirst: {
    name: "breadthfirst",
    animate: false,
    fit: true,
    padding: 50,
    directed: true,
    spacingFactor: 1.2,
  },
  grid: {
    name: "grid",
    animate: false,
    fit: true,
    padding: 40,
    rows: undefined,
  },
};

const LAYOUT_LABELS = {
  cose: "🧲 Force-Directed",
  concentric: "🎯 Concentric",
  circle: "⭕ Circle",
  breadthfirst: "🌳 Hierarchical",
  grid: "⊞ Grid",
};

// ─── Build Cytoscape elements from backend graph data ──────────
function buildElementsFromGraph(graphData, fraudRings, suspiciousAccounts) {
  if (!graphData?.nodes || !graphData?.edges) return [];

  const elements = [];
  const ringPatternMap = {};

  // Map each account to its primary fraud ring pattern
  fraudRings?.forEach((ring) => {
    ring.member_accounts.forEach((acc) => {
      if (!ringPatternMap[acc]) {
        ringPatternMap[acc] = ring.pattern_type;
      }
    });
  });

  // ── Nodes ──
  graphData.nodes.forEach((node) => {
    const pattern = ringPatternMap[node.id] || "none";
    const risk = getRiskLevel(node.suspicion_score);
    const color =
      PATTERN_COLORS[pattern] || RISK_COLORS[risk] || RISK_COLORS.none;

    elements.push({
      data: {
        id: node.id,
        label: node.id,
        suspicion_score: node.suspicion_score,
        risk_level: risk,
        pattern,
        color,
        in_degree: node.in_degree,
        out_degree: node.out_degree,
        total_sent: node.total_sent,
        total_received: node.total_received,
        tx_count: node.tx_count,
        is_suspicious: node.is_suspicious,
        ring_ids: node.ring_ids || [],
        detected_patterns: node.detected_patterns || [],
      },
    });
  });

  // ── Edges ──
  graphData.edges.forEach((edge) => {
    elements.push({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        total_amount: edge.total_amount,
        tx_count: edge.tx_count,
        is_ring_edge: edge.is_ring_edge,
        color: edge.is_ring_edge ? "#ef4444" : "#334155",
      },
    });
  });

  return elements;
}

// ─── Fallback: build from fraud_rings (legacy) ─────────────────
function buildElementsFromRings(data) {
  const nodeSet = new Set();
  const edgeSet = new Set();
  const elements = [];

  data.fraud_rings.forEach((ring) => {
    const color = PATTERN_COLORS[ring.pattern_type] || "#3b82f6";
    const pattern = ring.pattern_type;
    const members = ring.member_accounts;

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
          suspicion_score: scoreObj?.suspicion_score ?? 0,
          risk_level: getRiskLevel(scoreObj?.suspicion_score ?? 0),
          pattern,
          color,
          is_suspicious: !!scoreObj,
          ring_ids: scoreObj?.ring_id ? [scoreObj.ring_id] : [],
          detected_patterns: scoreObj?.detected_patterns || [],
        },
      });
    });

    if (members.length < 2) return;

    const addEdge = (src, tgt) => {
      const id = `e-${src}-${tgt}`;
      if (edgeSet.has(id)) return;
      edgeSet.add(id);
      elements.push({
        data: { id, source: src, target: tgt, color, pattern, is_ring_edge: true },
      });
    };

    if (pattern === "cycle") {
      for (let i = 0; i < members.length; i++)
        addEdge(members[i], members[(i + 1) % members.length]);
    } else if (pattern === "fan_in") {
      const agg = members[0];
      members.slice(1).forEach((src) => addEdge(src, agg));
    } else if (pattern === "fan_out") {
      const dist = members[0];
      members.slice(1).forEach((tgt) => addEdge(dist, tgt));
    } else {
      for (let i = 0; i < members.length - 1; i++)
        addEdge(members[i], members[i + 1]);
    }
  });

  return elements;
}

// ─── Build stylesheet ──────────────────────────────────────────
function buildStylesheet(nodeCount) {
  const fontSize = nodeCount > 100 ? 6 : nodeCount > 50 ? 8 : nodeCount > 20 ? 10 : 12;
  const nodeSize = nodeCount > 100 ? 22 : nodeCount > 50 ? 30 : nodeCount > 20 ? 40 : 50;

  return [
    {
      selector: "node",
      style: {
        label: "data(label)",
        "background-color": "data(color)",
        color: "#e2e8f0",
        "font-size": `${fontSize}px`,
        "font-family": "'Inter', sans-serif",
        "text-valign": "bottom",
        "text-margin-y": 6,
        width: nodeSize,
        height: nodeSize,
        "border-width": 2,
        "border-color": "data(color)",
        "border-opacity": 0.5,
        "background-opacity": 0.9,
        "text-outline-width": 2,
        "text-outline-color": "#0f172a",
        "text-outline-opacity": 0.8,
        "overlay-padding": "6px",
        "z-index": 10,
        "transition-property":
          "background-color, border-color, width, height, border-width",
        "transition-duration": "0.2s",
      },
    },
    {
      selector: "node[?is_suspicious]",
      style: {
        "border-width": 3,
        "border-opacity": 1,
        "background-opacity": 1,
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 4,
        "border-color": "#38bdf8",
        "background-color": "#38bdf8",
        width: nodeSize + 14,
        height: nodeSize + 14,
        "z-index": 999,
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.5,
        "line-color": "#334155",
        "line-opacity": 0.35,
        "target-arrow-color": "#334155",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        "arrow-scale": 0.7,
        "transition-property": "line-color, width, line-opacity",
        "transition-duration": "0.2s",
      },
    },
    {
      selector: "edge[?is_ring_edge]",
      style: {
        width: 2.5,
        "line-color": "data(color)",
        "line-opacity": 0.8,
        "target-arrow-color": "data(color)",
        "arrow-scale": 1,
      },
    },
    {
      selector: "edge:selected",
      style: {
        width: 3,
        "line-color": "#38bdf8",
        "line-opacity": 1,
        "target-arrow-color": "#38bdf8",
        "z-index": 999,
      },
    },
    // Dimmed state for filtered-out elements
    {
      selector: ".dimmed",
      style: {
        opacity: 0.1,
      },
    },
    {
      selector: ".highlighted",
      style: {
        opacity: 1,
        "z-index": 999,
      },
    },
  ];
}

// ─── Inspector Panel Component ─────────────────────────────────
function InspectorPanel({ selected, onClose }) {
  if (!selected) return null;

  const d = selected.data;
  const isNode = !d.source;

  return (
    <div className="inspector-panel">
      <div className="inspector-header">
        <div className="inspector-title">
          {isNode ? "🔍 Account Details" : "↗️ Transaction Edge"}
        </div>
        <button className="inspector-close" onClick={onClose}>
          ✕
        </button>
      </div>

      {isNode ? (
        <div className="inspector-body">
          <div className="inspector-id">{d.id}</div>

          <div className="inspector-risk-badge" data-level={d.risk_level}>
            {getRiskLabel(d.suspicion_score)}
          </div>

          <div className="inspector-row">
            <span className="inspector-label">Suspicion Score</span>
            <span className="inspector-value">
              {(d.suspicion_score || 0).toFixed(1)}
            </span>
          </div>
          <div className="inspector-bar-bg">
            <div
              className="inspector-bar-fill"
              style={{
                width: `${d.suspicion_score || 0}%`,
                background: RISK_COLORS[d.risk_level] || RISK_COLORS.none,
              }}
            />
          </div>

          <div className="inspector-divider" />

          <div className="inspector-row">
            <span className="inspector-label">In-Degree</span>
            <span className="inspector-value">{d.in_degree ?? "—"}</span>
          </div>
          <div className="inspector-row">
            <span className="inspector-label">Out-Degree</span>
            <span className="inspector-value">{d.out_degree ?? "—"}</span>
          </div>
          <div className="inspector-row">
            <span className="inspector-label">Total Sent</span>
            <span className="inspector-value">
              ${(d.total_sent || 0).toLocaleString()}
            </span>
          </div>
          <div className="inspector-row">
            <span className="inspector-label">Total Received</span>
            <span className="inspector-value">
              ${(d.total_received || 0).toLocaleString()}
            </span>
          </div>
          <div className="inspector-row">
            <span className="inspector-label">Transactions</span>
            <span className="inspector-value">{d.tx_count ?? "—"}</span>
          </div>

          {d.ring_ids?.length > 0 && (
            <>
              <div className="inspector-divider" />
              <div className="inspector-section-label">Ring Memberships</div>
              <div className="inspector-chips">
                {d.ring_ids.map((r) => (
                  <span key={r} className="inspector-chip ring">
                    {r}
                  </span>
                ))}
              </div>
            </>
          )}

          {d.detected_patterns?.length > 0 && (
            <>
              <div className="inspector-section-label">Detected Patterns</div>
              <div className="inspector-chips">
                {d.detected_patterns.map((p) => (
                  <span key={p} className="inspector-chip pattern">
                    {p.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="inspector-body">
          <div className="inspector-edge-flow">
            <span className="inspector-edge-node">{d.source}</span>
            <span className="inspector-edge-arrow">→</span>
            <span className="inspector-edge-node">{d.target}</span>
          </div>

          <div className="inspector-row">
            <span className="inspector-label">Total Amount</span>
            <span className="inspector-value">
              ${(d.total_amount || 0).toLocaleString()}
            </span>
          </div>
          <div className="inspector-row">
            <span className="inspector-label">Transactions</span>
            <span className="inspector-value">{d.tx_count ?? 1}</span>
          </div>
          <div className="inspector-row">
            <span className="inspector-label">Ring Edge</span>
            <span className="inspector-value">
              {d.is_ring_edge ? "🔴 Yes" : "— No"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
function GraphView({ data }) {
  const cyRef = useRef(null);
  const [allElements, setAllElements] = useState([]);
  const [viewMode, setViewMode] = useState("rings"); // "rings" | "full"
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [layoutName, setLayoutName] = useState("cose");
  const [selectedElement, setSelectedElement] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Build elements from data ──
  useEffect(() => {
    if (!data) return;

    let elements;
    if (data.graph?.nodes?.length) {
      elements = buildElementsFromGraph(
        data.graph,
        data.fraud_rings,
        data.suspicious_accounts
      );
    } else if (data.fraud_rings?.length) {
      elements = buildElementsFromRings(data);
    } else {
      elements = [];
    }

    setAllElements(elements);
    setSelectedPattern(null);
    setSelectedElement(null);
    setSearchTerm("");
  }, [data]);

  // ── Filter by view mode & pattern ──
  const filteredElements = useMemo(() => {
    let nodes = allElements.filter((el) => !el.data.source);
    let edges = allElements.filter((el) => el.data.source);

    // View mode filter
    if (viewMode === "rings") {
      nodes = nodes.filter((el) => el.data.is_suspicious);
      const nodeIds = new Set(nodes.map((n) => n.data.id));
      edges = edges.filter(
        (el) => nodeIds.has(el.data.source) && nodeIds.has(el.data.target)
      );
    }

    // Pattern filter
    if (selectedPattern) {
      nodes = nodes.filter((el) => el.data.pattern === selectedPattern);
      const nodeIds = new Set(nodes.map((n) => n.data.id));
      edges = edges.filter(
        (el) => nodeIds.has(el.data.source) && nodeIds.has(el.data.target)
      );
    }

    return [...nodes, ...edges];
  }, [allElements, viewMode, selectedPattern]);

  const nodeCount = useMemo(
    () => filteredElements.filter((el) => !el.data.source).length,
    [filteredElements]
  );
  const edgeCount = useMemo(
    () => filteredElements.filter((el) => el.data.source).length,
    [filteredElements]
  );

  const layout = useMemo(() => LAYOUTS[layoutName] || LAYOUTS.cose, [layoutName]);

  const stylesheet = useMemo(() => buildStylesheet(nodeCount), [nodeCount]);

  // ── Search highlighting ──
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass("dimmed highlighted");

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const matched = cy.nodes().filter((n) =>
        n.data("id").toLowerCase().includes(term)
      );

      if (matched.length > 0) {
        cy.elements().addClass("dimmed");
        matched.addClass("highlighted").removeClass("dimmed");
        matched.connectedEdges().addClass("highlighted").removeClass("dimmed");
        matched
          .connectedEdges()
          .connectedNodes()
          .addClass("highlighted")
          .removeClass("dimmed");
      }
    }
  }, [searchTerm]);

  // ── Cytoscape event handlers ──
  const handleCyReady = useCallback(
    (cy) => {
      cyRef.current = cy;

      cy.on("tap", "node", (evt) => {
        const d = evt.target.data();
        setSelectedElement({ type: "node", data: d });
      });

      cy.on("tap", "edge", (evt) => {
        const d = evt.target.data();
        setSelectedElement({ type: "edge", data: d });
      });

      cy.on("tap", (evt) => {
        if (evt.target === cy) {
          setSelectedElement(null);
        }
      });
    },
    []
  );

  // ── Graph controls ──
  const zoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.3);
  const zoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() / 1.3);
  const fitView = () => cyRef.current?.fit(undefined, 50);

  if (!data?.fraud_rings && !data?.graph) return null;

  const patterns = [
    ...new Set(
      (data.fraud_rings || []).map((r) => r.pattern_type)
    ),
  ];

  const patternLabels = {
    cycle: "🔄 Cycle",
    fan_in: "🎯 Fan-In",
    fan_out: "📡 Fan-Out",
    shell_chain: "⛓️ Shell Chain",
    isolated_account: "🔵 Isolated",
  };

  return (
    <div className="graph-section">
      <div className="graph-container">
        {/* ── Header ── */}
        <div className="graph-header">
          <div>
            <div className="section-title">
              <div
                className="section-title-icon"
                style={{ background: "rgba(59,130,246,0.12)" }}
              >
                🕸️
              </div>
              Transaction Graph
              <span className="section-count">
                {nodeCount} nodes · {edgeCount} edges
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="graph-search-wrap">
            <input
              type="text"
              placeholder="🔍 Search account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="graph-search-input"
            />
            {searchTerm && (
              <button
                className="graph-search-clear"
                onClick={() => setSearchTerm("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Controls Bar ── */}
        <div className="graph-controls-bar">
          {/* View Mode Toggle */}
          <div className="graph-toggle-group">
            <button
              className={`graph-toggle-btn ${viewMode === "rings" ? "active" : ""}`}
              onClick={() => setViewMode("rings")}
            >
              🎯 Fraud Rings
            </button>
            <button
              className={`graph-toggle-btn ${viewMode === "full" ? "active" : ""}`}
              onClick={() => setViewMode("full")}
            >
              🌐 Full Network
            </button>
          </div>

          {/* Layout Selector */}
          <div className="graph-layout-selector">
            {Object.keys(LAYOUTS).map((key) => (
              <button
                key={key}
                className={`graph-layout-btn ${layoutName === key ? "active" : ""}`}
                onClick={() => setLayoutName(key)}
                title={LAYOUT_LABELS[key]}
              >
                {LAYOUT_LABELS[key]}
              </button>
            ))}
          </div>

          {/* Zoom Controls */}
          <div className="graph-zoom-controls">
            <button className="graph-zoom-btn" onClick={zoomIn} title="Zoom In">
              +
            </button>
            <button className="graph-zoom-btn" onClick={zoomOut} title="Zoom Out">
              −
            </button>
            <button className="graph-zoom-btn" onClick={fitView} title="Fit View">
              ⊡
            </button>
          </div>
        </div>

        {/* ── Pattern Legend / Filter ── */}
        <div className="graph-legend">
          {patterns.map((p) => (
            <div
              key={p}
              onClick={() =>
                setSelectedPattern(selectedPattern === p ? null : p)
              }
              className={`graph-legend-item ${
                selectedPattern === p ? "active" : ""
              } ${selectedPattern && selectedPattern !== p ? "faded" : ""}`}
            >
              <span
                className="graph-legend-dot"
                style={{ background: PATTERN_COLORS[p] }}
              />
              {patternLabels[p] || p}
            </div>
          ))}
          {selectedPattern && (
            <div
              className="graph-legend-clear"
              onClick={() => setSelectedPattern(null)}
            >
              ✕ Clear filter
            </div>
          )}
        </div>

        {/* ── Graph Canvas + Inspector ── */}
        <div className="graph-canvas-wrapper">
          {filteredElements.length === 0 ? (
            <div className="graph-empty-state">
              <div style={{ fontSize: 48 }}>🔍</div>
              <div className="graph-empty-title">
                {selectedPattern
                  ? `No ${patternLabels[selectedPattern] || selectedPattern} patterns detected`
                  : "No fraud patterns detected"}
              </div>
              <div className="graph-empty-subtitle">
                {selectedPattern
                  ? "Click 'Clear filter' to see all patterns"
                  : "Try uploading a dataset with transaction patterns"}
              </div>
            </div>
          ) : (
            <CytoscapeComponent
              key={`${viewMode}-${selectedPattern || "all"}-${layoutName}`}
              elements={filteredElements}
              style={{
                width: "100%",
                height: nodeCount > 80 ? "700px" : nodeCount > 30 ? "580px" : "480px",
                background: "transparent",
              }}
              layout={layout}
              minZoom={0.08}
              maxZoom={4}
              wheelSensitivity={0.25}
              stylesheet={stylesheet}
              cy={handleCyReady}
            />
          )}

          {/* ── Inspector Side Panel ── */}
          <InspectorPanel
            selected={selectedElement}
            onClose={() => setSelectedElement(null)}
          />
        </div>
      </div>
    </div>
  );
}

export default GraphView;