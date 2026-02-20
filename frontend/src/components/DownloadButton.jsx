function DownloadButton({ json }) {
  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `money_mule_report_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const rows = json.suspicious_accounts.map((a) => [
      a.account_id,
      a.suspicion_score,
      a.ring_id,
      a.detected_patterns.join("|"),
    ]);
    const header = ["account_id", "suspicion_score", "ring_id", "detected_patterns"];
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `money_mule_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="download-section">
      <button className="btn-download primary" onClick={downloadJSON}>
        <span>💾</span>
        Export Full Report (JSON)
      </button>
      <button className="btn-download secondary" onClick={downloadCSV}>
        <span>📊</span>
        Export Accounts (CSV)
      </button>
    </div>
  );
}

export default DownloadButton;
