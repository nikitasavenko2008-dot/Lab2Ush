import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import AppointmentsList from "../components/AppointmentsList";
import "./Dashboard.css";

export default function Dashboard() {
  const { auth, logout } = useShop();
  const navigate = useNavigate();

  if (!auth.token) {
    return (
      <div className="dash-empty">
        <p>Нужно войти в систему</p>
        <button onClick={() => navigate("/login")}>Войти</button>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <div className="dash-header">
        <h1>Личный кабинет</h1>
        <div className="dash-user">
          👤 <b>{auth.user.name}</b> ({auth.user.email}) — {auth.user.role === "admin" ? "Администратор" : "Клиент"}
          <button className="logout-btn" onClick={() => { logout(); navigate("/"); }}>
            Выйти
          </button>
        </div>
      </div>

      {auth.user.coupon_code && (
        <div className="dash-coupon">
          🎟 Ваш персональный купон: <b>{auth.user.coupon_code}</b> (скидка {auth.user.coupon_percent}%)
        </div>
      )}

      <h2>Мои записи (Appointments)</h2>
      <AppointmentsList />
    </div>
  );
}
