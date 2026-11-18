/**
 * Монитор серверного API «Royal Catering»
 * Лабораторная работа №4 — Студент: Никита Савенко
 */
import { useState, useEffect } from "react";

export default function App() {
  const [activeTab, setActiveTab] = useState("services");
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [svcRes, catRes, statRes] = await Promise.all([
        fetch("/api/services").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()),
        fetch("/api/test").then((r) => r.json()),
      ]);
      setServices(Array.isArray(svcRes) ? svcRes : []);
      setCategories(Array.isArray(catRes) ? catRes : []);
      setApiStatus(statRes);
    } catch (err) {
      setError(
        err.message?.includes("fetch") || err.message?.includes("Gateway")
          ? "Сервер выключен"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: "15px", marginBottom: "20px" }}>
        <h1 style={{ margin: "0 0 10px 0", color: "#1e3a8a" }}>🍽️ Royal Catering — Backend API Monitor</h1>
        <p style={{ margin: 0, color: "#64748b" }}>
          Мониторинг серверных эндпоинтов, PostgreSQL / SQLite и базы данных
        </p>

        <nav style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          <button
            onClick={() => setActiveTab("services")}
            style={{
              padding: "8px 16px",
              background: activeTab === "services" ? "#2563eb" : "#f1f5f9",
              color: activeTab === "services" ? "white" : "#334155",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Услуги ({services.length})
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            style={{
              padding: "8px 16px",
              background: activeTab === "categories" ? "#2563eb" : "#f1f5f9",
              color: activeTab === "categories" ? "white" : "#334155",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Категории ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab("status")}
            style={{
              padding: "8px 16px",
              background: activeTab === "status" ? "#2563eb" : "#f1f5f9",
              color: activeTab === "status" ? "white" : "#334155",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Статус сервера
          </button>
          <button
            onClick={loadData}
            style={{
              marginLeft: "auto",
              padding: "8px 16px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ↻ Обновить
          </button>
        </nav>
      </header>

      {loading && <p>Загрузка данных с API...</p>}
      {error && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "12px", borderRadius: "8px" }}>
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      {!loading && !error && activeTab === "services" && (
        <div>
          <h3>Список услуг кейтеринга (подгрузка через SQL JOIN)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "15px" }}>
            {services.map((s) => (
              <div key={s.service_id} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                <img src={s.image} alt={s.name} style={{ width: "100%", height: "140px", objectFit: "cover" }} />
                <div style={{ padding: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: "bold", textTransform: "uppercase" }}>
                    {s.category_name}
                  </span>
                  <h4 style={{ margin: "5px 0" }}>{s.name}</h4>
                  <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#64748b" }}>{s.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                    <span>{Number(s.price).toLocaleString("ru-RU")} ₽</span>
                    <span>⏱ {s.duration} мин</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && activeTab === "categories" && (
        <div>
          <h3>Категории услуг</h3>
          <ul>
            {categories.map((c) => (
              <li key={c.category_id} style={{ padding: "8px 0" }}>
                <strong>{c.name}</strong> (Услуг в категории: {c.services_count || 0})
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && !error && activeTab === "status" && (
        <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <h3>Информация о сервере:</h3>
          <pre>{JSON.stringify(apiStatus, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
