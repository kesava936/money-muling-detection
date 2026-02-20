const RING_COLORS = {
  cycle: "#ef4444",
  fan_in: "#f97316",
  fan_out: "#eab308",
  shell_chain: "#a855f7",
};

const RING_ICONS = {
  cycle: "🔄",
  fan_in: "🎯",
  fan_out: "📡",
  shell_chain: "⛓️",
};

const PATTERN_DESCRIPTION = {
  cycle: "Circular money flow between accounts",
  fan_in: "Multiple sources funneling to one account",
  fan_out: "One account distributing to many",
  shell_chain: "Sequential layering through shell accounts",
};

function RiskBadge({ score }) {
  if (score >= 90) return <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 12 }}>🚨 CRITICAL</span>;
  if (score >= 80) return <span style={{ color: "#f97316", fontWeight: 700, fontSize: 12 }}>⚠️ HIGH</span>;
  if (score >= 70) return <span style={{ color: "#eab308", fontWeight: 700, fontSize: 12 }}>⚡ MODERATE</span>;
  return <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 12 }}>✓ LOW</span>;
}

function RingTable({ rings }) {
  if (!rings || !rings.length) return null;

  return (
    <div className="rings-grid" style={{ marginBottom: 0 }}>
      <div style={{ gridColumn: "1 / -1", marginBottom: 4 }}>
        <div className="section-title">
          <div className="section-title-icon" style={{ background: "rgba(239,68,68,0.12)" }}>🔍</div>
          Detected Fraud Rings
          <span className="section-count">{rings.length} rings</span>
        </div>
      </div>

      {rings.map((ring, idx) => {
        const color = RING_COLORS[ring.pattern_type] || "#3b82f6";
        const icon = RING_ICONS[ring.pattern_type] || "💠";
        const desc = PATTERN_DESCRIPTION[ring.pattern_type] || ring.pattern_type;

        return (
          <div
            key={ring.ring_id}
            className="ring-card"
            style={{
              "--ring-color": color,
              animationDelay: `${idx * 0.08}s`,
            }}
          >
            <div className="ring-card-header">
              <div>
                <div className="ring-id">{ring.ring_id}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{desc}</div>
              </div>
              <div className="ring-pattern-badge">
                {icon} {ring.pattern_type.replace("_", " ")}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <RiskBadge score={ring.risk_score} />
            </div>

            <div className="ring-risk-row">
              <div className="ring-risk-label">Risk</div>
              <div className="ring-risk-bar-bg">
                <div
                  className="ring-risk-bar-fill"
                  style={{ width: `${ring.risk_score}%` }}
                />
              </div>
              <div className="ring-risk-value">{ring.risk_score}%</div>
            </div>

            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span>👥</span>
              {ring.member_accounts.length} member accounts
            </div>

            <div className="ring-members">
              {ring.member_accounts.map((acc) => (
                <span key={acc} className="member-chip">{acc}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default RingTable;
