import { useShop } from "../context/ShopContext";
import { apiPost, apiGet } from "../api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import "./Cart.css";

export default function Cart() {
  const { cart, removeFromCart, clearCart, auth } = useShop();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutResult, setCheckoutResult] = useState(null);

  const total = cart.reduce(
    (s, i) => s + i.price * i.qty,
    0
  );

  async function handleCheckout() {
    if (!auth.token) {
      navigate("/login");
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError("");
    setCheckoutResult(null);
    try {
      const data = await apiPost(
        "/api/appointments",
        { items: cart },
        auth.token
      );
      setCheckoutResult(data);
      clearCart();
    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="cart-page">
      <h1>Корзина</h1>

      {cart.length === 0 && !checkoutResult && (
        <p>Корзина пуста</p>
      )}

      {cart.length > 0 && (
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.id} className="cart-row">
              <span className="cart-name">{item.name}</span>
              <span className="cart-detail">
                {item.price} ₽ x {item.qty}
                {item.discount_percent > 0 && (
                  <span className="discount-badge">
                    -{item.discount_percent}%
                  </span>
                )}
              </span>
              <span className="cart-subtotal">
                {item.price * item.qty} ₽
              </span>
              <button
                className="remove-btn"
                onClick={() => removeFromCart(item.id)}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="cart-total">
            Итого: {total} ₽
          </div>
          <button className="checkout-btn" onClick={handleCheckout}>
            {checkoutLoading ? "Оформляю..." : "Оформить запись"}
          </button>
        </div>
      )}

      {checkoutError && <ErrorBox message={checkoutError} />}

      {checkoutResult && (
        <div className="checkout-success">
          <p>✅ Записей оформлено: {checkoutResult.appointments.length}</p>
          <p>Сумма: {checkoutResult.total} ₽</p>
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            Перейти в кабинет
          </button>
        </div>
      )}
    </div>
  );
}
