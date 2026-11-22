/**
 * Контекст приложения «ShopContext»
 * Управляет состоянием авторизации, серверной корзиной покупок и темой оформления.
 * 
 * В соответствии с требованиями лабораторной работы №4:
 * 1. Корзина хранится на сервере в базе данных (cart_items).
 * 2. Корзина уникальна для каждого пользователя и сохраняется при выходе из аккаунта.
 * 3. Все изменения корзины синхронизируются через API (/api/cart).
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../api";

const ShopContext = createContext();

export function ShopProvider({ children }) {
  // Состояние авторизации (токен и объект пользователя)
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("auth");
      return saved ? JSON.parse(saved) : { token: null, user: null };
    } catch {
      return { token: null, user: null };
    }
  });

  // Состояние серверной корзины пользователя
  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);

  // Тема оформления (светлая / темная)
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });

  // При изменении темы переключаем класс dark на теге <html> и <body>
  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Загрузка серверной корзины при авторизации пользователя
  const fetchCart = useCallback(async (token) => {
    if (!token) {
      setCart([]);
      return;
    }
    setCartLoading(true);
    setCartError(null);
    try {
      const data = await apiGet("/api/cart", token);
      setCart(Array.isArray(data) ? data : []);
    } catch (err) {
      setCartError(err.message);
    } finally {
      setCartLoading(false);
    }
  }, []);

  // Синхронизация состояния авторизации с LocalStorage и загрузка корзины
  useEffect(() => {
    if (auth.token) {
      localStorage.setItem("auth", JSON.stringify(auth));
      fetchCart(auth.token);
    } else {
      localStorage.removeItem("auth");
      setCart([]);
    }
  }, [auth, fetchCart]);

  // Слушатель события истечения/недействительности токена
  useEffect(() => {
    const onAuthExpired = () => {
      setAuth({ token: null, user: null });
      setCart([]);
    };
    window.addEventListener("auth-expired", onAuthExpired);
    return () => window.removeEventListener("auth-expired", onAuthExpired);
  }, []);

  // Добавление услуги в серверную корзину
  const addToCart = async (service, quantity = 1) => {
    if (!auth.token) {
      return { error: "Для добавления услуги в корзину необходимо войти в аккаунт" };
    }
    try {
      const updatedCart = await apiPost(
        "/api/cart",
        { service_id: service.service_id, quantity },
        auth.token
      );
      setCart(Array.isArray(updatedCart) ? updatedCart : []);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  };

  // Изменение количества позиции в корзине
  const updateQty = async (cartItemId, newQuantity) => {
    if (!auth.token) return;
    try {
      if (newQuantity <= 0) {
        await apiDelete(`/api/cart/${cartItemId}`, auth.token);
        setCart((prev) => prev.filter((item) => item.cart_item_id !== cartItemId));
      } else {
        const updatedCart = await apiPut(
          `/api/cart/${cartItemId}`,
          { quantity: newQuantity },
          auth.token
        );
        setCart(Array.isArray(updatedCart) ? updatedCart : []);
      }
    } catch (err) {
      console.error("Ошибка при обновлении количества в корзине:", err.message);
    }
  };

  // Удаление позиции из корзины
  const removeFromCart = async (cartItemId) => {
    if (!auth.token) return;
    try {
      await apiDelete(`/api/cart/${cartItemId}`, auth.token);
      setCart((prev) => prev.filter((item) => item.cart_item_id !== cartItemId));
    } catch (err) {
      console.error("Ошибка при удалении из корзины:", err.message);
    }
  };

  // Полная очистка корзины (после оформления заказа или по кнопке пользователя)
  const clearCart = async () => {
    if (!auth.token) {
      setCart([]);
      return;
    }
    try {
      await apiDelete("/api/cart", auth.token);
      setCart([]);
    } catch (err) {
      console.error("Ошибка при очистке корзины:", err.message);
    }
  };

  // Авторизация
  const login = (token, user) => {
    setAuth({ token, user });
  };

  // Выход из аккаунта (согласно требованиям, данные корзины остаются сохраненными на сервере в БД)
  const logout = () => {
    setAuth({ token: null, user: null });
    setCart([]);
  };

  // Обновление профиля пользователя
  const updateUser = (updatedUser, updatedToken) => {
    setAuth((prev) => ({
      token: updatedToken || prev.token,
      user: { ...prev.user, ...updatedUser },
    }));
  };

  // Подсчет общего количества позиций в корзине
  const cartCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  // Подсчет общей суммы корзины с учетом персональных скидок на услуги
  const cartTotal = cart.reduce((sum, item) => {
    const rawPrice = Number(item.price) || 0;
    const discount = Number(item.discount_percent) || 0;
    const effectiveUnitPrice = discount > 0 ? Math.round(rawPrice * (1 - discount / 100)) : rawPrice;
    return sum + effectiveUnitPrice * (Number(item.quantity) || 1);
  }, 0);

  return (
    <ShopContext.Provider
      value={{
        auth,
        login,
        logout,
        updateUser,
        cart,
        cartCount,
        cartTotal,
        cartLoading,
        cartError,
        fetchCart: () => fetchCart(auth.token),
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        isDark,
        toggleTheme,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  return useContext(ShopContext);
}
