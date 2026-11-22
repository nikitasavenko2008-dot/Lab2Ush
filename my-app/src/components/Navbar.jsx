/**
 * Компонент шапки сайта (Навигационная панель)
 * Реализует навигацию по разделам, отображение бейджа корзины,
 * статус авторизации пользователя, кнопку выхода и переключатель темы.
 */
import { NavLink } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import "./Navbar.css";

export default function Navbar() {
  const { auth, cartCount, logout, isDark, toggleTheme } = useShop();

  const isAdmin = auth.user?.role === "admin";

  return (
    <header className="navbar-header">
      <nav className="navbar">
        <NavLink to="/" className="nav-brand">
          <span className="brand-icon">🍽️</span>
          <span className="brand-text">
            <strong>Royal Catering</strong>
            <small>Ресторанный сервис</small>
          </span>
        </NavLink>

        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Каталог
          </NavLink>

          {!isAdmin && (
            <NavLink to="/cart" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Корзина
              {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
            </NavLink>
          )}

          {auth.user && (
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Личный кабинет
            </NavLink>
          )}

          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? "nav-link admin-nav-link active" : "nav-link admin-nav-link")}>
              👑 Управление
            </NavLink>
          )}
        </div>

        <div className="nav-user">
          {auth.user ? (
            <div className="user-profile-badge">
              <span className="user-name" title={auth.user.email}>
                👤 {auth.user.name.split(" ")[0]}
                {isAdmin && <span className="admin-chip">Админ</span>}
              </span>
              <button className="logout-btn" onClick={logout} title="Выйти из системы">
                🚪 Выйти
              </button>
            </div>
          ) : (
            <div className="auth-nav-buttons">
              <NavLink to="/login" className="login-link">
                Войти
              </NavLink>
              <NavLink to="/register" className="register-link">
                Регистрация
              </NavLink>
            </div>
          )}

          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>
      </nav>
    </header>
  );
}
