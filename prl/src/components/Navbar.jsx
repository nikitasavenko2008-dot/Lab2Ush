import { NavLink } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import "./Navbar.css";

export default function Navbar() {
  const { isDark, toggleTheme } = useShop();

  return (
    <nav className="navbar">
      <div className="navbar-links">
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
        >
          Каталог
        </NavLink>
        <NavLink
          to="/cart"
          className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
        >
          Корзина
        </NavLink>
        <NavLink
          to="/login"
          className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
        >
          Вход
        </NavLink>
      </div>
      <button className="theme-btn" onClick={toggleTheme}>
        {isDark ? "Светлая тема" : "Тёмная тема"}
      </button>
    </nav>
  );
}
