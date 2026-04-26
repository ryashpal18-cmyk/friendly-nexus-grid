import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BODY_PARTS = ["Chest / Lungs", "Shoulder", "Spine", "Knee", "Hip", "Wrist / Hand", "Skull", "Abdomen", "Pelvis", "Elbow", "Ankle", "Ribs"];
const VIEWS = ["AP — Antero-Posterior", "PA — Postero-Anterior", "Lateral", "Oblique", "Axial", "MRI", "Ultrasound", "Other"];
const CLINIC_NAME = "Balaji Health Hub";

type AIReport = {
  studyType: string;
  bodyPartDetected: string;
  urgency: string;
  technique: string;
  clinicalIndication: string;
  findings?: {
    overall?: string;
    bones?: string;
    softTissues?: string;
    specificFindings?: string;
    extraFindings?: string;
  };
  impression: string;
  differentialDiagnosis?: string;
  recommendations: string;
  urgentFindings?: string;
};

export default function AIXrayReport() {
  const [img, setImg] = useState<string | null>(null);
  const [b64, setB64] = useState<string | null>(null);
  const [mime, setMime] = useState<string | null>(null);
  const [report, setReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [body, setBody] = useState("Chest / Lungs");
  const [view, setView] = useState("AP — Antero-Posterior");
  const [clinical, setClinical] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const reportId = useRef("BHH-" + Math.random().toString(36).slice(2, 10).toUpperCase());
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const loadFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = String(e.target?.result || "");
      setImg(result);
      setB64(result.split(",")[1]);
      setMime(file.type);
      setReport(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!b64 || !mime) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke("generate-xray-report", {
        body: {
          imageBase64: b64,
          mimeType: mime,
          patient: { name, age, gender, bodyPart: body, view, clinicalHistory: clinical },
        },
      });
      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);
      setReport(data.report);
    } catch (e) {
      setError("Error: " + (e instanceof Error ? e.message : "Unable to generate report"));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase" as const, marginBottom: 4, display: "block" };

  return (
    <div style={{ background: "#f8fafc", border: "1px solid #dbeafe", borderRadius: 16, padding: 16, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#2563eb,#0ea5e9)", display: "grid", placeItems: "center", fontSize: 22 }}>🤖</div>
          <div>
            <h2 style={{ color: "#0f172a", fontSize: 20, fontWeight: 800, margin: 0 }}>AI X-Ray Report Generator</h2>
            <p style={{ color: "#64748b", fontSize: 12, margin: "3px 0 0" }}>⚡ AI-powered instant reference report</p>
          </div>
        </div>
        <span style={{ background: "#dcfce7", color: "#15803d", padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>● AI Online</span>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid #e2e8f0" }}>
        <div style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 12, fontSize: 13 }}>🧑‍⚕️ Patient Information</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 12 }}>
          <label><span style={labelStyle}>Patient Name</span><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label><span style={labelStyle}>Age</span><input style={inputStyle} value={age} onChange={(e) => setAge(e.target.value)} /></label>
          <label><span style={labelStyle}>Gender</span><select style={inputStyle} value={gender} onChange={(e) => setGender(e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
          <label><span style={labelStyle}>Body Part</span><select style={inputStyle} value={body} onChange={(e) => setBody(e.target.value)}>{BODY_PARTS.map((b) => <option key={b}>{b}</option>)}</select></label>
          <label><span style={labelStyle}>View / Projection</span><select style={inputStyle} value={view} onChange={(e) => setView(e.target.value)}>{VIEWS.map((v) => <option key={v}>{v}</option>)}</select></label>
        </div>
        <label><span style={labelStyle}>Clinical History / Symptoms</span><input style={inputStyle} value={clinical} onChange={(e) => setClinical(e.target.value)} /></label>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid #e2e8f0" }}>
        <div style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 12, fontSize: 13 }}>🩻 Upload X-Ray Image</div>
        <div onClick={() => !img && fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); loadFile(e.dataTransfer.files[0]); }} style={{ border: `2px dashed ${drag ? "#3b82f6" : "#cbd5e1"}`, borderRadius: 10, padding: img ? 8 : 32, textAlign: "center", cursor: img ? "default" : "pointer", background: drag ? "#eff6ff" : "#f8fafc", transition: "all .2s" }}>
          {img ? <div><img src={img} alt="scan" style={{ maxHeight: 300, maxWidth: "100%", borderRadius: 8, objectFit: "contain" }} /><div style={{ display: "flex", gap: 8, marginTop: 10 }}><button onClick={(e) => { e.stopPropagation(); setImg(null); setB64(null); setReport(null); }} style={{ flex: 1, padding: 8, background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, color: "#dc2626", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>✕ Hatao</button><button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }} style={{ flex: 1, padding: 8, background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 8, color: "#2563eb", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>🔄 Badlo</button></div></div> : <><div style={{ fontSize: 40, marginBottom: 8 }}>🩻</div><div style={{ color: "#475569", fontWeight: 700 }}>X-Ray Image Yahan Drop Karein</div><div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>ya click karke select karein • JPG, PNG • Max 10MB</div></>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={(e) => loadFile(e.target.files?.[0])} style={{ display: "none" }} />
      </div>

      <button onClick={analyze} disabled={!b64 || loading} style={{ width: "100%", padding: 15, background: loading || !b64 ? "#94a3b8" : "linear-gradient(90deg,#2563eb,#0ea5e9)", border: "none", borderRadius: 10, color: "#fff", fontSize: 17, fontWeight: 800, cursor: !b64 || loading ? "not-allowed" : "pointer", letterSpacing: 1, boxShadow: "0 4px 20px #2563eb44", marginBottom: 12 }}>{loading ? "AI Report Bana Raha Hai... Please Wait" : "⚡ AI SE REPORT GENERATE KAREIN"}</button>
      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: 12, borderRadius: 10, marginBottom: 12 }}>⚠️ {error}</div>}

      {report && <div style={{ background: "#fff", border: "1px solid #bfdbfe", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(90deg,#1e3a8a,#0369a1)", color: "#fff", padding: 16, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><div style={{ fontSize: 18, fontWeight: 800 }}>📋 Radiology Report — {CLINIC_NAME}</div><div style={{ fontSize: 12, opacity: 0.9 }}>{reportId.current} · {dateStr} · {timeStr}</div></div><b>● {report.studyType}</b></div>
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>{[["Patient", name || "—"], ["Age/Gender", age ? `${age} yrs / ${gender}` : gender], ["Body Part", report.bodyPartDetected || body], ["Study Date", now.toLocaleDateString("en-IN")], ["Ref Doctor", "Dr. Rathore"], ["Urgency", report.urgency || "Routine"]].map(([l, v]) => <div key={l} style={{ background: "#f8fafc", padding: 10, borderRadius: 8 }}><div style={{ color: "#64748b", fontSize: 11 }}>{l}</div><b style={{ color: "#0f172a", fontSize: 13 }}>{v}</b></div>)}</div>
          {[ ["Clinical Indication", report.clinicalIndication], ["Technique", report.technique] ].map(([title, text]) => text && <section key={title} style={{ marginBottom: 14 }}><h3 style={{ color: "#1e3a8a", fontSize: 14, marginBottom: 4 }}>{title}</h3><p style={{ color: "#334155", margin: 0, whiteSpace: "pre-line" }}>{text}</p></section>)}
          <section style={{ marginBottom: 14 }}><h3 style={{ color: "#1e3a8a", fontSize: 14, marginBottom: 4 }}>Findings</h3>{report.findings?.overall && <p style={{ color: "#334155" }}>{report.findings.overall}</p>}{[["Bones/Joints", report.findings?.bones], ["Soft Tissues", report.findings?.softTissues], ["Specific Findings", report.findings?.specificFindings], ["Extra Findings", report.findings?.extraFindings]].filter(([, v]) => v && v !== "None" && v !== "N/A").map(([k, v]) => <p key={k} style={{ color: "#334155", margin: "6px 0" }}><b>{k}:</b> {v}</p>)}</section>
          <section style={{ background: "#eff6ff", borderLeft: "4px solid #2563eb", padding: 12, borderRadius: 8, marginBottom: 14 }}><h3 style={{ color: "#1e3a8a", fontSize: 14, margin: "0 0 4px" }}>Impression</h3><p style={{ color: "#0f172a", margin: 0, whiteSpace: "pre-line", fontWeight: 600 }}>{report.impression}</p></section>
          {report.differentialDiagnosis && report.differentialDiagnosis !== "None" && <section style={{ marginBottom: 14 }}><h3 style={{ color: "#1e3a8a", fontSize: 14 }}>Differential Diagnosis</h3><p>{report.differentialDiagnosis}</p></section>}
          <section style={{ marginBottom: 14 }}><h3 style={{ color: "#1e3a8a", fontSize: 14 }}>Recommendations</h3><p>{report.recommendations}</p></section>
          {report.urgentFindings && report.urgentFindings !== "None" && <section style={{ background: "#fef2f2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 14 }}><b>⚠ Urgent / Critical Findings</b><p>{report.urgentFindings}</p></section>}
          <button onClick={() => window.print()} style={{ width: "100%", padding: 11, background: "#fff", border: "2px solid #3b82f6", borderRadius: 8, color: "#2563eb", fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: 1 }}>🖨️ PRINT / DOWNLOAD REPORT</button>
          <p style={{ color: "#64748b", fontSize: 12, marginTop: 10, textAlign: "center" }}>⚠️ AI report sirf reference ke liye hai. Qualified radiologist se confirm karwayein.</p>
        </div>
      </div>}
    </div>
  );
}