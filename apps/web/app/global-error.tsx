"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 24px",
            background: "#F8F9FC",
            color: "#0B1437",
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>AgentMap AI is unavailable</h2>
          <p style={{ marginTop: 8, fontSize: 14, color: "#4A5170", maxWidth: 420 }}>
            A critical error occurred. Please reload — if it persists, the team
            has been notified via server logs.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "10px 22px",
              borderRadius: 12,
              border: "none",
              background: "#1B4FCC",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
