import { useState, useRef } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function Home() {
  const [images, setImages] = useState([]);
  const [results, setResults] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const dropRef = useRef();

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    setImages(fileArray);
    setResults([]);
    setStatusList(fileArray.map(() => ({ status: "pending", message: "" })));
  };

  const handleUpload = (e) => handleFiles(e.target.files);
  const handleDragOver = (e) => { e.preventDefault(); dropRef.current.style.borderColor = "#4CAF50"; };
  const handleDragLeave = (e) => { e.preventDefault(); dropRef.current.style.borderColor = "#ccc"; };
  const handleDrop = (e) => { 
    e.preventDefault(); 
    dropRef.current.style.borderColor = "#ccc"; 
    handleFiles(e.dataTransfer.files); 
  };

  const padTo16by9 = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => img.src = reader.result;
    img.onload = () => {
      const originalWidth = img.width;
      const originalHeight = img.height;
      const targetAspect = 16 / 9;
      let canvasWidth, canvasHeight;

      if (originalWidth / originalHeight > targetAspect) {
        canvasWidth = originalWidth;
        canvasHeight = Math.round(originalWidth / targetAspect);
      } else {
        canvasHeight = originalHeight;
        canvasWidth = Math.round(originalHeight * targetAspect);
      }

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      const xOffset = (canvasWidth - originalWidth) / 2;
      const yOffset = (canvasHeight - originalHeight) / 2;
      ctx.drawImage(img, xOffset, yOffset, originalWidth, originalHeight);

      resolve(canvas.toDataURL("image/png").split(",")[1]);
    };
    reader.onerror = reject;
  });

  const processBatch = async () => {
    for (let i = 0; i < images.length; i++) {
      updateStatus(i, "processing", "Processing...");
      try {
        const base64 = await padTo16by9(images[i]);
        const res = await fetch("/api/outpaint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.finalImage) throw new Error("No image returned from HF API");

        setResults(prev => [...prev, data.finalImage]);
        updateStatus(i, "done", "✅ Done");
      } catch (err) {
        console.error(`Image ${i+1} failed:`, err);
        updateStatus(i, "error", "❌ Failed");
      }
    }
  };

  const updateStatus = (index, status, message) => {
    setStatusList(prev => {
      const newList = [...prev];
      newList[index] = { status, message };
      return newList;
    });
  };

  const downloadAllAsZip = async () => {
    if (!results.length) return;
    const zip = new JSZip();
    results.forEach((base64, idx) => {
      const imgData = base64ToArrayBuffer(base64);
      zip.file(`image_${idx + 1}.png`, imgData);
    });
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "outpaint_batch.zip");
  };

  const base64ToArrayBuffer = (base64) => {
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
    return buffer;
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center" }}>16:9 Outpainting Batch App</h1>

      <div
        ref={dropRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: "2px dashed #ccc",
          borderRadius: "8px",
          padding: "1rem",
          textAlign: "center",
          marginBottom: "1rem",
          backgroundColor: "#fafafa",
        }}
      >
        <p>Drag & drop images here, or tap to select files</p>
        <input type="file" multiple accept="image/*" onChange={handleUpload} style={{ display: "none" }} id="fileInput"/>
        <label htmlFor="fileInput" style={{ cursor: "pointer", color: "#4CAF50" }}>Select Files</label>
      </div>

      <button
        onClick={processBatch}
        disabled={!images.length}
        style={{
          width: "100%",
          padding: "0.75rem",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          marginBottom: "1rem",
        }}
      >
        Process Batch
      </button>

      {images.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          {images.map((img, idx) => (
            <p key={idx}>{img.name}: {statusList[idx]?.message || "Pending"}</p>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
        {results.map((res, idx) => (
          <img key={idx} src={`data:image/png;base64,${res}`} style={{ width: "48%", borderRadius: "4px" }} />
        ))}
      </div>

      {results.length > 0 && (
        <button
          onClick={downloadAllAsZip}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            marginTop: "1rem",
          }}
        >
          Download All as ZIP
        </button>
      )}
    </div>
  );
}