
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

  const [activeTab, setActiveTab] = useState("services");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState("");

  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [users, setUsers] = useState([]);

  const [searchService, setSearchService] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchOrder, setSearchOrder] = useState("");
  const [searchReview, setSearchReview] = useState("");
  const [searchCoupon, setSearchCoupon] = useState("");
  const [searchUser, setSearchUser] = useState("");

  const [activeModal, setActiveModal] = useState(null);

  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    duration: 180,
    price: "",
    category_id: "",
    image: "",
    discount_percent: 0,
    stock_quantity: 15,
  });
  const [serviceModalError, setServiceModalError] = useState("");

  const [categoryModalData, setCategoryModalData] = useState({ id: null, name: "" });
  const [catModalError, setCatModalError] = useState("");

  const [couponModalData, setCouponModalData] = useState({
    id: null,
    code: "",
    discount_percent: 10,
    description: "",
    is_active: true,
  });
  const [couponModalError, setCouponModalError] = useState("");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderModalMsg, setOrderModalMsg] = useState("");

  const loadAdminData = useCallback(async () => {
    if (!auth.token || auth.user?.role !== "admin") {
      navigate("/login");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [svcs, cats, ords, revs, cpns, usrs] = await Promise.all([
        apiGet("/api/services"),
        apiGet("/api/categories"),
        apiGet("/api/orders", auth.token),
        apiGet("/api/reviews"),
        apiGet("/api/coupons"),
        apiGet("/api/users", auth.token),
      ]);

      setServices(Array.isArray(svcs) ? svcs : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setOrders(Array.isArray(ords) ? ords : []);
      setReviews(Array.isArray(revs) ? revs : []);
      setCoupons(Array.isArray(cpns) ? cpns : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
    } catch (err) {
      setError(err.message || "Ошибка загрузки панели администратора");
    } finally {
      setLoading(false);
    }
  }, [auth.token, auth.user, navigate]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const showSuccess = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setServiceModalError("");
    setServiceForm({
      name: "",
      description: "",
      duration: 180,
      price: "",
      category_id: categories[0]?.category_id || "",
      image: "",
      discount_percent: 0,
      stock_quantity: 15,
    });
    setActiveModal("service");
  };

  const handleOpenEditService = (s) => {
    setEditingServiceId(s.service_id);
    setServiceModalError("");
    setServiceForm({
      name: s.name,
      description: s.description || "",
      duration: s.duration || 180,
      price: s.price,
      category_id: s.category_id || "",
      image: s.image || "",
      discount_percent: s.discount_percent || 0,
      stock_quantity: s.stock_quantity !== undefined ? s.stock_quantity : 15,
    });
    setActiveModal("service");
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setServiceModalError("");

    if (!serviceForm.name.trim()) {
      setServiceModalError("Введите название услуги / товара");
      return;
    }
    const numPrice = Number(serviceForm.price);
    if (!numPrice || numPrice <= 0 || isNaN(numPrice)) {
      setServiceModalError("Цена должна быть строго больше 0 ₽ (не может быть 0 или отрицательной)");
      return;
    }
    const numDuration = Number(serviceForm.duration);
    if (!numDuration || numDuration <= 0 || isNaN(numDuration)) {
      setServiceModalError("Длительность должна быть строго больше 0 минут");
      return;
    }
    const stock = Number(serviceForm.stock_quantity);
    if (isNaN(stock) || stock < 0) {
      setServiceModalError("Количество на складе не может быть отрицательным");
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

      setActiveModal(null);
      const updated = await apiGet("/api/services");
      setServices(updated);
    } catch (err) {
      setServiceModalError(err.message || "Ошибка сохранения услуги");
    }
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

  const handleSetServiceDiscount = async (serviceId, percent) => {
    const validPercent = Math.max(0, Math.min(90, Number(percent) || 0));
    try {
      await apiPut(`/api/services/${serviceId}/discount`, { discount_percent: validPercent }, auth.token);
      setServices((prev) =>
        prev.map((s) => (s.service_id === serviceId ? { ...s, discount_percent: validPercent } : s))
      );
      showSuccess(`Скидка ${validPercent}% успешно установлена`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenAddCategory = () => {
    setCategoryModalData({ id: null, name: "" });
    setCatModalError("");
    setActiveModal("category");
  };

  const handleOpenEditCategory = (cat) => {
    setCategoryModalData({ id: cat.category_id, name: cat.name });
    setCatModalError("");
    setActiveModal("category");
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setCatModalError("");
    if (!categoryModalData.name.trim()) {
      setCatModalError("Введите наименование категории");
      return;
    }

    try {
      if (categoryModalData.id) {
        await apiPut(`/api/categories/${categoryModalData.id}`, { name: categoryModalData.name.trim() }, auth.token);
        showSuccess(`Категория успешно переименована в «${categoryModalData.name.trim()}»`);
      } else {
        await apiPost("/api/categories", { name: categoryModalData.name.trim() }, auth.token);
        showSuccess(`Категория «${categoryModalData.name.trim()}» добавлена`);
      }

      setActiveModal(null);
      const [updatedCats, updatedSvcs] = await Promise.all([
        apiGet("/api/categories"),
        apiGet("/api/services"),
      ]);
      setCategories(updatedCats);
      setServices(updatedSvcs);
    } catch (err) {
      setCatModalError(err.message || "Ошибка сохранения категории");
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (catName === "Без категории") {
      alert("Категория «Без категории» является системной и не подлежит удалению");
      return;
    }

    if (
      !window.confirm(
        `Удалить категорию «${catName}»? Все входящие в нее товары и услуги будут автоматически перенесены в категорию «Без категории».`
      )
    ) {
      return;
    }

    try {
      const res = await apiDelete(`/api/categories/${catId}`, auth.token);
      showSuccess(res.message || `Категория «${catName}» удалена`);
      const [updatedCats, updatedSvcs] = await Promise.all([
        apiGet("/api/categories"),
        apiGet("/api/services"),
      ]);
      setCategories(updatedCats);
      setServices(updatedSvcs);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenAddCoupon = () => {
    setCouponModalData({ id: null, code: "", discount_percent: 10, description: "", is_active: true });
    setCouponModalError("");
    setActiveModal("coupon");
  };

  const handleOpenEditCoupon = (c) => {
    setCouponModalData({
      id: c.coupon_id,
      code: c.code,
      discount_percent: c.discount_percent,
      description: c.description || "",
      is_active: Boolean(c.is_active),
    });
    setCouponModalError("");
    setActiveModal("coupon");
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    setCouponModalError("");
    if (!couponModalData.code.trim()) {
      setCouponModalError("Укажите код промокода");
      return;
    }

    try {
      if (couponModalData.id) {
        await apiPut(
          `/api/coupons/${couponModalData.id}`,
          {
            discount_percent: couponModalData.discount_percent,
            description: couponModalData.description,
            is_active: couponModalData.is_active,
          },
          auth.token
        );
        showSuccess(`Промокод «${couponModalData.code}» обновлен`);
      } else {
        await apiPost(
          "/api/coupons",
          {
            code: couponModalData.code.trim().toUpperCase(),
            discount_percent: couponModalData.discount_percent,
            description: couponModalData.description,
          },
          auth.token
        );
        showSuccess(`Промокод «${couponModalData.code.toUpperCase()}» успешно создан`);
      }

      setActiveModal(null);
      const updated = await apiGet("/api/coupons");
      setCoupons(updated);
    } catch (err) {
      setCouponModalError(err.message || "Ошибка сохранения промокода");
    }
  };

  const handleDeleteCoupon = async (couponId, code) => {
    if (!window.confirm(`Удалить промокод «${code}»?`)) return;
    try {
      await apiDelete(`/api/coupons/${couponId}`, auth.token);
      setCoupons((prev) => prev.filter((c) => c.coupon_id !== couponId));
      showSuccess(`Промокод «${code}» удален`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenOrderModal = (order) => {
    setSelectedOrder(order);
    setOrderModalMsg("");
    setActiveModal("order");
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const targetOrder = orders.find((o) => o.order_id === orderId);
    if (targetOrder && (targetOrder.status === "Выполнен" || targetOrder.status === "Отменен")) {
      alert(`Заказ №${orderId} уже имеет статус «${targetOrder.status}» и не подлежит изменению.`);
      return;
    }
    try {
      await apiPut(`/api/orders/${orderId}/status`, { status: newStatus }, auth.token);
      setOrders((prev) =>
        prev.map((o) => (o.order_id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder.order_id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
      }
      setOrderModalMsg(`Статус заказа №${orderId} изменен на «${newStatus}»`);
      showSuccess(`Статус заказа №${orderId} изменен на «${newStatus}»`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteReview = async (reviewId, reviewerName) => {
    if (
      !window.confirm(
        `Удалить отзыв пользователя «${reviewerName}» за нарушение правил сайта и прав сообщества?`
      )
    ) {
      return;
    }
    try {
      await apiDelete(`/api/reviews/${reviewId}`, auth.token);
      setReviews((prev) => prev.filter((r) => r.review_id !== reviewId));
      showSuccess(`Отзыв удален за нарушение правил сообщества`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateUserRole = async (userId, roleId) => {
    try {
      await apiPut(`/api/users/${userId}/role`, { role_id: roleId }, auth.token);
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId
            ? { ...u, role_id: roleId, role: Number(roleId) === 1 ? "admin" : "user" }
            : u
        )
      );
      showSuccess("Роль пользователя успешно обновлена");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSetUserDiscount = async (userId, percent) => {
    const validPercent = Math.max(0, Math.min(90, Number(percent) || 0));
    try {
      await apiPut(`/api/users/${userId}/personal-discount`, { personal_discount_percent: validPercent }, auth.token);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, personal_discount_percent: validPercent } : u))
      );
      showSuccess(`Личная скидка ${validPercent}% успешно установлена`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (Number(userId) === auth.user?.user_id) {
      alert("Нельзя удалить собственный аккаунт администратора");
      return;
    }
    if (!window.confirm(`Вы действительно хотите удалить пользователя «${userName}»?`)) return;

    try {
      await apiDelete(`/api/users/${userId}`, auth.token);
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      showSuccess(`Пользователь «${userName}» успешно удален`);
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredServices = services.filter((s) => {
    const term = searchService.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      (s.category_name && s.category_name.toLowerCase().includes(term)) ||
      (s.description && s.description.toLowerCase().includes(term))
    );
  });

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchCategory.toLowerCase())
  );

  const filteredCoupons = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(searchCoupon.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchCoupon.toLowerCase()))
  );

  const filteredOrders = orders.filter((o) => {
    const term = searchOrder.toLowerCase();
    return (
      String(o.order_id).includes(term) ||
      (o.user_name && o.user_name.toLowerCase().includes(term)) ||
      (o.delivery_address && o.delivery_address.toLowerCase().includes(term)) ||
      (o.status && o.status.toLowerCase().includes(term)) ||
      (o.coupon_code && o.coupon_code.toLowerCase().includes(term))
    );
  });

  const filteredReviews = reviews.filter((r) => {
    const term = searchReview.toLowerCase();
    return (
      (r.user_name && r.user_name.toLowerCase().includes(term)) ||
      (r.service_name && r.service_name.toLowerCase().includes(term)) ||
      (r.comment && r.comment.toLowerCase().includes(term))
    );
  });

  const filteredUsers = users.filter((u) => {
    const term = searchUser.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.phone.toLowerCase().includes(term)
    );
  });

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

  return (
    <div className="admin-container">

      <div className="admin-header-card">
        <div>
          <h1>Панель управления администратора</h1>
          <p className="admin-subtitle">
            Управление услугами и товарами, категориями, заказами, модерацией отзывов, промокодами и клиентами
          </p>
        </div>
      </div>

      {actionSuccess && <div className="admin-success-alert">✓ {actionSuccess}</div>}
      {error && <ErrorBox message={error} />}

      <div className="admin-tabs-row">
        <button
          className={`admin-tab-btn ${activeTab === "services" ? "active" : ""}`}
          onClick={() => setActiveTab("services")}
        >
          🍽️ Услуги и товары ({services.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === "categories" ? "active" : ""}`}
          onClick={() => setActiveTab("categories")}
        >
          🏷️ Категории ({categories.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === "coupons" ? "active" : ""}`}
          onClick={() => setActiveTab("coupons")}
        >
          🎟️ Промокоды ({coupons.length})
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

          {activeTab === "services" && (
            <div className="admin-section">
              <div className="admin-toolbar">
                <div className="search-bar-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Поиск по названию, категории или описанию..."
                    value={searchService}
                    onChange={(e) => setSearchService(e.target.value)}
                  />
                  {searchService && (
                    <button className="clear-search-btn" onClick={() => setSearchService("")}>✕</button>
                  )}
                </div>
                <button className="primary-action-btn" onClick={handleOpenAddService}>
                  + Добавить услугу / товар
                </button>
              </div>

              <div className="admin-card table-card">
                <div className="admin-table-responsive">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Фото</th>
                        <th>Название и категория</th>
                        <th>Остаток на складе</th>
                        <th>Цена и скидка</th>
                        <th>Длительность</th>
                        <th>Быстрая скидка</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredServices.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="empty-table-cell">
                            По запросу ничего не найдено
                          </td>
                        </tr>
                      ) : (
                        filteredServices.map((s) => (
                          <tr key={s.service_id}>
                            <td className="thumb-cell">
                              <img
                                src={s.image || "https://images.unsplash.com/photo-1555244162-803834f70033?w=120&auto=format&fit=crop&q=80"}
                                alt={s.name}
                                className="table-row-img"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "https://images.unsplash.com/photo-1555244162-803834f70033?w=120&auto=format&fit=crop&q=80";
                                }}
                              />
                            </td>
                            <td>
                              <strong>{s.name}</strong>
                              <br />
                              <span className="category-chip-tag">
                                {s.category_name || "Без категории"}
                              </span>
                            </td>
                            <td>
                              <span className={`stock-counter-badge ${Number(s.stock_quantity) <= 0 ? "out" : ""}`}>
                                {Number(s.stock_quantity) <= 0 ? "✕ Нет на складе" : `📦 ${s.stock_quantity ?? 15} шт.`}
                              </span>
                            </td>
                            <td>
                              <span className="table-price">{Number(s.price).toLocaleString("ru-RU")} ₽</span>
                              {Number(s.discount_percent) > 0 && (
                                <span className="discount-tag"> -{s.discount_percent}%</span>
                              )}
                            </td>
                            <td>⏱ {s.duration} мин</td>
                            <td>
                              <select
                                className="discount-quick-select"
                                value={s.discount_percent || 0}
                                onChange={(e) => handleSetServiceDiscount(s.service_id, e.target.value)}
                              >
                                <option value="0">Без скидки</option>
                                <option value="10">10%</option>
                                <option value="15">15%</option>
                                <option value="20">20%</option>
                                <option value="25">25%</option>
                                <option value="30">30%</option>
                                <option value="50">50%</option>
                              </select>
                            </td>
                            <td>
                              <div className="table-action-btns">
                                <button
                                  className="edit-action-btn"
                                  onClick={() => handleOpenEditService(s)}
                                  title="Редактировать в модальном окне"
                                >
                                  ✏️ Редактировать
                                </button>
                                <button
                                  className="delete-action-btn"
                                  onClick={() => handleDeleteService(s.service_id, s.name)}
                                  title="Удалить услугу"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <div className="admin-section">
              <div className="admin-toolbar">
                <div className="search-bar-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Поиск по названию категории..."
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                  />
                  {searchCategory && (
                    <button className="clear-search-btn" onClick={() => setSearchCategory("")}>✕</button>
                  )}
                </div>
                <button className="primary-action-btn" onClick={handleOpenAddCategory}>
                  + Добавить категорию
                </button>
              </div>

              <div className="admin-card table-card">
                <div className="admin-table-responsive">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Наименование категории</th>
                        <th>Услуг и товаров в категории</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategories.map((c) => {
                        const isSystemUncat = c.name === "Без категории";
                        return (
                          <tr key={c.category_id}>
                            <td>#{c.category_id}</td>
                            <td>
                              <strong>{c.name}</strong>
                              {isSystemUncat && (
                                <span className="system-cat-pill">🔒 Системная (по умолчанию)</span>
                              )}
                            </td>
                            <td>{c.services_count || 0} позиций</td>
                            <td>
                              <div className="table-action-btns">
                                <button
                                  className="edit-action-btn"
                                  onClick={() => handleOpenEditCategory(c)}
                                  title="Переименовать категорию"
                                >
                                  ✏️ Переименовать
                                </button>
                                {!isSystemUncat ? (
                                  <button
                                    className="delete-action-btn"
                                    onClick={() => handleDeleteCategory(c.category_id, c.name)}
                                    title="Удалить категорию (товары перейдут в «Без категории»)"
                                  >
                                    🗑️ Удалить
                                  </button>
                                ) : (
                                  <span className="locked-action-text" title="Системную категорию удалить нельзя">
                                    Не удаляется
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "coupons" && (
            <div className="admin-section">
              <div className="admin-toolbar">
                <div className="search-bar-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Поиск по коду или описанию купона..."
                    value={searchCoupon}
                    onChange={(e) => setSearchCoupon(e.target.value)}
                  />
                  {searchCoupon && (
                    <button className="clear-search-btn" onClick={() => setSearchCoupon("")}>✕</button>
                  )}
                </div>
                <button className="primary-action-btn" onClick={handleOpenAddCoupon}>
                  + Создать промокод
                </button>
              </div>

              <div className="admin-card table-card">
                <div className="admin-table-responsive">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Код купона</th>
                        <th>Размер скидки</th>
                        <th>Описание</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCoupons.map((cpn) => (
                        <tr key={cpn.coupon_id}>
                          <td>
                            <strong className="coupon-code-badge">🎟 {cpn.code}</strong>
                          </td>
                          <td>
                            <span className="coupon-percent-val">-{cpn.discount_percent}%</span>
                          </td>
                          <td>{cpn.description || "Без описания"}</td>
                          <td>
                            <span className={`coupon-status-pill ${cpn.is_active ? "active" : "inactive"}`}>
                              {cpn.is_active ? "Активен" : "Отключен"}
                            </span>
                          </td>
                          <td>
                            <div className="table-action-btns">
                              <button
                                className="edit-action-btn"
                                onClick={() => handleOpenEditCoupon(cpn)}
                              >
                                ✏️ Изменить
                              </button>
                              <button
                                className="delete-action-btn"
                                onClick={() => handleDeleteCoupon(cpn.coupon_id, cpn.code)}
                              >
                                🗑️
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

          {activeTab === "orders" && (
            <div className="admin-section">
              <div className="admin-toolbar">
                <div className="search-bar-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Поиск по номеру заказа, клиенту, адресу или статусу..."
                    value={searchOrder}
                    onChange={(e) => setSearchOrder(e.target.value)}
                  />
                  {searchOrder && (
                    <button className="clear-search-btn" onClick={() => setSearchOrder("")}>✕</button>
                  )}
                </div>
              </div>

              <div className="admin-card table-card">
                <div className="admin-table-responsive">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Заказ</th>
                        <th>Клиент и контакты</th>
                        <th>Дата и адрес выезда</th>
                        <th>Товары в заказе</th>
                        <th>Сумма и скидки</th>
                        <th>Статус заказа</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="empty-table-cell">Заказы не найдены</td>
                        </tr>
                      ) : (
                        filteredOrders.map((o) => (
                          <tr key={o.order_id}>
                            <td>
                              <strong>Заказ №{o.order_id}</strong>
                              <br />
                              <small style={{ color: "#64748b" }}>
                                {o.created_at ? new Date(o.created_at).toLocaleDateString("ru-RU") : ""}
                              </small>
                            </td>
                            <td>
                              <strong>{o.user_name}</strong>
                              <br />
                              <small>{o.user_phone}</small>
                              <br />
                              <small style={{ color: "#64748b" }}>{o.user_email}</small>
                            </td>
                            <td>
                              📅 {o.delivery_date ? String(o.delivery_date).slice(0, 10) : ""} в {o.delivery_time}
                              <br />
                              <small>📍 {o.delivery_address}</small>
                            </td>
                            <td>
                              <span className="order-items-count-badge">
                                🍽️ {o.items?.length || 0} позиций
                              </span>
                            </td>
                            <td>
                              <strong className="order-table-price">
                                {Number(o.total_amount).toLocaleString("ru-RU")} ₽
                              </strong>
                              {o.coupon_code && (
                                <div>
                                  <small style={{ color: "#16a34a", fontWeight: "600" }}>
                                    🎟 {o.coupon_code} (-{o.coupon_discount_percent}%)
                                  </small>
                                </div>
                              )}
                              {Number(o.personal_discount_percent) > 0 && (
                                <div>
                                  <small style={{ color: "#2563eb", fontWeight: "600" }}>
                                    👤 Личная: -{o.personal_discount_percent}%
                                  </small>
                                </div>
                              )}
                            </td>
                            <td>
                              {o.status === "Выполнен" || o.status === "Отменен" ? (
                                <span className={`status-badge ${getStatusClass(o.status)}`} title="Финальный статус, изменение заблокировано">
                                  {o.status}
                                </span>
                              ) : (
                                <select
                                  className={`order-status-select ${getStatusClass(o.status)}`}
                                  value={o.status}
                                  onChange={(e) => handleUpdateOrderStatus(o.order_id, e.target.value)}
                                >
                                  <option value="Новый">Новый</option>
                                  <option value="В обработке">В обработке</option>
                                  <option value="Подтвержден">Подтвержден</option>
                                  <option value="Выполнен">Выполнен</option>
                                  <option value="Отменен">Отменен</option>
                                </select>
                              )}
                            </td>
                            <td>
                              <button
                                className="view-order-details-btn"
                                onClick={() => handleOpenOrderModal(o)}
                              >
                                👁 Подробнее
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="admin-section">
              <div className="admin-toolbar">
                <div className="search-bar-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Поиск по автору, услуге или тексту отзыва..."
                    value={searchReview}
                    onChange={(e) => setSearchReview(e.target.value)}
                  />
                  {searchReview && (
                    <button className="clear-search-btn" onClick={() => setSearchReview("")}>✕</button>
                  )}
                </div>
              </div>

              <div className="admin-card table-card">
                <div className="admin-table-responsive">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Товар / Услуга</th>
                        <th>Клиент</th>
                        <th>Оценка</th>
                        <th>Текст отзыва</th>
                        <th>Дата публикации</th>
                        <th>Модерация</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReviews.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="empty-table-cell">Отзывы не найдены</td>
                        </tr>
                      ) : (
                        filteredReviews.map((r) => (
                          <tr key={r.review_id}>
                            <td className="review-svc-cell">
                              <img
                                src={r.service_image || "https://images.unsplash.com/photo-1555244162-803834f70033?w=100&auto=format&fit=crop&q=80"}
                                alt={r.service_name}
                                className="table-row-img"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "https://images.unsplash.com/photo-1555244162-803834f70033?w=100&auto=format&fit=crop&q=80";
                                }}
                              />
                              <strong>{r.service_name}</strong>
                            </td>
                            <td>
                              <strong>{r.user_name}</strong>
                              <br />
                              <small style={{ color: "#64748b" }}>{r.user_email}</small>
                            </td>
                            <td>
                              <span className="star-rating-pill">★ {r.rating} / 5</span>
                            </td>
                            <td className="review-comment-cell">
                              <div className="review-comment-text">"{r.comment}"</div>
                            </td>
                            <td>
                              <small>
                                {r.created_at ? new Date(r.created_at).toLocaleDateString("ru-RU") : "Недавно"}
                              </small>
                            </td>
                            <td>
                              <button
                                className="delete-review-violation-btn"
                                onClick={() => handleDeleteReview(r.review_id, r.user_name)}
                                title="Удалить данный отзыв за нарушение правил сайта"
                              >
                                🗑️ Удалить за нарушение правил
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="admin-section">
              <div className="admin-toolbar">
                <div className="search-bar-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Поиск по ФИО, email или телефону..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                  />
                  {searchUser && (
                    <button className="clear-search-btn" onClick={() => setSearchUser("")}>✕</button>
                  )}
                </div>
              </div>

              <div className="admin-card table-card">
                <div className="admin-table-responsive">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>ФИО и контакты</th>
                        <th>Адрес по умолчанию</th>
                        <th>Роль пользователя</th>
                        <th>Личная скидка</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.user_id}>
                          <td>#{u.user_id}</td>
                          <td>
                            <strong>{u.name}</strong>
                            <br />
                            <small>{u.email}</small>
                            <br />
                            <small>{u.phone}</small>
                          </td>
                          <td>{u.address || "Не указан"}</td>
                          <td>
                            <select
                              className="role-selector"
                              value={u.role_id}
                              onChange={(e) => handleUpdateUserRole(u.user_id, e.target.value)}
                            >
                              <option value="1">👑 Администратор</option>
                              <option value="2">👤 Клиент</option>
                            </select>
                          </td>
                          <td>
                            <select
                              className="user-discount-select"
                              value={u.personal_discount_percent || 0}
                              onChange={(e) => handleSetUserDiscount(u.user_id, e.target.value)}
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="10">10%</option>
                              <option value="15">15%</option>
                              <option value="20">20%</option>
                              <option value="25">25%</option>
                              <option value="30">30%</option>
                            </select>
                          </td>
                          <td>
                            {u.user_id !== auth.user?.user_id ? (
                              <button
                                className="delete-action-btn"
                                onClick={() => handleDeleteUser(u.user_id, u.name)}
                                title="Удалить пользователя"
                              >
                                🗑️ Удалить
                              </button>
                            ) : (
                              <span className="self-user-chip">Текущий аккаунт</span>
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

      {activeModal === "service" && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-window modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingServiceId ? "Редактирование услуги / товара" : "Добавление услуги / товара"}</h3>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            {serviceModalError && <ErrorBox message={serviceModalError} />}

            <form onSubmit={handleSaveService} className="modal-form-body">
              <div className="modal-form-grid">
                <div className="form-group full-width">
                  <label>Название услуги / товара *</label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Выездной шеф-повар на банкет"
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
                  <small style={{ color: "#64748b" }}>
                    Если не выбрать, попадет в «Без категории»
                  </small>
                </div>

                <div className="form-group">
                  <label>Стоимость (₽) * (строго больше 0)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="15000"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Количество на складе *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="15"
                    value={serviceForm.stock_quantity}
                    onChange={(e) => setServiceForm({ ...serviceForm, stock_quantity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Длительность (минут) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="180"
                    value={serviceForm.duration}
                    onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Скидка на позицию (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    placeholder="0"
                    value={serviceForm.discount_percent}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, discount_percent: Number(e.target.value) || 0 })
                    }
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

                <div className="form-group full-width photo-preview-group">
                  <label>Предпросмотр фотографии:</label>
                  {serviceForm.image ? (
                    <div className="image-preview-card">
                      <img
                        src={serviceForm.image}
                        alt="Предпросмотр"
                        className="modal-preview-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=80";
                        }}
                      />
                      <div className="preview-action-block">
                        <p className="preview-url-text">{serviceForm.image}</p>
                        <button
                          type="button"
                          className="clear-photo-btn"
                          onClick={() => setServiceForm({ ...serviceForm, image: "" })}
                        >
                          🗑️ Удалить фото (очистить)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="no-photo-box">
                      <span>📷 Фото не указано (будет использована стандартная заставка)</span>
                    </div>
                  )}
                </div>

                <div className="form-group full-width">
                  <label>Подробное описание услуги / состава</label>
                  <textarea
                    rows="3"
                    placeholder="Опишите состав ресторанного обслуживания, меню, особенности..."
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions-row">
                <button type="button" className="modal-cancel-btn" onClick={() => setActiveModal(null)}>
                  Отмена
                </button>
                <button type="submit" className="primary-action-btn">
                  {editingServiceId ? "Сохранить изменения" : "Добавить в каталог"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "category" && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-window modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{categoryModalData.id ? "Переименование категории" : "Новая категория"}</h3>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            {catModalError && <ErrorBox message={catModalError} />}

            <form onSubmit={handleSaveCategory} className="modal-form-body">
              <div className="form-group">
                <label>Наименование категории *</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Десерты и сладкие столы"
                  value={categoryModalData.name}
                  onChange={(e) => setCategoryModalData({ ...categoryModalData, name: e.target.value })}
                />
              </div>

              <div className="modal-actions-row">
                <button type="button" className="modal-cancel-btn" onClick={() => setActiveModal(null)}>
                  Отмена
                </button>
                <button type="submit" className="primary-action-btn">
                  {categoryModalData.id ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "coupon" && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-window modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{couponModalData.id ? `Редактирование промокода` : "Создание нового промокода"}</h3>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            {couponModalError && <ErrorBox message={couponModalError} />}

            <form onSubmit={handleSaveCoupon} className="modal-form-body">
              <div className="form-group">
                <label>Код промокода *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(couponModalData.id)}
                  placeholder="Например: FESTIVAL20"
                  value={couponModalData.code}
                  onChange={(e) => setCouponModalData({ ...couponModalData, code: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Скидка (%) *</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  required
                  value={couponModalData.discount_percent}
                  onChange={(e) =>
                    setCouponModalData({ ...couponModalData, discount_percent: Number(e.target.value) || 10 })
                  }
                />
              </div>

              <div className="form-group">
                <label>Описание</label>
                <input
                  type="text"
                  placeholder="Например: Праздничная скидка на свадьбы"
                  value={couponModalData.description}
                  onChange={(e) => setCouponModalData({ ...couponModalData, description: e.target.value })}
                />
              </div>

              {couponModalData.id && (
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={couponModalData.is_active}
                      onChange={(e) => setCouponModalData({ ...couponModalData, is_active: e.target.checked })}
                    />
                    {" "}Промокод активен для применения
                  </label>
                </div>
              )}

              <div className="modal-actions-row">
                <button type="button" className="modal-cancel-btn" onClick={() => setActiveModal(null)}>
                  Отмена
                </button>
                <button type="submit" className="primary-action-btn">
                  {couponModalData.id ? "Обновить промокод" : "Создать промокод"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "order" && selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-window modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Заказ №{selectedOrder.order_id}</h3>
                <span className={`status-badge ${getStatusClass(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            {orderModalMsg && <div className="admin-success-alert">✓ {orderModalMsg}</div>}

            <div className="order-modal-content">

              <div className="order-status-control-box">
                <label><strong>Управление статусом заказа:</strong></label>
                {selectedOrder.status === "Выполнен" || selectedOrder.status === "Отменен" ? (
                  <div style={{ padding: "8px 12px", background: "#f1f5f9", borderRadius: "6px", color: "#64748b", fontSize: "14px", marginTop: "6px" }}>
                    Заказ имеет финальный статус <strong>«{selectedOrder.status}»</strong>. Изменение статуса недоступно.
                  </div>
                ) : (
                  <div className="status-button-group">
                    {["Новый", "В обработке", "Подтвержден", "Выполнен", "Отменен"].map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`status-btn-opt ${selectedOrder.status === st ? "active " + getStatusClass(st) : ""}`}
                        onClick={() => handleUpdateOrderStatus(selectedOrder.order_id, st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="order-details-grid">
                <div className="detail-card">
                  <h4>Клиент</h4>
                  <p><strong>{selectedOrder.user_name}</strong></p>
                  <p>📱 {selectedOrder.user_phone}</p>
                  <p>📧 {selectedOrder.user_email}</p>
                </div>

                <div className="detail-card">
                  <h4>Мероприятие и адрес</h4>
                  <p>📅 <strong>{selectedOrder.delivery_date ? String(selectedOrder.delivery_date).slice(0, 10) : ""}</strong> к {selectedOrder.delivery_time}</p>
                  <p>📍 {selectedOrder.delivery_address}</p>
                  {selectedOrder.notes && <p>💬 <em>{selectedOrder.notes}</em></p>}
                </div>

                <div className="detail-card">
                  <h4>Скидки и оплата</h4>
                  {selectedOrder.coupon_code && (
                    <p style={{ color: "#16a34a" }}>
                      🎟 Промокод: <strong>{selectedOrder.coupon_code}</strong> (-{selectedOrder.coupon_discount_percent}%)
                    </p>
                  )}
                  {Number(selectedOrder.personal_discount_percent) > 0 && (
                    <p style={{ color: "#2563eb" }}>
                      👤 Личная скидка: <strong>-{selectedOrder.personal_discount_percent}%</strong>
                    </p>
                  )}
                  <p className="order-grand-total">
                    Итого к оплате: <strong>{Number(selectedOrder.total_amount).toLocaleString("ru-RU")} ₽</strong>
                  </p>
                </div>
              </div>

              <div className="order-items-table-wrapper">
                <h4>Состав заказа ({selectedOrder.items?.length || 0} позиций):</h4>
                <table className="order-items-subtable">
                  <thead>
                    <tr>
                      <th>Фото</th>
                      <th>Позиция</th>
                      <th>Категория</th>
                      <th>Количество</th>
                      <th>Цена за ед.</th>
                      <th>Итого</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.order_item_id}>
                        <td className="thumb-cell">
                          <img
                            src={item.image || "https://images.unsplash.com/photo-1555244162-803834f70033?w=100&auto=format&fit=crop&q=80"}
                            alt={item.service_name}
                            className="order-sub-thumb"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1555244162-803834f70033?w=100&auto=format&fit=crop&q=80";
                            }}
                          />
                        </td>
                        <td>
                          <strong>{item.service_name}</strong>
                          <br />
                          <small>⏱ {item.duration} мин</small>
                        </td>
                        <td>
                          <span className="cat-chip">{item.category_name || "Без категории"}</span>
                        </td>
                        <td>
                          <strong>{item.quantity} шт.</strong>
                        </td>
                        <td>{Number(item.price).toLocaleString("ru-RU")} ₽</td>
                        <td>
                          <strong>{(Number(item.price) * Number(item.quantity)).toLocaleString("ru-RU")} ₽</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-actions-row">
              <button type="button" className="primary-action-btn" onClick={() => setActiveModal(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
