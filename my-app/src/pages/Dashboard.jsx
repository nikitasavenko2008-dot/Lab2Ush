
import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { apiGet, apiPut } from "../api";
import { formatDuration, formatPrice, validatePhoneNumber } from "../utils";
import Loader from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import "./Dashboard.css";

export default function Dashboard() {
  const { auth, logout, updateUser } = useShop();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("orders");

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);

  const [profileForm, setProfileForm] = useState({
    name: auth.user?.name || "",
    email: auth.user?.email || "",
    phone: auth.user?.phone || "",
    address: auth.user?.address || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (auth.user) {
      setProfileForm({
        name: auth.user.name || "",
        email: auth.user.email || "",
        phone: auth.user.phone || "",
        address: auth.user.address || "",
      });
    }
  }, [auth.user]);

  const loadOrders = useCallback(async () => {
    if (!auth.token) return;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const data = await apiGet("/api/orders/my", auth.token);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setOrdersError(err.message || "Ошибка загрузки истории заказов");
    } finally {
      setOrdersLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    if (auth.token) {
      loadOrders();
    }
  }, [auth.token, loadOrders]);

  if (!auth.token) {
    return (
      <div className="dash-empty-container">
        <div className="dash-empty-card">
          <span className="empty-dash-icon">🔒</span>
          <h2>Вход в личный кабинет</h2>
          <p>Для доступа к истории заказов и профилю необходимо войти в систему.</p>
          <button className="primary-btn" onClick={() => navigate("/login")}>
            Перейти к авторизации
          </button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!profileForm.name.trim()) {
      setProfileError("Укажите ваше полное имя (ФИО)");
      return;
    }
    if (profileForm.name.trim().length < 2) {
      setProfileError("Имя должно содержать не менее 2 символов");
      return;
    }

    if (!profileForm.email.trim()) {
      setProfileError("Укажите адрес электронной почты");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileForm.email.trim())) {
      setProfileError("Введите корректный адрес электронной почты (например ivan@mail.ru)");
      return;
    }

    const phoneErr = validatePhoneNumber(profileForm.phone);
    if (phoneErr) {
      setProfileError(phoneErr);
      return;
    }

    if (!profileForm.address.trim()) {
      setProfileError("Укажите адрес доставки / выезда по умолчанию");
      return;
    }
    if (profileForm.address.trim().length < 5) {
      setProfileError("Адрес должен содержать не менее 5 символов");
      return;
    }

    setProfileSaving(true);
    try {
      const res = await apiPut("/api/auth/profile", profileForm, auth.token);
      updateUser(res.user, res.token);
      setProfileSuccess("Ваши личные данные успешно обновлены в базе данных!");
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch (err) {
      setProfileError(err.message || "Ошибка сохранения профиля");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordForm.current_password.trim()) {
      setPasswordError("Введите ваш текущий пароль");
      return;
    }
    if (!passwordForm.new_password.trim()) {
      setPasswordError("Введите новый пароль");
      return;
    }

    if (passwordForm.new_password.length < 5) {
      setPasswordError("Новый пароль должен содержать минимум 5 символов");
      return;
    }

    if (passwordForm.new_password === passwordForm.current_password) {
      setPasswordError("Новый пароль не должен совпадать с текущим");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("Подтверждение пароля не совпадает");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await apiPut(
        "/api/auth/password",
        {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        },
        auth.token
      );
      setPasswordSuccess(res.message || "Пароль успешно изменен!");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch (err) {
      setPasswordError(err.message || "Не удалось изменить пароль");
    } finally {
      setPasswordSaving(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Выполнен":
        return "status-completed";
      case "В обработке":
        return "status-processing";
      case "Подтвержден":
        return "status-confirmed";
      case "Отменен":
        return "status-cancelled";
      default:
        return "status-new";
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-container">

      <div className="dashboard-header-card">
        <div className="user-info-meta">
          <div className="avatar-placeholder">
            {auth.user?.name ? auth.user.name.charAt(0).toUpperCase() : "👤"}
          </div>
          <div>
            <h1 className="user-greeting">{auth.user?.name}</h1>
            <p className="user-contacts-line">
              <span>📧 {auth.user?.email}</span>
              <span>📱 {auth.user?.phone}</span>
              <span className="role-chip">
                {auth.user?.role === "admin" ? "👑 Администратор" : "Клиент"}
              </span>
              {Number(auth.user?.personal_discount_percent) > 0 && (
                <span className="personal-disc-chip">
                  🎟 Ваша персональная скидка: {auth.user.personal_discount_percent}%
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="header-actions">
          {auth.user?.role === "admin" && (
            <Link to="/admin" className="admin-shortcut-btn">
              Панель администратора
            </Link>
          )}
          <button className="logout-action-btn" onClick={logout}>
            Выйти из системы
          </button>
        </div>
      </div>

      <div className="dash-nav-tabs">
        <button
          className={`dash-tab-btn ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          📦 Мои заказы ({orders.length})
        </button>
        <button
          className={`dash-tab-btn ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          👤 Личные данные
        </button>
        <button
          className={`dash-tab-btn ${activeTab === "password" ? "active" : ""}`}
          onClick={() => setActiveTab("password")}
        >
          🔐 Безопасность и пароль
        </button>
      </div>

      {activeTab === "orders" && (
        <div className="tab-pane-content">
          {ordersLoading && <Loader text="Загрузка истории ваших заказов..." />}
          {ordersError && <ErrorBox message={ordersError} />}

          {!ordersLoading && !ordersError && orders.length === 0 && (
            <div className="no-orders-box">
              <span className="no-orders-emoji">🍽️</span>
              <h3>У вас пока нет оформленных заказов</h3>
              <p>Оформите выездное ресторанное обслуживание в нашем каталоге.</p>
              <Link to="/" className="primary-btn">
                Перейти в каталог услуг
              </Link>
            </div>
          )}

          {!ordersLoading && !ordersError && orders.length > 0 && (
            <div className="orders-cards-list">
              {orders.map((order) => (
                <div key={order.order_id} className="order-block-card">

                  <div className="order-block-header">
                    <div className="order-id-date">
                      <span className="order-num-badge">Заказ №{order.order_id}</span>
                      <span className="order-date-text">
                        📅 <strong>{formatDate(order.delivery_date)}</strong> в {order.delivery_time}
                      </span>
                    </div>

                    <div className="order-status-wrapper">
                      <span className={`status-badge ${getStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="order-block-details">
                    <div className="order-detail-item">
                      <span className="detail-label">Адрес выезда / проведения:</span>
                      <span className="detail-value">📍 {order.delivery_address}</span>
                    </div>
                    {order.coupon_code && (
                      <div className="order-detail-item">
                        <span className="detail-label">Примененный промокод:</span>
                        <span className="detail-value" style={{ color: "#16a34a", fontWeight: "bold" }}>
                          🎟 {order.coupon_code} (-{order.coupon_discount_percent}%)
                        </span>
                      </div>
                    )}
                    {Number(order.personal_discount_percent) > 0 && (
                      <div className="order-detail-item">
                        <span className="detail-label">Личная скидка клиента:</span>
                        <span className="detail-value" style={{ color: "#2563eb", fontWeight: "bold" }}>
                          👤 -{order.personal_discount_percent}%
                        </span>
                      </div>
                    )}
                    {order.notes && (
                      <div className="order-detail-item">
                        <span className="detail-label">Пожелания / Заметки:</span>
                        <span className="detail-value">{order.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="order-services-table">
                    <div className="services-table-header">
                      <span>Услуга</span>
                      <span>Категория</span>
                      <span>Кол-во</span>
                      <span>Стоимость</span>
                    </div>

                    <div className="services-table-body">
                      {order.items?.map((item) => (
                        <div key={item.order_item_id} className="service-row-item">
                          <div className="service-name-cell">
                            <img
                              src={item.image || "https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=80"}
                              alt={item.service_name}
                              className="service-row-thumb"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=80";
                              }}
                            />
                            <div>
                              <strong>{item.service_name}</strong>
                              <small>⏱ {formatDuration(item.duration)}</small>
                            </div>
                          </div>

                          <div className="service-cat-cell">
                            <span className="cat-chip">{item.category_name || "Без категории"}</span>
                          </div>

                          <div className="service-qty-cell">{item.quantity} шт.</div>

                          <div className="service-price-cell">
                            {formatPrice(Number(item.price) * Number(item.quantity))} ₽
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="order-block-footer">
                    <span className="footer-order-created">
                      Оформлен: {order.created_at ? new Date(order.created_at).toLocaleString("ru-RU") : "Недавно"}
                    </span>
                    <div className="order-total-sum">
                      {Number(order.subtotal_amount) > Number(order.total_amount) && (
                        <span style={{ fontSize: "0.85rem", color: "#64748b", marginRight: "8px" }}>
                          Без скидки: <s>{formatPrice(order.subtotal_amount)} ₽</s>
                        </span>
                      )}
                      <span>Итого к оплате:</span>
                      <strong>{formatPrice(order.total_amount)} ₽</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "profile" && (
        <div className="tab-pane-content">
          <div className="profile-edit-card">
            <h3>Редактирование профиля</h3>
            <p className="card-hint">
              Все изменения контактных данных сохраняются в базе данных через серверный API.
            </p>

            {profileError && <ErrorBox message={profileError} />}
            {profileSuccess && <div className="success-banner">{profileSuccess}</div>}

            <form onSubmit={handleSaveProfile} className="profile-form">
              <div className="form-group">
                <label>ФИО / Полное имя <span className="req">*</span></label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                />
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label>Email <span className="req">*</span></label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Телефон <span className="req">*</span></label>
                  <input
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Адрес проведения мероприятий по умолчанию</label>
                <input
                  type="text"
                  placeholder="г. Москва, ул. Ленина, д. 10"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                />
              </div>

              <button type="submit" className="save-btn" disabled={profileSaving}>
                {profileSaving ? "Сохранение в БД..." : "Сохранить изменения"}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "password" && (
        <div className="tab-pane-content">
          <div className="profile-edit-card">
            <h3>Изменение пароля</h3>
            <p className="card-hint">
              Для безопасности введите ваш текущий пароль и укажите новый (не менее 5 символов).
            </p>

            {passwordError && <ErrorBox message={passwordError} />}
            {passwordSuccess && <div className="success-banner">{passwordSuccess}</div>}

            <form onSubmit={handleSavePassword} className="profile-form">
              <div className="form-group">
                <label>Текущий пароль <span className="req">*</span></label>
                <input
                  type="password"
                  required
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                />
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label>Новый пароль <span className="req">*</span></label>
                  <input
                    type="password"
                    required
                    placeholder="Минимум 5 символов"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Повторите новый пароль <span className="req">*</span></label>
                  <input
                    type="password"
                    required
                    placeholder="Повтор нового пароля"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="save-btn" disabled={passwordSaving}>
                {passwordSaving ? "Обновление пароля..." : "Изменить пароль"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
