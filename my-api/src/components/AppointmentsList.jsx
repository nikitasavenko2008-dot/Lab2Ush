import { useEffect, useState } from "react";
import { getAppointments } from "../api/appointments";

const statusLabels = {
  completed: "Завершено",
  scheduled: "Запланировано",
  cancelled: "Отменено",
};

const statusStyles = {
  completed: { bg: "#d4edda", color: "#155724" },
  scheduled: { bg: "#dbeafe", color: "#1e40af" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

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

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleRefresh = () => {
    loadAppointments();
  };

  if (loading) {
    return <div style={{ padding: "20px", color: "#666" }}>Загрузка записей...</div>;
  }

  if (error) {
    const errorText = error.includes("Bad Gateway") || error.includes("Failed to fetch") || error.includes("502") ? "Сервер выключен" : error;
    return (
      <div style={{ color: "red", padding: "20px" }}>
        <div>Ошибка: {errorText}</div>
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

  const grouped = appointments.reduce((acc, a) => {
    const day = a.appointment_date ? String(a.appointment_date).slice(0, 10) : "Без даты";
    if (!acc[day]) acc[day] = [];
    acc[day].push(a);
    return acc;
  }, {});

  return (
    <div style={{ display: "grid", gap: "15px", marginTop: "15px" }}>
      {Object.entries(grouped).map(([day, items]) => {
        const first = items[0];
        const dayTotal = items.reduce((sum, i) => sum + (Number(i.paid_amount) || Number(i.price) || 0), 0);
        const groupStatus = items.some((i) => i.status === "scheduled") ? "scheduled" : first.status;

        return (
          <div
            key={day}
            className="appointment-card"
            style={{
              border: "1px solid #dee2e6",
              padding: "20px",
              borderRadius: "8px",
              backgroundColor: "white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
              }}
            >
              <div>
                <strong style={{ fontSize: "16px" }}>📅 Дата: {day}</strong>
                {first.appointment_time && (
                  <span style={{ marginLeft: "10px", color: "#6b7280" }}>
                    ⏱ {first.appointment_time}
                  </span>
                )}
              </div>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  backgroundColor: statusStyles[groupStatus]?.bg || "#e5e7eb",
                  color: statusStyles[groupStatus]?.color || "#374151",
                }}
              >
                {statusLabels[groupStatus] || groupStatus || "Не указан"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#6b7280" }}>
                {items.length > 1 ? `Услуги на этот день (${items.length}):` : "Услуга:"}
              </div>
              {items.map((item, idx) => (
                <div
                  key={item.appointment_id || idx}
                  className="appointment-item"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: "bold", color: "#2563eb" }}>
                      {item.service_name || `Услуга #${item.service_id}`}
                    </span>
                    {item.notes && item.notes !== item.service_name && (
                      <span style={{ marginLeft: "8px", fontSize: "12px", color: "#6b7280" }}>
                        ({item.notes})
                      </span>
                    )}
                  </div>
                  {(item.paid_amount || item.price) && (
                    <span style={{ fontWeight: "bold", color: "#059669" }}>
                      {item.paid_amount || item.price} ₽
                    </span>
                  )}
                </div>
              ))}
            </div>

            {dayTotal > 0 && (
              <div
                style={{
                  marginTop: "14px",
                  paddingTop: "10px",
                  borderTop: "1px solid #eee",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#6b7280" }}>
                  {items.length > 1 ? `Всего услуг: ${items.length}` : ""}
                </span>
                <span style={{ fontWeight: "bold", fontSize: "15px" }}>
                  Итого к оплате: <span style={{ color: "#059669" }}>{dayTotal} ₽</span>
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
