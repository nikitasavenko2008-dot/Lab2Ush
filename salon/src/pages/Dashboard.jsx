import { useEffect, useState } from "react";
import { useShop } from "../context/ShopContext";
import { apiGet } from "../api";
import Loader from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const { auth, logout } = useShop();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.token) {
      navigate("/login");
      return;
    }
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet("/api/appointments", auth.token);
        setAppointments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [auth.token]);

  return (
    <div className="dashboard">
      <div className="dash-header">
        <h1>Личный кабинет</h1>
        <div className="dash-user">
          <span>👤 {auth.user?.name} ({auth.user?.email})</span>
          <button className="logout-btn" onClick={() => {
            logout();
            navigate("/");
          }}>
            Выйти
          </button>
        </div>
      </div>

      {auth.user?.coupon_code && (
        <div className="coupon-card">
          🎟 Ваш купон: <strong>{auth.user.coupon_code}</strong> —{" "}
          скидка {auth.user.coupon_percent}%
        </div>
      )}

      <h2>Мои записи</h2>

      {loading && <Loader />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && appointments.length === 0 && (
        <p>У вас пока нет записей</p>
      )}

      {!loading && !error && appointments.length > 0 && (
        <div className="appt-list">
          {appointments.map((a) => (
            <div key={a.id} className="appt-row">
              <span className="appt-service">{a.service_name}</span>
              <span className="appt-date">{a.date_time}</span>
              <span className="appt-price">
                {a.paid_amount} ₽
                {a.discount_percent > 0 && (
                  <span className="appt-disc">
                    {" "}(скидка {a.discount_percent}%)
                  </span>
                )}
              </span>
              <span className={`appt-status ${a.status}`}>
                {a.status === "pending" ? "ожидает" : a.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
