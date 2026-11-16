import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../api";
import { useShop } from "../context/ShopContext";
import ErrorBox from "../components/ErrorBox";
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
      setError("Заполните поле email");
      return;
    }
    if (!email.includes("@")) {
      setError("Некорректный email адрес");
      return;
    }
    if (!password.trim()) {
      setError("Заполните поле пароль");
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost("/api/auth/login", { email, password });
      login(data.token, data.user);
      if (data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Вход в систему</h1>
        <form onSubmit={handleSubmit}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            placeholder="admin@salon.ru или ivan@mail.ru"
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Пароль:</label>
          <input
            type="password"
            value={password}
            placeholder="admin или client"
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <ErrorBox message={error} />}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <div className="login-hints">
          <p>👑 <b>admin@salon.ru</b> / пароль: <b>admin</b> (Администратор)</p>
          <p>👤 <b>ivan@mail.ru</b> / пароль: <b>client</b> (Клиент, купон 10%)</p>
        </div>
      </div>
    </div>
  );
}
