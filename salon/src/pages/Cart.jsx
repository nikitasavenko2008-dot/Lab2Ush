import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { apiPost } from "../api";
import Loader from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import "./Cart.css";

export default function Cart() {
  const { cart, removeFromCart, clearCart, auth } = useShop();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.user?.role === "admin") {
      navigate("/admin");
    }
  }, [auth, navigate]);

  const [date, setDate] = useState("2024-02-01");
  const [time, setTime] = useState("14:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const couponPercent = Number(auth.user?.coupon_percent) || 0;

  const total = cart.reduce((sum, item) => {
    const withDisc = item.price * (1 - (item.discount_percent || 0) / 100);
    const withCoupon = Math.round(withDisc * (1 - couponPercent / 100));
    return sum + withCoupon * (item.qty || 1);
  }, 0);

  async function handleCheckout() {
    if (!auth.token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess(null);
    try {
      const data = await apiPost("/api/appointments", {
        items: cart,
        appointment_date: date,
        appointment_time: time,
        user_id: auth.user.user_id,
        coupon_percent: couponPercent,
      });
      setSuccess(data);
      clearCart();
    } catch (err) {
      setError(err.message || "Ошибка при оформлении записи");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cart-page">
      <h1>Корзина услуг</h1>

      {cart.length === 0 && !success && (
        <p className="empty-text">Ваша корзина пуста</p>
      )}

      {cart.length > 0 && !success && (
        <div className="cart-content">
          <div className="cart-list">
            {cart.map((item) => {
              const unitPrice = Math.round(
                item.price * (1 - (item.discount_percent || 0) / 100) * (1 - couponPercent / 100)
              );
              return (
                <div key={item.service_id} className="cart-item">
                  <div className="item-name">{item.name}</div>
                  <div className="item-detail">
                    {unitPrice} ₽ × {item.qty || 1} шт.
                    {item.discount_percent > 0 && (
                      <span className="badge">-{item.discount_percent}%</span>
                    )}
                  </div>
                  <div className="item-sum">{unitPrice * (item.qty || 1)} ₽</div>
                  <button
                    className="delete-btn"
                    onClick={() => removeFromCart(item.service_id)}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <div className="cart-order-box">
            <div className="date-fields">
              <label>
                Дата визита:
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label>
                Время визита:
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
            </div>

            {couponPercent > 0 && (
              <div className="coupon-info">
                🎟 Применён купон: {auth.user.coupon_code} (-{couponPercent}%)
              </div>
            )}

            <div className="total-row">Итого: {total} ₽</div>

            {loading && <Loader text="Оформление записи..." />}
            {error && <ErrorBox message={error} />}

            <button className="checkout-btn" onClick={handleCheckout} disabled={loading}>
              {loading ? "Отправка..." : "Оформить запись"}
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="success-box">
          <h3>✅ Запись успешно оформлена!</h3>
          <p>Сумма к оплате: {success.total} ₽</p>
          <button className="primary-btn" onClick={() => navigate("/dashboard")}>
            Посмотреть в моих записях
          </button>
        </div>
      )}
    </div>
  );
}
