import { NavLink } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import "./Navbar.css";

export default function Navbar() {
  const { auth, cart, logout, isDark, toggleTheme } = useShop();

  const cartCount = cart.reduce((sum, item) => sum + (item.qty || 1), 0);

  return (
    <nav className="navbar">
      <div className="nav-brand">✨ Салон красоты</div>
      <div className="nav-links">
        <NavLink to="/">Каталог</NavLink>
        <NavLink to="/cart">
          Корзина {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
        </NavLink>
        <NavLink to="/dashboard">Личный кабинет</NavLink>
        {auth.user?.role === "admin" && (
          <NavLink to="/admin" className="admin-link">👑 Админка</NavLink>
        )}
      </div>
      <div className="nav-user">
        {auth.user ? (
          <>
            <span>👤 {auth.user.name}</span>
            <button className="logout-btn" onClick={logout}>Выйти</button>
          </>
        ) : (
          <NavLink to="/login" className="login-link">Войти</NavLink>
        )}

        {/* Кнопка смены темы */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={isDark ? "Светлая тема" : "Тёмная тема"}
        >
          {isDark ? "☀️" : "🌙"}
        </button>
      </div>
    </nav>
  );
}
