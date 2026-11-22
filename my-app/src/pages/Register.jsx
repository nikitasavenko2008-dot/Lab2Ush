
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiPost } from "../api";
import { useShop } from "../context/ShopContext";
import ErrorBox from "../components/ErrorBox";
import "./Register.css";

export default function Register() {
  const { login } = useShop();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Укажите ваше полное имя (ФИО)");
      return;
    }

    if (!formData.email.trim()) {
      setError("Укажите адрес электронной почты");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError("Введите корректный email адрес (например, ivan@mail.ru)");
      return;
    }

    if (!formData.phone.trim()) {
      setError("Укажите контактный номер телефона");
      return;
    }

    if (!formData.password.trim() || formData.password.length < 5) {
      setError("Пароль должен содержать не менее 5 символов");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Введенные пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost("/api/auth/register", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        password: formData.password.trim(),
      });

      login(res.token, res.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-card-header">
          <h2>Регистрация аккаунта</h2>
          <p>Создайте профиль для удобного заказа ресторанных услуг и банкетов</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-field">
            <label htmlFor="name-input">
              ФИО / Полное имя <span className="req">*</span>
            </label>
            <input
              id="name-input"
              name="name"
              type="text"
              required
              placeholder="Иванов Иван Иванович"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-row-two">
            <div className="form-field">
              <label htmlFor="email-input">
                Email <span className="req">*</span>
              </label>
              <input
                id="email-input"
                name="email"
                type="email"
                required
                placeholder="ivan@mail.ru"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="phone-input">
                Телефон <span className="req">*</span>
              </label>
              <input
                id="phone-input"
                name="phone"
                type="tel"
                required
                placeholder="+7 (999) 123-45-67"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="address-input">Адрес по умолчанию (необязательно)</label>
            <input
              id="address-input"
              name="address"
              type="text"
              placeholder="г. Москва, ул. Ленина, д. 5, кв. 10"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-row-two">
            <div className="form-field">
              <label htmlFor="password-input">
                Пароль <span className="req">*</span>
              </label>
              <input
                id="password-input"
                name="password"
                type="password"
                required
                placeholder="Минимум 5 символов"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="confirmPassword-input">
                Повторите пароль <span className="req">*</span>
              </label>
              <input
                id="confirmPassword-input"
                name="confirmPassword"
                type="password"
                required
                placeholder="Повтор пароля"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && <ErrorBox message={error} />}

          <button type="submit" className="register-submit-btn" disabled={loading}>
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>

        <div className="register-footer-prompt">
          <span>Уже есть учетная запись?</span>
          <Link to="/login" className="switch-auth-link">
            Войти в аккаунт
          </Link>
        </div>
      </div>
    </div>
  );
}
