import { createContext, useContext, useState, useReducer, useEffect } from "react";

const ShopContext = createContext();

// ---- корзина (useReducer) ----
function cartReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const exists = state.find((i) => i.id === action.payload.id);
      if (exists) {
        return state.map((i) =>
          i.id === action.payload.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...state, { ...action.payload, qty: 1 }];
    }
    case "REMOVE":
      return state.filter((i) => i.id !== action.payload);
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

// ---- тема ----
function getSavedTheme() {
  try {
    return localStorage.getItem("theme") === "dark";
  } catch {
    return false;
  }
}

// ---- авторизация ----
function getSavedAuth() {
  try {
    const raw = localStorage.getItem("auth");
    if (!raw) return { token: null, user: null };
    return JSON.parse(raw);
  } catch {
    return { token: null, user: null };
  }
}

export function ShopProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [isDark, setIsDark] = useState(getSavedTheme);
  const [auth, setAuth] = useState(getSavedAuth);

  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    if (auth.token) {
      localStorage.setItem("auth", JSON.stringify(auth));
    } else {
      localStorage.removeItem("auth");
    }
  }, [auth]);

  // ---- корзина ----
  const addToCart = (service) =>
    dispatch({ type: "ADD", payload: service });
  const removeFromCart = (id) =>
    dispatch({ type: "REMOVE", payload: id });
  const clearCart = () => dispatch({ type: "CLEAR" });

  // ---- тема ----
  const toggleTheme = () => setIsDark((d) => !d);

  // ---- авторизация ----
  const login = (token, user) => setAuth({ token, user });
  const logout = () => setAuth({ token: null, user: null });

  return (
    <ShopContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        isDark,
        toggleTheme,
        auth,
        login,
        logout,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  return useContext(ShopContext);
}
