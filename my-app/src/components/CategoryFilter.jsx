/**
 * Компонент фильтрации каталога (Лаб 4, разд. 2.1)
 * Фильтрует по категориям (подгружаемым через API c JOIN),
 * а также по диапазону цен и строке поиска.
 */
import "./CategoryFilter.css";

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  minPrice,
  maxPrice,
  onChangeMinPrice,
  onChangeMaxPrice,
  searchQuery,
  onChangeSearchQuery,
  onResetFilters,
}) {
  return (
    <aside className="aside-filter">
      <div className="filter-block">
        <h3 className="filter-title">🔍 Поиск</h3>
        <input
          type="text"
          className="search-input"
          placeholder="Название или описание..."
          value={searchQuery}
          onChange={(e) => onChangeSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-block">
        <h3 className="filter-title">🏷️ Категории</h3>
        <div className="cat-list">
          <button
            type="button"
            className={`cat-pill-btn ${selectedCategory === "all" ? "active" : ""}`}
            onClick={() => onSelectCategory("all")}
          >
            Все категории
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category_id}
              type="button"
              className={`cat-pill-btn ${selectedCategory === String(cat.category_id) ? "active" : ""}`}
              onClick={() => onSelectCategory(String(cat.category_id))}
            >
              <span>{cat.name}</span>
              {cat.services_count !== undefined && (
                <span className="cat-count">({cat.services_count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-block">
        <h3 className="filter-title">💰 Цена (₽)</h3>
        <div className="price-inputs-row">
          <input
            type="number"
            className="price-filter-input"
            placeholder="От"
            value={minPrice}
            onChange={(e) => onChangeMinPrice(e.target.value)}
            min="0"
          />
          <span className="price-separator">—</span>
          <input
            type="number"
            className="price-filter-input"
            placeholder="До"
            value={maxPrice}
            onChange={(e) => onChangeMaxPrice(e.target.value)}
            min="0"
          />
        </div>
      </div>

      {(selectedCategory !== "all" || minPrice || maxPrice || searchQuery) && (
        <button type="button" className="reset-filters-btn" onClick={onResetFilters}>
          Сбросить фильтры
        </button>
      )}
    </aside>
  );
}
