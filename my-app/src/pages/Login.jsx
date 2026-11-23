import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiPost } from "../api";
import { useShop } from "../context/ShopContext";
import ErrorBox from "../components/ErrorBox";
import "./Login.css";

export default function Login() {
  const { login } = useShop();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  async function handleSubmitLogin(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Заполните поле Email");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Некорректный формат адреса электронной почты");
      return;
    }
    if (!password.trim()) {
      setError("Заполните поле Пароль");
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost("/api/auth/login", {
        email: email.trim(),
        password: password.trim(),
      });
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

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setForgotSuccess("");

    if (!forgotEmail.trim()) {
      setError("Введите email для сброса пароля");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail.trim())) {
      setError("Некорректный формат адреса электронной почты");
      return;
    }
    if (!newPassword.trim() || newPassword.length < 5) {
      setError("Новый пароль должен содержать минимум 5 символов");
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost("/api/auth/reset-password", {
        email: forgotEmail.trim(),
        new_password: newPassword.trim(),
      });
      setForgotSuccess(res.message || "Пароль успешно сброшен!");
      setEmail(forgotEmail);
      setPassword("");
      setTimeout(() => {
        setMode("login");
        setForgotSuccess("");
        setNewPassword("");
      }, 1500);
    } catch (err) {
      setError(err.message || "Ошибка сброса пароля");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {mode === "login" ? (
          <>
            <div className="login-card-header">
              <h2>Вход в личный кабинет</h2>
              <p>Управляйте заказами кейтеринга и бронированиями</p>
            </div>

            <form onSubmit={handleSubmitLogin} className="auth-form">
              <div className="form-field">
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  placeholder="Введите ваш email"
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="form-field">
                <div className="label-with-link">
                  <label>Пароль:</label>
                  <button
                    type="button"
                    className="forgot-link-btn"
                    onClick={() => {
                      setMode("forgot");
                      setForgotEmail(email);
                      setError("");
                      setForgotSuccess("");
                    }}
                  >
                    Забыли пароль?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  placeholder="Введите ваш пароль"
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error && <ErrorBox message={error} />}

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? "Авторизация..." : "Войти"}
              </button>
            </form>

            <div className="auth-footer-prompt">
              <span>Еще нет аккаунта?</span>
              <Link to="/register" className="switch-auth-link">
                Зарегистрироваться
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="login-card-header">
              <h2>Восстановление пароля</h2>
              <p>Забыли пароль от личного кабинета?</p>
            </div>

            <div className="forgot-support-card">
              <span className="support-icon">📧</span>
              <h3>Служба поддержки</h3>
              <p className="support-instruction">
                Напишите на почту <strong>nikitasavenko2008@gmail.com</strong> и мы вам сбросим пароль.
              </p>
              <a
                href="mailto:nikitasavenko2008@gmail.com?subject=Восстановление пароля в Royal Catering"
                className="support-email-pill"
              >
                ✉️ nikitasavenko2008@gmail.com
              </a>
            </div>

            <div className="forgot-divider">
              <span>или сбросьте самостоятельно</span>
            </div>

            <form onSubmit={handleResetPassword} className="auth-form">
              <div className="form-field">
                <label>Email вашего аккаунта:</label>
                <input
                  type="email"
                  value={forgotEmail}
                  placeholder="ivan@mail.ru"
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label>Новый пароль:</label>
                <input
                  type="password"
                  value={newPassword}
                  placeholder="Минимум 5 символов"
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              {error && <ErrorBox message={error} />}
              {forgotSuccess && <div className="forgot-success-box">{forgotSuccess}</div>}

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? "Сохранение..." : "Сбросить пароль"}
              </button>
            </form>

            <div className="auth-footer-prompt">
              <button
                type="button"
                className="back-to-login-btn"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setForgotSuccess("");
                }}
              >
                ← Вернуться к форме входа
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
