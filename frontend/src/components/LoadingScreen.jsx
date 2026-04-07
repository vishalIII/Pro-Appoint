import React, { useEffect } from "react";

let stylesInjected = false;

const ensureSpinnerStyles = () => {
  if (stylesInjected || typeof document === "undefined") return;
  const styleTag = document.createElement("style");
  styleTag.innerHTML = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleTag);
  stylesInjected = true;
};

// Lightweight fallback shown while lazy-loaded route bundles download.
export default function LoadingScreen() {
  useEffect(() => {
    ensureSpinnerStyles();
  }, []);

  return (
    <div className="page-shell" style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center", color: "#1f2937" }}>
        <div
          style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "999px",
            border: "4px solid #e5e7eb",
            borderTopColor: "#10b981",
            margin: "0 auto 0.75rem",
            animation: "spin 1s linear infinite"
          }}
        />
        <p style={{ fontWeight: 600 }}>Loading…</p>
      </div>
    </div>
  );
}
