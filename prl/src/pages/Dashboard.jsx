import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <h1>Личный кабинет</h1>
      <p>Вы успешно вошли!</p>
      <button className="back-btn" onClick={() => navigate("/")}>
        Вернуться в каталог
      </button>
    </div>
  );
}
