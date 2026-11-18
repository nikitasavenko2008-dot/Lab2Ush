export default function ErrorBox({ message }) {
  if (!message) return null;
  const msgStr = typeof message === "string" ? message : (message?.message || String(message));
  const isServerDown =
    msgStr.includes("Bad Gateway") ||
    msgStr.includes("Failed to fetch") ||
    msgStr.includes("NetworkError") ||
    msgStr.includes("ECONNREFUSED") ||
    msgStr.includes("502") ||
    msgStr.includes("503") ||
    msgStr.includes("504") ||
    msgStr.includes("Сервер выключен") ||
    msgStr.includes("Load failed");

  const text = isServerDown ? "Сервер выключен" : msgStr;

  return (
    <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: "6px", margin: "10px 0", fontWeight: 500 }}>
      Ошибка: {text}
    </div>
  );
}
