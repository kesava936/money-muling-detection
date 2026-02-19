import UploadSection from "./components/UploadSection";
import GraphView from "./components/GraphView";
import SuspiciousTable from "./components/SuspiciousTable";
import RingTable from "./components/RingTable";
import DownloadButton from "./components/DownloadButton";
import { useState } from "react";


function App() {

  const [data,setData] = useState(null);

  return(
    <div style={{background:"#111",color:"white",minHeight:"100vh",padding:"20px"}}>
      <h2>Money Mule Fraud Detection Dashboard</h2>

      <UploadSection setData={setData}/>

      {data && (
        <>
          <GraphView data={data}/>
          <RingTable rings={data.fraud_rings}/>
          <SuspiciousTable accounts={data.suspicious_accounts}/>
          <DownloadButton json={data}/>
        </>
      )}
    </div>
  )
}

export default App;
