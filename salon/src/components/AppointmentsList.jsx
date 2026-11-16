import { useEffect, useState } from "react";
import { getAppointments } from "../api/appointments";

export default function AppointmentsList() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadAppointments() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAppointments();
      setAppointments(data);
    } catch (err) {
      setError(err.message || "Ошибка при получении записей");
    } finally {
      setLoading(false);
    }
  }

  // Хук useEffect выполняет загрузку данных при первом рендере (Слайд 29)
  useEffect(() => {
    loadAppointments();
  }, []);

  // Функция для обработки обновления данных (Слайд 29)
  const handleRefresh = () => {
    loadAppointments();
  };

  if (loading) {
    return <div style={{ padding: "20px", color: "#666" }}>Загрузка записей...</div>;
  }

  // Условный рендеринг при ошибке (Слайд 30)
  if (error) {
    return (
      <div style={{ color: "red", padding: "20px" }}>
        <div>Ошибка: {error}</div>
        <button
          onClick={handleRefresh}
          style={{
            marginTop: "10px",
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  // Рендеринг карточек записей (Слайд 31)
  return (
    <div style={{ display: "grid", gap: "15px", marginTop: "15px" }}>
      {appointments.map((a) => (
        <div
          key={a.appointment_id}
          style={{
            border: "1px solid #dee2e6",
            padding: "20px",
            borderRadius: "8px",
            backgroundColor: "white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ marginBottom: "10px" }}>
            <strong style={{ color: "#495057" }}>service_id:</strong>
            <span style={{ marginLeft: "8px", color: "#007bff" }}>{a.service_id}</span>
            {a.service_name && <span style={{ marginLeft: "8px", color: "#333" }}>({a.service_name})</span>}
          </div>
          <div style={{ marginBottom: "10px" }}>
            <strong style={{ color: "#495057" }}>Время:</strong>
            <span style={{ marginLeft: "8px", color: "black" }}>
              {a.appointment_date ? String(a.appointment_date).slice(0, 10) : ""} {a.appointment_time || ""}
            </span>
          </div>
          <div>
            <strong style={{ color: "#495057" }}>Статус:</strong>
            <span
              style={{
                marginLeft: "8px",
                padding: "4px 8px",
                borderRadius: "4px",
                backgroundColor: a.status === "completed" ? "#d4edda" : "#f8d7da",
                color: a.status === "completed" ? "#155724" : "#721c24",
              }}
            >
              {a.status || "не указан"}
            </span>
          </div>
          {a.notes && (
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#666" }}>
              <b>Заметки:</b> {a.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
