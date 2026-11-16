async function handleResponse(res) {
  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504 || res.statusText === "Bad Gateway") {
      throw new Error("Сервер выключен");
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    if (err.error === "Bad Gateway") {
      throw new Error("Сервер выключен");
    }
    throw new Error(err.error || res.statusText);
  }
  return await res.json();
}

function handleNetworkError(err) {
  if (err.message === "Failed to fetch" || err.message?.includes("NetworkError") || err.message === "Bad Gateway") {
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
