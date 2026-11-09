import { useShop } from "../context/ShopContext";
import "./Cart.css";

export default function Cart() {
  const { cart, removeFromCart } = useShop();

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <h1>Корзина</h1>
        <p>Корзина пуста</p>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Корзина</h1>
      <div className="cart-items">
        {cart.map((item) => (
          <div key={item.id} className="cart-item">
            <span className="cart-item-name">{item.name}</span>
            <span className="cart-item-price">
              {item.price} ₽ x {item.qty}
            </span>
            <button
              className="remove-btn"
              onClick={() => removeFromCart(item.id)}
            >
              Удалить
            </button>
          </div>
        ))}
      </div>
      <div className="cart-total">
        <strong>Итого: {total} ₽</strong>
      </div>
    </div>
  );
}
