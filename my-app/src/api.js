
async function handleResponse(res) {
  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504 || res.statusText === "Bad Gateway") {
      throw new Error("Сервер выключен");
    }
    let text = "";
    try {
      text = await res.text();
    } catch (_) {}

    if (text.includes("Bad Gateway") || text.includes("ECONNREFUSED") || res.statusText?.includes("Bad Gateway")) {
      throw new Error("Сервер выключен");
    }

    let err = {};
    try {
      err = JSON.parse(text);
    } catch (_) {
      err = { error: text || res.statusText };
    }

    if (res.status === 401) {
      try {
        localStorage.removeItem("auth");
        window.dispatchEvent(new CustomEvent("auth-expired", { detail: err.error }));
      } catch (_) {}
    }

    if (
      err.error === "Bad Gateway" ||
      String(err.error).includes("Bad Gateway") ||
      String(err.error).includes("ECONNREFUSED")
    ) {
      throw new Error("Сервер выключен");
    }
    throw new Error(err.error || res.statusText || "Произошла ошибка при обращении к серверу");
  }
  return await res.json();
}

function handleNetworkError(err) {
  const msg = String(err?.message || "");
  if (
    msg === "Failed to fetch" ||
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Failed to load") ||
    msg.includes("Bad Gateway") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("Load failed")
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
