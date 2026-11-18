/**
 * Панель управления Администратора (Лаб 4, разд. 3.9)
 * Лабораторная работа №4 — Студент: Никита Савенко
 * 
 * В соответствии с п. 3.9 требований:
 * Администратор может просматривать, добавлять, изменять и удалять абсолютно все ресурсы:
 * - Услуги кейтеринга (CRUD)
 * - Категории (CRUD)
 * - Заказы клиентов (просмотр и смену статусов: Новый, В обработке, Подтвержден, Выполнен, Отменен)
 * - Отзывы клиентов (модерация и удаление)
 * - Пользователи (просмотр, изменение роли user/admin, удаление)
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiPut, apiDelete } from "../api";
import { useShop } from "../context/ShopContext";
import Loader from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import "./Admin.css";

export default function Admin() {
  const { auth } = useShop();
  const navigate = useNavigate();

  // Активная вкладка: "services" | "categories" | "orders" | "reviews" | "users"
  const [activeTab, setActiveTab] = useState("services");

  // Состояние загрузки и общих ошибок
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState("");

  // Ресурсы
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);

  // Форма добавления/редактирования услуги
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    duration: 180,
    price: "",
    category_id: "",
    image: "",
  });

  // Форма категории
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState("");

  // Загрузка всех данных панели администратора
  const loadAdminData = useCallback(async () => {
    if (!auth.token || auth.user?.role !== "admin") {
      navigate("/login");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [svcs, cats, ords, revs, usrs] = await Promise.all([
        apiGet("/api/services"),
        apiGet("/api/categories"),
        apiGet("/api/orders", auth.token),
        apiGet("/api/reviews"),
        apiGet("/api/users", auth.token),
      ]);

      setServices(Array.isArray(svcs) ? svcs : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setOrders(Array.isArray(ords) ? ords : []);
      setReviews(Array.isArray(revs) ? revs : []);
      setUsers(Array.isArray(usrs) ? usrs : []);

      if (cats.length > 0 && !serviceForm.category_id) {
        setServiceForm((prev) => ({ ...prev, category_id: cats[0].category_id }));
      }
    } catch (err) {
      setError(err.message || "Ошибка загрузки панели администратора");
    } finally {
      setLoading(false);
    }
  }, [auth.token, auth.user, navigate, serviceForm.category_id]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Уведомление об успешном действии
  const showSuccess = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  // ==========================================
  // УПРАВЛЕНИЕ УСЛУГАМИ (CRUD)
  // ==========================================

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!serviceForm.name.trim() || !serviceForm.price || !serviceForm.category_id) {
      alert("Заполните название, цену и категорию услуги");
      return;
    }

    try {
      if (editingServiceId) {
        await apiPut(`/api/services/${editingServiceId}`, serviceForm, auth.token);
        showSuccess(`Услуга «${serviceForm.name}» успешно обновлена`);
      } else {
        await apiPost("/api/services", serviceForm, auth.token);
        showSuccess(`Услуга «${serviceForm.name}» успешно добавлена в каталог`);
      }

      setEditingServiceId(null);
      setServiceForm({
        name: "",
        description: "",
        duration: 180,
        price: "",
        category_id: categories[0]?.category_id || "",
        image: "",
      });

      const updated = await apiGet("/api/services");
      setServices(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStartEditService = (s) => {
    setEditingServiceId(s.service_id);
    setServiceForm({
      name: s.name,
      description: s.description || "",
      duration: s.duration || 180,
      price: s.price,
      category_id: s.category_id,
      image: s.image || "",
    });
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  const handleDeleteService = async (serviceId, name) => {
    if (!window.confirm(`Вы уверены, что хотите удалить услугу «${name}»?`)) return;
    try {
      await apiDelete(`/api/services/${serviceId}`, auth.token);
      setServices((prev) => prev.filter((s) => s.service_id !== serviceId));
      showSuccess(`Услуга «${name}» удалена`);
    } catch (err) {
      alert(err.message);
    }
  };

  // ==========================================
  // УПРАВЛЕНИЕ КАТЕГОРИЯМИ (CRUD)
  // ==========================================

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const added = await apiPost("/api/categories", { name: newCatName.trim() }, auth.token);
      setCategories([...categories, added]);
      setNewCatName("");
      showSuccess(`Категория «${added.name}» добавлена`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateCategory = async (catId) => {
    if (!editingCatName.trim()) return;
    try {
      await apiPut(`/api/categories/${catId}`, { name: editingCatName.trim() }, auth.token);
      setCategories(categories.map((c) => (c.category_id === catId ? { ...c, name: editingCatName.trim() } : c)));
      setEditingCatId(null);
      showSuccess("Категория обновлена");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCategory = async (catId, name) => {
    if (!window.confirm(`Удалить категорию «${name}»?`)) return;
    try {
      await apiDelete(`/api/categories/${catId}`, auth.token);
      setCategories(categories.filter((c) => c.category_id !== catId));
      showSuccess(`Категория «${name}» удалена`);
    } catch (err) {
      alert(err.message);
    }
  };

  // ==========================================
  // УПРАВЛЕНИЕ ЗАКАЗАМИ (СМЕНА СТАТУСА)
  // ==========================================

  const handleChangeOrderStatus = async (orderId, newStatus) => {
    try {
      await apiPut(`/api/orders/${orderId}/status`, { status: newStatus }, auth.token);
      setOrders(orders.map((o) => (o.order_id === orderId ? { ...o, status: newStatus } : o)));
      showSuccess(`Статус заказа №${orderId} изменен на «${newStatus}»`);
    } catch (err) {
      alert(err.message);
    }
  };

  // ==========================================
  // УПРАВЛЕНИЕ ОТЗЫВАМИ (МОДЕРАЦИЯ)
  // ==========================================

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Удалить данный отзыв?")) return;
    try {
      await apiDelete(`/api/reviews/${reviewId}`, auth.token);
      setReviews(reviews.filter((r) => r.review_id !== reviewId));
      showSuccess("Отзыв удален");
    } catch (err) {
      alert(err.message);
    }
  };

  // ==========================================
  // УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
  // ==========================================

  const handleChangeUserRole = async (userId, newRoleId) => {
    try {
      await apiPut(`/api/users/${userId}/role`, { role_id: newRoleId }, auth.token);
      setUsers(
        users.map((u) =>
          u.user_id === userId ? { ...u, role: newRoleId === 1 ? "admin" : "user", role_id: newRoleId } : u
        )
      );
      showSuccess("Роль пользователя обновлена");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (userId === auth.user.user_id) {
      alert("Нельзя удалить свой собственный аккаунт");
      return;
    }
    if (!window.confirm(`Удалить пользователя «${name}»? Все его заказы и корзина будут очищены.`)) return;
    try {
      await apiDelete(`/api/users/${userId}`, auth.token);
      setUsers(users.filter((u) => u.user_id !== userId));
      showSuccess(`Пользователь «${name}» удален`);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1>👑 Панель управления администратора</h1>
          <p className="admin-subtitle">
            Полный контроль над каталогом услуг, категориями, заказами клиентов, отзывами и пользователями
          </p>
        </div>
      </div>

      {actionSuccess && <div className="admin-success-alert">✓ {actionSuccess}</div>}
      {error && <ErrorBox message={error} />}

      {/* Навигационные вкладки панели администратора */}
      <div className="admin-tabs-row">
        <button
          className={`admin-tab-btn ${activeTab === "services" ? "active" : ""}`}
          onClick={() => setActiveTab("services")}
        >
          🍽️ Услуги ({services.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === "categories" ? "active" : ""}`}
          onClick={() => setActiveTab("categories")}
        >
          🏷️ Категории ({categories.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          📦 Все заказы ({orders.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          💬 Отзывы ({reviews.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          👥 Пользователи ({users.length})
        </button>
      </div>

      {loading && <Loader text="Загрузка данных панели управления..." />}

      {!loading && (
        <div className="admin-content-pane">
          {/* ВКЛАДКА 1: УСЛУГИ */}
          {activeTab === "services" && (
            <div className="admin-section">
              <div className="admin-card form-card">
                <h3>{editingServiceId ? "Редактирование услуги" : "Добавление новой услуги в каталог"}</h3>
                <form onSubmit={handleSaveService} className="admin-form-grid">
                  <div className="form-group">
                    <label>Название услуги *</label>
                    <input
                      type="text"
                      required
                      placeholder="Например: Выездной бармен и коктейль-бар"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Категория *</label>
                    <select
                      value={serviceForm.category_id}
                      onChange={(e) => setServiceForm({ ...serviceForm, category_id: e.target.value })}
                    >
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Стоимость (₽) *</label>
                    <input
                      type="number"
                      required
                      placeholder="12000"
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Длительность (минут)</label>
                    <input
                      type="number"
                      placeholder="180"
                      value={serviceForm.duration}
                      onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Ссылка на фото (URL)</label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={serviceForm.image}
                      onChange={(e) => setServiceForm({ ...serviceForm, image: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Подробное описание услуги</label>
                    <textarea
                      rows="3"
                      placeholder="Состав услуги, условия выезда, требования..."
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    />
                  </div>

                  <div className="form-actions-row full-width">
                    <button type="submit" className="admin-primary-btn">
                      {editingServiceId ? "Сохранить изменения" : "+ Добавить услугу"}
                    </button>
                    {editingServiceId && (
                      <button
                        type="button"
                        className="admin-cancel-btn"
                        onClick={() => {
                          setEditingServiceId(null);
                          setServiceForm({
                            name: "",
                            description: "",
                            duration: 180,
                            price: "",
                            category_id: categories[0]?.category_id || "",
                            image: "",
                          });
                        }}
                      >
                        Отмена
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Таблица услуг */}
              <div className="admin-card table-card">
                <h3>Список всех услуг в каталоге ({services.length})</h3>
                <div className="admin-table-wrap">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Фото</th>
                        <th>Название</th>
                        <th>Категория (JOIN)</th>
                        <th>Цена</th>
                        <th>Время</th>
                        <th>Рейтинг</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((s) => (
                        <tr key={s.service_id}>
                          <td>
                            <img src={s.image} alt={s.name} className="admin-table-thumb" />
                          </td>
                          <td>
                            <strong>{s.name}</strong>
                          </td>
                          <td>
                            <span className="cat-chip">{s.category_name}</span>
                          </td>
                          <td className="price-bold">{Number(s.price).toLocaleString("ru-RU")} ₽</td>
                          <td>{s.duration} мин</td>
                          <td>★ {s.avg_rating || "—"}</td>
                          <td>
                            <div className="table-actions-cell">
                              <button
                                className="action-edit-btn"
                                onClick={() => handleStartEditService(s)}
                                title="Редактировать"
                              >
                                ✎
                              </button>
                              <button
                                className="action-delete-btn"
                                onClick={() => handleDeleteService(s.service_id, s.name)}
                                title="Удалить"
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ВКЛАДКА 2: КАТЕГОРИИ */}
          {activeTab === "categories" && (
            <div className="admin-section">
              <div className="admin-card form-card">
                <h3>Добавить новую категорию</h3>
                <form onSubmit={handleAddCategory} className="cat-add-form">
                  <input
                    type="text"
                    required
                    placeholder="Например: Десерты и сладкий стол"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                  <button type="submit" className="admin-primary-btn">
                    + Добавить категорию
                  </button>
                </form>
              </div>

              <div className="admin-card table-card">
                <h3>Существующие категории ({categories.length})</h3>
                <div className="admin-table-wrap">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Название категории</th>
                        <th>Услуг в категории</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.category_id}>
                          <td>
                            {editingCatId === c.category_id ? (
                              <div className="inline-edit-box">
                                <input
                                  type="text"
                                  value={editingCatName}
                                  onChange={(e) => setEditingCatName(e.target.value)}
                                />
                                <button
                                  className="save-inline-btn"
                                  onClick={() => handleUpdateCategory(c.category_id)}
                                >
                                  ✓
                                </button>
                                <button className="cancel-inline-btn" onClick={() => setEditingCatId(null)}>
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <strong>{c.name}</strong>
                            )}
                          </td>
                          <td>{c.services_count || 0}</td>
                          <td>
                            <div className="table-actions-cell">
                              <button
                                className="action-edit-btn"
                                onClick={() => {
                                  setEditingCatId(c.category_id);
                                  setEditingCatName(c.name);
                                }}
                                title="Изменить название"
                              >
                                ✎
                              </button>
                              <button
                                className="action-delete-btn"
                                onClick={() => handleDeleteCategory(c.category_id, c.name)}
                                title="Удалить категорию"
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ВКЛАДКА 3: ВСЕ ЗАКАЗЫ */}
          {activeTab === "orders" && (
            <div className="admin-section">
              <div className="admin-card table-card">
                <h3>Все заказы клиентов ({orders.length})</h3>
                <div className="admin-orders-list">
                  {orders.map((o) => (
                    <div key={o.order_id} className="admin-order-card">
                      <div className="admin-order-header">
                        <div>
                          <span className="order-num-badge">Заказ №{o.order_id}</span>
                          <span className="client-contact-info">
                            👤 <strong>{o.user_name}</strong> (📞 {o.user_phone} | ✉️ {o.user_email})
                          </span>
                        </div>

                        <div className="order-status-control">
                          <label>Статус:</label>
                          <select
                            value={o.status}
                            onChange={(e) => handleChangeOrderStatus(o.order_id, e.target.value)}
                            className={`status-select ${o.status}`}
                          >
                            <option value="Новый">Новый</option>
                            <option value="В обработке">В обработке</option>
                            <option value="Подтвержден">Подтвержден</option>
                            <option value="Выполнен">Выполнен</option>
                            <option value="Отменен">Отменен</option>
                          </select>
                        </div>
                      </div>

                      <div className="admin-order-body">
                        <div className="order-meta-line">
                          <span>📍 <strong>Адрес:</strong> {o.delivery_address}</span>
                          <span>📅 <strong>Дата и время:</strong> {o.delivery_date ? new Date(o.delivery_date).toLocaleDateString("ru-RU") : ""} в {o.delivery_time}</span>
                        </div>
                        {o.notes && <div className="order-notes-line">📝 {o.notes}</div>}

                        <div className="order-items-mini-list">
                          <strong>Состав заказа:</strong>
                          <ul>
                            {o.items?.map((it) => (
                              <li key={it.order_item_id}>
                                {it.service_name} ({it.category_name}) — {it.quantity} шт. × {Number(it.price).toLocaleString("ru-RU")} ₽
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="admin-order-footer">
                        <span>Сумма заказа:</span>
                        <strong className="order-amount-text">{Number(o.total_amount).toLocaleString("ru-RU")} ₽</strong>
                      </div>
                    </div>
                  ))}

                  {orders.length === 0 && <p className="empty-notice">Заказов пока нет</p>}
                </div>
              </div>
            </div>
          )}

          {/* ВКЛАДКА 4: ОТЗЫВЫ */}
          {activeTab === "reviews" && (
            <div className="admin-section">
              <div className="admin-card table-card">
                <h3>Модерация отзывов клиентов ({reviews.length})</h3>
                <div className="admin-table-wrap">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Услуга (JOIN)</th>
                        <th>Клиент (JOIN)</th>
                        <th>Оценка</th>
                        <th>Текст отзыва</th>
                        <th>Дата</th>
                        <th>Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((r) => (
                        <tr key={r.review_id}>
                          <td><strong>{r.service_name}</strong></td>
                          <td>👤 {r.user_name}</td>
                          <td className="stars-gold">{"★".repeat(r.rating)}</td>
                          <td className="review-comment-cell">{r.comment}</td>
                          <td>{r.created_at ? new Date(r.created_at).toLocaleDateString("ru-RU") : ""}</td>
                          <td>
                            <button
                              className="action-delete-btn"
                              onClick={() => handleDeleteReview(r.review_id)}
                              title="Удалить отзыв"
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ВКЛАДКА 5: ПОЛЬЗОВАТЕЛИ */}
          {activeTab === "users" && (
            <div className="admin-section">
              <div className="admin-card table-card">
                <h3>Зарегистрированные пользователи ({users.length})</h3>
                <div className="admin-table-wrap">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>ФИО</th>
                        <th>Email</th>
                        <th>Телефон</th>
                        <th>Адрес по умолчанию</th>
                        <th>Роль</th>
                        <th>Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.user_id}>
                          <td><strong>{u.name}</strong></td>
                          <td>{u.email}</td>
                          <td>{u.phone}</td>
                          <td>{u.address || "—"}</td>
                          <td>
                            <select
                              value={u.role_id}
                              onChange={(e) => handleChangeUserRole(u.user_id, Number(e.target.value))}
                              className="role-select"
                              disabled={u.user_id === auth.user.user_id}
                            >
                              <option value="2">Пользователь (Клиент)</option>
                              <option value="1">Администратор</option>
                            </select>
                          </td>
                          <td>
                            {u.user_id !== auth.user.user_id && (
                              <button
                                className="action-delete-btn"
                                onClick={() => handleDeleteUser(u.user_id, u.name)}
                                title="Удалить пользователя"
                              >
                                🗑
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
