
import { useEffect, useState, useCallback } from "react";
import { apiGet } from "../api";
import { useShop } from "../context/ShopContext";
import CategoryFilter from "../components/CategoryFilter";
import ServiceCard from "../components/ServiceCard";
import ReviewModal from "../components/ReviewModal";
import Loader from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import "./Catalog.css";

export default function Catalog() {
  const { auth } = useShop();

  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [reviewService, setReviewService] = useState(null);

  const loadCategories = async () => {
    try {
      const cats = await apiGet("/api/categories");
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      console.error("Ошибка загрузки категорий:", err.message);
    }
  };

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "all") {
        params.append("category_id", selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }
      if (minPrice) {
        params.append("min_price", minPrice);
      }
      if (maxPrice) {
        params.append("max_price", maxPrice);
      }

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const data = await apiGet(`/api/services${queryString}`);
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Ошибка загрузки услуг с сервера");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, minPrice, maxPrice]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadServices();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadServices]);

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setMinPrice("");
    setMaxPrice("");
    setSearchQuery("");
  };

  return (
    <div className="catalog-container">
      <div className="catalog-simple-header">
        <h1>🍽️ Каталог услуг ресторана и кейтеринга</h1>
        <p>Выездные шеф-повара, официанты, фуршетные сеты, бар и организация банкетов</p>
      </div>

      <div className="catalog-layout">
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onChangeMinPrice={setMinPrice}
          onChangeMaxPrice={setMaxPrice}
          searchQuery={searchQuery}
          onChangeSearchQuery={setSearchQuery}
          onResetFilters={handleResetFilters}
        />

        <main className="catalog-main">
          <div className="catalog-header-bar">
            <div>
              <h1 className="catalog-title">Каталог услуг</h1>
              <span className="services-found-counter">
                Найдено позиций: <strong>{services.length}</strong>
              </span>
            </div>
          </div>

          {loading && <Loader text="Загрузка каталога с сервера API..." />}
          {error && <ErrorBox message={error} />}

          {!loading && !error && (
            <div className="cards-grid">
              {services.map((service) => (
                <ServiceCard
                  key={service.service_id}
                  service={service}
                  onOpenReviews={() => setReviewService(service)}
                />
              ))}

              {services.length === 0 && (
                <div className="empty-catalog-box">
                  <span className="empty-icon">🍽️</span>
                  <h3>Услуг по вашему запросу не найдено</h3>
                  <p>Попробуйте изменить параметры фильтрации или сбросить фильтры.</p>
                  <button type="button" className="reset-btn-pill" onClick={handleResetFilters}>
                    Сбросить все фильтры
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {reviewService && (
        <ReviewModal
          service={reviewService}
          auth={auth}
          onClose={() => setReviewService(null)}
          onReviewAdded={loadServices}
        />
      )}
    </div>
  );
}
