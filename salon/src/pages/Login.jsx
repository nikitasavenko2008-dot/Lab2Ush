import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../api";
import { useShop } from "../context/ShopContext";
import ErrorBox from "../components/ErrorBox";
import Loader from "../components/Loader";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useShop();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Введите email");
      return;
    }
    if (!password.trim()) {
      setError("Введите пароль");
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost("/api/auth/login", { email, password });
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Вход</h1>
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
          />
          <label>Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ваш пароль"
          />
          {error && <ErrorBox message={error} />}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Вхожу..." : "Войти"}
          </button>
        </form>
        <p className="hint">
          admin@salon.ru / admin — администратор
        </p>
        <p className="hint">
          ivan@mail.ru / client — клиент
        </p>
      </div>
    </div>
  );
}
