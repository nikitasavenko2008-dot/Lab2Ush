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

  // Категории
  const [newCatName, setNewCatName] = useState("");

  // Скидка на услугу
  const [discSvcId, setDiscSvcId] = useState("");
  const [discVal, setDiscVal] = useState("");

  // Купон пользователю
  const [userCouponId, setUserCouponId] = useState("");

  useEffect(() => {
    if (!auth.token || auth.user?.role !== "admin") {
      navigate("/login");
      return;
    }
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [cats, svcs, usrs, cpns] = await Promise.all([
          apiGet("/api/categories", auth.token),
          apiGet("/api/services", auth.token),
          apiGet("/api/users", auth.token),
          apiGet("/api/coupons", auth.token),
        ]);
        setCategories(cats);
        setServices(svcs);
        setUsers(usrs);
        setCoupons(cpns);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [auth.token]);

  async function addCategory() {
    if (!newCatName.trim()) return;
    try {
      const cat = await apiPost("/api/categories", { name: newCatName }, auth.token);
      setCategories((prev) => [...prev, cat]);
      setNewCatName("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function setServiceDiscount() {
    if (!discSvcId || !discVal) return;
    try {
      await apiPut(`/api/services/${discSvcId}/discount`, { percent: +discVal }, auth.token);
      setDiscVal("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function assignCoupon(userId) {
    if (!userCouponId) return;
    try {
      await apiPut(`/api/users/${userId}/coupon`, { coupon_id: +userCouponId }, auth.token);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin">
      <div className="admin-header">
        <h1>Администратор</h1>
        <button className="logout-btn" onClick={() => { logout(); navigate("/"); }}>
          Выйти
        </button>
      </div>

      {loading && <Loader />}
      {error && <ErrorBox message={error} />}

      {!loading && (
        <>
          {/* --- Категории --- */}
          <section className="admin-section">
            <h2>Категории</h2>
            <div className="admin-input-row">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Название новой категории"
              />
              <button onClick={addCategory}>Добавить</button>
            </div>
            <div className="tag-list">
              {categories.map((c) => (
                <span key={c.id} className="tag">
                  {c.name}
                </span>
              ))}
            </div>
          </section>

          {/* --- Скидки на услуги --- */}
          <section className="admin-section">
            <h2>Общая скидка на услугу</h2>
            <div className="admin-input-row">
              <select value={discSvcId} onChange={(e) => setDiscSvcId(e.target.value)}>
                <option value="">— Выберите услугу —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.discount_percent > 0 ? `скидка ${s.discount_percent}%` : "нет скидки"})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                max="90"
                value={discVal}
                onChange={(e) => setDiscVal(e.target.value)}
                placeholder="%"
              />
              <button onClick={setServiceDiscount}>Применить</button>
            </div>
          </section>

          {/* --- Выдача купонов --- */}
          <section className="admin-section">
            <h2>Персональные скидки (купон)</h2>
            <div className="admin-input-row">
              <select value={userCouponId} onChange={(e) => setUserCouponId(e.target.value)}>
                <option value="">— Купон —</option>
                {coupons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} ({c.percent}%)
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-input-row">
              <span>Назначить купон пользователю:</span>
              {users.map((u) => (
                <button
                  key={u.id}
                  className="assign-btn"
                  onClick={() => assignCoupon(u.id)}
                >
                  {u.name} — сейчас: {u.coupon_code || "нет"}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
