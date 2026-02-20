import axios from "axios";
import { useState, useRef } from "react";

function UploadSection({ setData, hasData }) {

  const [loading, setLoading] = useState(false);
  const [dragover, setDragover] = useState(false);
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef();

  const processFile = async (file) => {

    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setStep(1);

    const formData = new FormData();
    formData.append("file", file);

    try {

      setTimeout(() => setStep(2), 600);
      setTimeout(() => setStep(3), 1400);

      const res = await axios.post(
        "https://money-muling-detection-5.onrender.com/analyze",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      setStep(4);

      // 🔥 VERY IMPORTANT GRAPH RESET
      setData(null);

      setTimeout(() => {
        setData(res.data);
        setLoading(false);
        setStep(0);
      }, 200);

    } catch (err) {
      console.error(err);
      setLoading(false);
      setStep(0);
      const msg = err?.response?.data?.error || err.message || "Backend connection failed. Make sure Flask is running on port 5000.";
      alert("❌ Error: " + msg);
    }
  };

  const handleChange = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) processFile(file);
  };

  const steps = [
    { label: "Parsing CSV data", icon: "📄" },
    { label: "Building transaction graph", icon: "🕸️" },
    { label: "Running fraud detection algorithms", icon: "🔍" },
    { label: "Generating results", icon: "✅" },
  ];

  if (loading) {
    return (
      <div className="card">
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">
            Analyzing <strong>{fileName}</strong>
          </div>
          <div className="loading-steps">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`loading-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}
              >
                <span className="step-dot" />
                <span>{s.icon} {s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`drop-area ${dragover ? 'dragover' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
      onDragLeave={() => setDragover(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <span className="drop-icon">
        {hasData ? '🔄' : '📂'}
      </span>
      <div className="drop-title">
        {hasData ? 'Analyze Another File' : 'Drop your CSV file here'}
      </div>
      <div className="drop-subtitle">
        {hasData
          ? 'Upload a new CSV to re-run the analysis'
          : 'Drag & drop or click to browse • Supports .csv'}
      </div>
      <button className="drop-btn" onClick={(e) => e.stopPropagation()}>
        📁 {hasData ? 'Choose New File' : 'Browse Files'}
      </button>
    </div>
  );
}

export default UploadSection;
