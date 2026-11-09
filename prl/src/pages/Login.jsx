import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import "./Login.css";

export default function Login() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { addToCart } = useShop();

  function handleSubmit(e) {
    e.preventDefault();
    addToCart({ id: 99, name: "Подарок за вход", price: 0 });
    navigate("/dashboard");
  }

  return (
    <div className="login-page">
      <h1>Вход</h1>
      <form className="login-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Логин"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="login-btn">
          Войти
        </button>
      </form>
    </div>
  );
}
