"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'PingFang SC, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: "#fafafa",
          color: "#111",
          margin: 0,
          padding: "0 24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 500,
              lineHeight: 1.6,
              marginBottom: 8,
            }}
          >
            页面加载遇到了问题
          </p>
          <p
            style={{
              fontSize: 14,
              color: "#6b7280",
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            请尝试刷新页面，或稍后再试。
          </p>
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 44,
              padding: "0 28px",
              borderRadius: 9999,
              border: "none",
              background: "#d2e659",
              color: "#111",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            重新加载
          </button>
        </div>
      </body>
    </html>
  );
}
