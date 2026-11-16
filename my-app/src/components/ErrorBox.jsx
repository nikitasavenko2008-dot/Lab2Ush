export default function ErrorBox({ message }) {
  if (!message) return null;
  const isServerDown =
    message === "Bad Gateway" ||
    message.includes("Bad Gateway") ||
    message.includes("Failed to fetch") ||
    message.includes("502");

  const text = isServerDown ? "Сервер выключен" : message;

  return (
    <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: "6px", margin: "10px 0" }}>
      Ошибка: {text}
    </div>
  );
}
