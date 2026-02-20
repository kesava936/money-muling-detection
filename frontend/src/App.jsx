import './index.css';
import UploadSection from "./components/UploadSection";
import GraphView from "./components/GraphView";
import SuspiciousTable from "./components/SuspiciousTable";
import RingTable from "./components/RingTable";
import DownloadButton from "./components/DownloadButton";
import { useState } from "react";

function App() {
  const [data, setData] = useState(null);

  return (
    <>
      {/* Background Elements */}
      <div className="grid-bg" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="app-wrapper">
        {/* ── Hero Header ── */}
        <header className="hero-header">
          <div className="hero-badge">
            <span className="dot" />
            AI-Powered Financial Intelligence
          </div>
          <h1 className="hero-title">
            Money Mule<br />Detection System
          </h1>
          <p className="hero-subtitle">
            Upload transaction data to instantly detect fraud rings, 
            suspicious transfers, and money muling patterns using advanced graph analysis.
          </p>
        </header>

        {/* ── Stats Bar (only when data) ── */}
        {data && data.summary && (
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-label">Accounts Analyzed</div>
              <div className="stat-value">{data.summary.total_accounts_analyzed.toLocaleString()}</div>
              <div className="stat-desc">transactions processed</div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Suspicious Accounts</div>
              <div className="stat-value">{data.summary.suspicious_accounts_flagged}</div>
              <div className="stat-desc">flagged for review</div>
            </div>
            <div className="stat-card orange">
              <div className="stat-label">Fraud Rings</div>
              <div className="stat-value">{data.summary.fraud_rings_detected}</div>
              <div className="stat-desc">criminal networks found</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Processing Time</div>
              <div className="stat-value">
                {data.summary.processing_time_seconds < 1
                  ? `${Math.round(data.summary.processing_time_seconds * 1000)}ms`
                  : `${data.summary.processing_time_seconds.toFixed(2)}s`}
              </div>
              <div className="stat-desc">real-time analysis</div>
            </div>
          </div>
        )}

        {/* ── Upload ── */}
        <div className="upload-zone">
          <UploadSection setData={setData} hasData={!!data} />
        </div>

        {/* ── Results ── */}
        {data && (
          <>
            <div className="divider" />
            <GraphView data={data} />
            <div className="divider" />
            <RingTable rings={data.fraud_rings} />
            <div className="divider" />
            <SuspiciousTable accounts={data.suspicious_accounts} />
            <div className="divider" />
            <DownloadButton json={data} />
          </>
        )}
      </div>
    </>
  );
}

export default App;
