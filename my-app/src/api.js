/**
 * Модуль клиентских API-запросов
 * Обрабатывает запросы к серверу, проставляет заголовок авторизации Bearer token,
 * а также перехватывает ошибки сети и отключения сервера (502 / Bad Gateway / Network Error).
 */

async function handleResponse(res) {
  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504 || res.statusText === "Bad Gateway") {
      throw new Error("Сервер выключен");
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    if (err.error === "Bad Gateway" || err.error?.includes("ECONNREFUSED")) {
      throw new Error("Сервер выключен");
    }
    throw new Error(err.error || res.statusText || "Произошла ошибка при обращении к серверу");
  }
  return await res.json();
}

function handleNetworkError(err) {
  if (
    err.message === "Failed to fetch" ||
    err.message?.includes("NetworkError") ||
    err.message?.includes("Failed to load") ||
    err.message === "Bad Gateway"
  ) {
    return new Error("Сервер выключен");
  }
  return err;
}

export async function apiGet(url, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, { headers });
    return await handleResponse(res);
  } catch (err) {
    throw handleNetworkError(err);
  }
}

export async function apiPost(url, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return await handleResponse(res);
  } catch (err) {
    throw handleNetworkError(err);
  }
}

export async function apiPut(url, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    return await handleResponse(res);
  } catch (err) {
    throw handleNetworkError(err);
  }
}

export async function apiDelete(url, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers,
    });
    return await handleResponse(res);
  } catch (err) {
    throw handleNetworkError(err);
  }
}
