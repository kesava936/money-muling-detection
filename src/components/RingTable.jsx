function RingTable({ rings }) {

  if (!rings) return null;

  return (
    <div>
      <h3>Fraud Rings</h3>

      <table border="1" style={{width:"100%",marginBottom:"20px"}}>
        <thead>
          <tr>
            <th>Ring ID</th>
            <th>Pattern</th>
            <th>Members</th>
            <th>Risk Score</th>
          </tr>
        </thead>

        <tbody>
          {rings.map((r)=>(
            <tr key={r.ring_id}>
              <td>{r.ring_id}</td>
              <td>{r.pattern_type}</td>
              <td>{r.member_accounts.join(", ")}</td>
              <td>{r.risk_score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default RingTable;
