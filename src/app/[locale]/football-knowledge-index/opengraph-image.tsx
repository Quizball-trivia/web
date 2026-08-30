import { ImageResponse } from "next/og";

export const alt = "QuizBall Football Knowledge Index 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const spanish = locale === "es";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #08111f 0%, #101b33 62%, #0b4737 100%)",
          color: "white",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: "0.08em" }}>
            QUIZ<span style={{ color: "#58d36b" }}>BALL</span>
          </div>
          <div style={{ display: "flex", color: "#46c8ff", fontSize: 24, fontWeight: 700 }}>
            {spanish ? "INVESTIGACIÓN ORIGINAL" : "ORIGINAL RESEARCH"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", maxWidth: 980, fontSize: 68, lineHeight: 1.05, fontWeight: 800 }}>
            {spanish ? "Índice de conocimiento futbolístico 2026" : "Football Knowledge Index 2026"}
          </div>
          <div style={{ display: "flex", marginTop: 30, fontSize: 30, color: "rgba(255,255,255,0.72)" }}>
            {spanish ? "738 respuestas anónimas · 80 quizzes iniciados" : "738 anonymized answers · 80 quiz starts"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: 22, color: "rgba(255,255,255,0.58)" }}>
          <span>{spanish ? "Precisión" : "Accuracy"}</span>
          <span>•</span>
          <span>{spanish ? "Finalización" : "Completion"}</span>
          <span>•</span>
          <span>{spanish ? "Avance" : "Question reach"}</span>
        </div>
      </div>
    ),
    size,
  );
}
