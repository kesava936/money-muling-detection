function SuspiciousTable({ accounts }) {

  if (!accounts) return null;

  return (
    <div>
      <h3>Suspicious Accounts</h3>

      <table border="1" style={{width:"100%",marginBottom:"20px"}}>
        <thead>
          <tr>
            <th>Account ID</th>
            <th>Suspicion Score</th>
            <th>Ring ID</th>
            <th>Patterns</th>
          </tr>
        </thead>

        <tbody>
          {accounts.map((a,i)=>(
            <tr key={a.account_id || i}>
              <td>{a.account_id}</td>
              <td>{a.suspicion_score}</td>
              <td>{a.ring_id}</td>
              <td>{a.detected_patterns?.join(", ") || "None"}</td>
            </tr>
          ))}

        </tbody>
      </table>
    </div>
  )
}

export default SuspiciousTable;
