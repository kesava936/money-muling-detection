function DownloadButton({ json }) {

  const download = () => {

    const blob = new Blob(
      [JSON.stringify(json, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "report.json";
    a.click();
  };

  return (
    <button onClick={download}>
      Download Investigation Report
    </button>
  );
}

export default DownloadButton;
