import { ImageResponse } from "next/og";
import { getVersionById } from "@/lib/queries/versions";

export const runtime = "nodejs";

export const alt = "TrackForge Version Preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;
  const version = await getVersionById(versionId);

  const title = version?.fileName || "TrackForge Audio Version";
  const versionNum = version?.versionNumber || 1;
  const projectTitle = version?.projectTitle || "Audio Project";

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "24px",
              color: "#09090b",
            }}
          >
            TF
          </div>
          <span style={{ fontSize: "28px", fontWeight: "bold", color: "#10b981" }}>
            TrackForge
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "20px", color: "#06b6d4", textTransform: "uppercase" }}>
            {projectTitle} — v{versionNum}
          </div>
          <div style={{ fontSize: "48px", fontWeight: "900", color: "white" }}>
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "18px",
            color: "#a1a1aa",
            borderTop: "1px solid #27272a",
            paddingTop: "24px",
          }}
        >
          <span>🎵 Interactive Audio Version Control & Waveform Feedback</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
