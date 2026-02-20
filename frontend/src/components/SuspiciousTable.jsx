import { useState } from "react";

function getScoreColor(score) {
  if (score >= 80) return "#ef4444";
  if (score >= 65) return "#f97316";
  if (score >= 50) return "#eab308";
  return "#22c55e";
}

function getPatternClass(pattern) {
  if (pattern.includes("cycle")) return "pattern-cycle";
  if (pattern === "fan_in") return "pattern-fan_in";
  if (pattern === "fan_out") return "pattern-fan_out";
  if (pattern === "shell_chain") return "pattern-shell_chain";
  return "";
}

function SuspiciousTable({ accounts }) {
  const [sortKey, setSortKey] = useState("suspicion_score");
  const [sortDir, setSortDir] = useState("desc");
  const [filter, setFilter] = useState("");

  if (!accounts || !accounts.length) return null;

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...accounts]
    .filter(a =>
      a.account_id.toLowerCase().includes(filter.toLowerCase()) ||
      a.ring_id.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: "var(--accent-blue)" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="suspicious-section">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="section-title-icon" style={{ background: "rgba(239,68,68,0.12)" }}>⚠️</div>
          Suspicious Accounts
          <span className="section-count">{accounts.length} flagged</span>
        </div>
        <input
          type="text"
          placeholder="🔍 Filter accounts..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "8px 16px",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
            width: 220,
            fontFamily: "inherit",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--accent-blue)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="s-table">
            <thead className="s-thead">
              <tr>
                <th onClick={() => handleSort("account_id")} style={{ cursor: "pointer" }}>
                  Account ID <SortIcon col="account_id" />
                </th>
                <th onClick={() => handleSort("ring_id")} style={{ cursor: "pointer" }}>
                  Ring <SortIcon col="ring_id" />
                </th>
                <th onClick={() => handleSort("suspicion_score")} style={{ cursor: "pointer" }}>
                  Suspicion Score <SortIcon col="suspicion_score" />
                </th>
                <th>Patterns Detected</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((acc, idx) => {
                const color = getScoreColor(acc.suspicion_score);
                return (
                  <tr
                    key={acc.account_id}
                    className="s-row"
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
                    <td>
                      <span className="acc-id">{acc.account_id}</span>
                    </td>
                    <td>
                      <span className="ring-tag">{acc.ring_id || "—"}</span>
                    </td>
                    <td>
                      <div className="score-cell" style={{ "--score-color": color }}>
                        <div className="score-label">{acc.suspicion_score.toFixed(1)}</div>
                        <div className="score-bar-bg">
                          <div
                            className="score-bar-fill"
                            style={{ width: `${acc.suspicion_score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="pattern-badges">
                        {acc.detected_patterns.map((p) => (
                          <span key={p} className={`pattern-badge ${getPatternClass(p)}`}>
                            {p.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sorted.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            No accounts match your filter
          </div>
        )}
      </div>
    </div>
  );
}

export default SuspiciousTable;
