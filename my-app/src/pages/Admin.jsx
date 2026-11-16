import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiPut } from "../api";
import { useShop } from "../context/ShopContext";
import Loader from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import "./Admin.css";

export default function Admin() {
  const { auth, logout } = useShop();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCat, setNewCat] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceDiscount, setServiceDiscount] = useState("");
  const [userCouponMap, setUserCouponMap] = useState({});

  async function loadData() {
    if (!auth.token || auth.user?.role !== "admin") {
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      const [c, s, u, cpn] = await Promise.all([
        apiGet("/api/categories"),
        apiGet("/api/services"),
        apiGet("/api/users"),
        apiGet("/api/coupons"),
      ]);
      setCategories(c);
      setServices(s);
      setUsers(u);
      setCoupons(cpn);
    } catch (err) {
      setError(err.message || "Ошибка загрузки админки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddCategory(e) {
    e.preventDefault();
    const trimmed = newCat.trim();
    if (!trimmed) {
      alert("Введите название категории");
      return;
    }
    const isDuplicate = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      alert("Категория с таким названием уже существует");
      return;
    }
    try {
      const added = await apiPost("/api/categories", { name: trimmed });
      setCategories([...categories, added]);
      setNewCat("");
      alert("Категория добавлена! Она сразу появится в aside каталога.");
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSetDiscount(e) {
    e.preventDefault();
    if (!selectedServiceId || serviceDiscount === "") return;
    try {
      const updated = await apiPut(`/api/services/${selectedServiceId}/discount`, {
        percent: Number(serviceDiscount),
      });
      setServices(services.map((s) => (s.service_id === updated.service_id ? updated : s)));
      setServiceDiscount("");
      alert(`Скидка на услугу «${updated.name}» установлена: ${updated.discount_percent}%`);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAssignCoupon(userId) {
    const couponId = userCouponMap[userId];
    try {
      const updatedUser = await apiPut(`/api/users/${userId}/coupon`, {
        coupon_id: couponId ? Number(couponId) : null,
      });
      setUsers(users.map((u) => (u.user_id === userId ? updatedUser : u)));
      alert(`Купон пользователю «${updatedUser.name}» успешно назначен!`);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Панель администратора</h1>
        <button className="logout-btn" onClick={() => { logout(); navigate("/"); }}>
          Выйти
        </button>
      </div>

      {loading && <Loader text="Загрузка данных админки..." />}
      {error && <ErrorBox message={error} />}

      {!loading && (
        <div className="admin-blocks">
          <div className="admin-box">
            <h2>Категории услуг</h2>
            <form onSubmit={handleAddCategory} className="simple-form">
              <input
                type="text"
                placeholder="Новая категория..."
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
              />
              <button type="submit">Добавить категорию</button>
            </form>
            <div className="cat-tags">
              {categories.map((c) => (
                <span key={c.category_id} className="cat-tag">{c.name}</span>
              ))}
            </div>
          </div>

          <div className="admin-box">
            <h2>Общая скидка на услугу</h2>
            <form onSubmit={handleSetDiscount} className="simple-form">
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
              >
                <option value="">— Выберите услугу —</option>
                {services.map((s) => (
                  <option key={s.service_id} value={s.service_id}>
                    {s.name} (сейчас: {s.discount_percent}% скидка)
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                max="90"
                placeholder="Скидка %"
                value={serviceDiscount}
                onChange={(e) => setServiceDiscount(e.target.value)}
              />
              <button type="submit">Применить скидку</button>
            </form>
          </div>

          <div className="admin-box">
            <h2>Персональные купоны пользователей</h2>
            <table className="user-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Email</th>
                  <th>Текущий купон</th>
                  <th>Выбрать купон</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id}>
                    <td><b>{u.name}</b></td>
                    <td>{u.email}</td>
                    <td>{u.coupon_code ? `${u.coupon_code} (-${u.coupon_percent}%)` : "нет"}</td>
                    <td>
                      <select
                        value={userCouponMap[u.user_id] ?? (u.coupon_id || "")}
                        onChange={(e) =>
                          setUserCouponMap({ ...userCouponMap, [u.user_id]: e.target.value })
                        }
                      >
                        <option value="">Без купона</option>
                        {coupons.map((cpn) => (
                          <option key={cpn.coupon_id} value={cpn.coupon_id}>
                            {cpn.code} ({cpn.percent}%)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button onClick={() => handleAssignCoupon(u.user_id)}>
                        Назначить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
