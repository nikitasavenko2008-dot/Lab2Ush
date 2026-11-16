export default function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: "6px", margin: "10px 0" }}>
      Ошибка: {message}
    </div>
  );
}
