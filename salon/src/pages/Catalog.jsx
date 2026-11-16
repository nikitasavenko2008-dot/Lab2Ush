import { useEffect, useState } from "react";
import { apiGet } from "../api";
import CategoryFilter from "../components/CategoryFilter";
import ServiceCard from "../components/ServiceCard";
import Loader from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import "./Catalog.css";

export default function Catalog() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [cats, svcs] = await Promise.all([
        apiGet("/api/categories"),
        apiGet("/api/services"),
      ]);
      setCategories(cats);
      setServices(svcs);
    } catch (err) {
      setError(err.message || "Ошибка загрузки данных с API");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function toggleCat(catId) {
    setSelectedCats((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  }

  const filtered = selectedCats.length === 0
    ? services
    : services.filter((s) => selectedCats.includes(s.category_id));

  const discountedCount = services.filter((s) => s.discount_percent > 0).length;

  return (
    <div className="catalog-page">
      {/* Требование 6: Aside слева с чекбоксами */}
      <CategoryFilter
        categories={categories}
        selected={selectedCats}
        onToggle={toggleCat}
      />

      <div className="catalog-main">
        <div className="catalog-top">
          <h1>Каталог услуг</h1>
          <div className="discount-tag">
            Товары со скидкой: {discountedCount} из {services.length} (30%)
          </div>
        </div>

        {/* Требование 4: Сообщения о загрузке и ошибках */}
        {loading && <Loader text="Загрузка каталога с сервера API..." />}
        {error && <ErrorBox message={error} />}

        {!loading && !error && (
          <div className="cards-grid">
            {filtered.map((s) => (
              <ServiceCard key={s.service_id} service={s} />
            ))}
            {filtered.length === 0 && (
              <p>Нет услуг в выбранных категориях</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
