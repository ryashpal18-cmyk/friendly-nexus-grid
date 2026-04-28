import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const GEMINI_KEY = "AQ.Ab8RN6JqPw_O_IqxEoNNFQ2_KRIRJLFhiks8_FymUWUbe50QjQ";

export default function AIXrayReport() {
  const [image, setImage] = useState<File | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!image) {
      alert("Image upload karein");
      return;
    }

    setLoading(true);

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inline_data: {
                        mime_type: image.type,
                        data: base64,
                      },
                    },
                    {
                      text: "Generate a professional radiology X-ray report with findings, impression and recommendations.",
                    },
                  ],
                },
              ],
            }),
          }
        );

        const data = await res.json();

        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "Report generate nahi ho payi.";

        setReport(text);

        await supabase.from("xray_reports").insert({
          patient_name: "Unknown",
          report_data: text,
          report_type: "AI X-Ray",
          clinic_name: "Balaji Ortho Care Center",
        });
      } catch (err) {
        console.error(err);
        alert("Report generate error");
      }

      setLoading(false);
    };

    reader.readAsDataURL(image);
  };

  return (
    <div style={{ padding: 20, border: "2px solid #3b82f6", borderRadius: 12 }}>
      <h2>🩻 AI X-Ray Report Generator (₹50)</h2>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files?.[0] || null)}
      />

      <br /><br />

      <button
        onClick={generateReport}
        style={{
          padding: "10px 20px",
          background: "#256
