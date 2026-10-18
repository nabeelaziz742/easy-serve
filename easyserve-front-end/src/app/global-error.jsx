"use client";

// Last-resort boundary for errors in the root layout itself. It replaces the
// whole document, so it cannot rely on globals.css or providers.
export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F7F7F4", color: "#063B2E" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 420, width: "100%", background: "#fff", border: "1px solid #e4e4e7", borderRadius: 12, padding: 24, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,.06)" }}>
            <h1 style={{ fontSize: 18, margin: "0 0 6px" }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#71717a", margin: "0 0 18px" }}>Easy Serve could not load. Please try again.</p>
            <button
              type="button"
              onClick={() => reset()}
              style={{ background: "#063B2E", color: "#FACC15", border: 0, borderRadius: 8, padding: "9px 18px", fontWeight: 700, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
