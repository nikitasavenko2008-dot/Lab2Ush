import { createContext, useContext, useState, useEffect } from "react";

const ShopContext = createContext();

export function ShopProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("auth");
      return saved ? JSON.parse(saved) : { token: null, user: null };
    } catch {
      return { token: null, user: null };
    }
  });

  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (auth.token) {
      localStorage.setItem("auth", JSON.stringify(auth));
    } else {
      localStorage.removeItem("auth");
    }
  }, [auth]);

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

  const addToCart = (service) => {
    const exists = cart.find((i) => i.service_id === service.service_id);
    if (exists) {
      setCart(cart.map((i) => i.service_id === service.service_id ? { ...i, qty: (i.qty || 1) + 1 } : i));
    } else {
      setCart([...cart, { ...service, qty: 1 }]);
    }
  };

  const removeFromCart = (serviceId) => {
    setCart(cart.filter((i) => i.service_id !== serviceId));
  };

  const updateQty = (serviceId, delta) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.service_id === serviceId) {
          const next = (i.qty || 1) + delta;
          return { ...i, qty: next < 1 ? 1 : next };
        }
        return i;
      })
    );
  };

  const clearCart = () => setCart([]);

  const login = (token, user) => setAuth({ token, user });
  const logout = () => setAuth({ token: null, user: null });

  return (
    <ShopContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        auth,
        login,
        logout,
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
