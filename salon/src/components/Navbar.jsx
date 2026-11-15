import { NavLink } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import "./Navbar.css";

export default function Navbar() {
  const { isDark, toggleTheme, auth } = useShop();

  const linkClass = ({ isActive }) =>
    `nav-link${isActive ? " active" : ""}`;

  return (
    <nav className="navbar">
      <div className="nav-links">
        <NavLink to="/" className={linkClass}>Каталог</NavLink>
        <NavLink to="/cart" className={linkClass}>Корзина</NavLink>
        <NavLink to="/dashboard" className={linkClass}>Кабинет</NavLink>
        {auth.user?.role === "admin" && (
          <NavLink to="/admin" className={linkClass}>Админка</NavLink>
        )}
      </div>
      <div className="nav-right">
        {auth.user ? (
          <span className="nav-user">
            👤 {auth.user.name}
          </span>
        ) : (
          <NavLink to="/login" className="nav-login">Войти</NavLink>
        )}
        <button className="theme-btn" onClick={toggleTheme}>
          {isDark ? "☀️" : "🌙"}
        </button>
      </div>
    </nav>
  );
}
