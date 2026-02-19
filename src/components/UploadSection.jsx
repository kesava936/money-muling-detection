import axios from "axios";
import { useState } from "react";

function UploadSection({ setData }) {

  const [loading,setLoading] = useState(false);

  const upload = async (e) => {

    const file = e.target.files[0];
    if(!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file",file);

    try{

      const res = await axios.post(
        "http://127.0.0.1:5000/analyze",
        formData
      );

      setData(res.data);

    }catch(err){
      console.log(err);
      alert("Backend connection failed");
    }

    setLoading(false);
  }

  return(
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={upload}
      />

      {loading && <p>Analyzing...</p>}
    </div>
  )
}

export default UploadSection;
