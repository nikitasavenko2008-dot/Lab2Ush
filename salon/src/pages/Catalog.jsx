import { useEffect, useState } from "react";
import { useShop } from "../context/ShopContext";
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
  const { addToCart } = useShop();

  useEffect(() => {
    async function load() {
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
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleCat(id) {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Фильтрация по выбранным категориям
  const filtered =
    selectedCats.length === 0
      ? services
      : services.filter((s) => selectedCats.includes(s.category_id));

  return (
    <div className="catalog">
      <CategoryFilter
        categories={categories}
        selected={selectedCats}
        onToggle={toggleCat}
      />
      <div className="catalog-main">
        <h1>Каталог услуг</h1>
        {loading && <Loader />}
        {error && <ErrorBox message={error} />}
        {!loading && !error && (
          <div className="cards">
            {filtered.map((s) => (
              <ServiceCard key={s.id} service={s} />
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
