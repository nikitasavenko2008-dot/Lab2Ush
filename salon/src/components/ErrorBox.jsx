import "./ErrorBox.css";

export default function ErrorBox({ message }) {
  if (!message) return null;
  return <div className="error-box">Ошибка: {message}</div>;
}
