/**
 * Главный корневой компонент React-приложения «Royal Catering»
 * Лабораторная работа №4 — Студент: Никита Савенко
 * 
 * Маршрутизация приложения:
 * - / : Каталог услуг с фильтрацией и отзывами
 * - /cart : Серверная корзина и оформление заказа с валидацией даты
 * - /login : Форма авторизации и восстановления пароля
 * - /register : Форма регистрации нового клиента с валидацией
 * - /dashboard : Личный кабинет (мои заказы в едином блоке, профиль, пароль)
 * - /admin : Панель управления администратора (услуги, категории, заказы, отзывы, пользователи)
 */
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Catalog from "./pages/Catalog";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
