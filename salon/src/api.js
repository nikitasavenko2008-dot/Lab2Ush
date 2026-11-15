let loadingMap = {};

function setLoading(key, value) {
  loadingMap[key] = value;
}

export async function apiGet(url, token) {
  setLoading(url, { loading: true, error: null });
  try {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    const data = await res.json();
    setLoading(url, { loading: false, error: null });
    return data;
  } catch (err) {
    setLoading(url, { loading: false, error: err.message });
    throw err;
  }
}

export async function apiPost(url, body, token) {
  setLoading(url, { loading: true, error: null });
  try {
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    const data = await res.json();
    setLoading(url, { loading: false, error: null });
    return data;
  } catch (err) {
    setLoading(url, { loading: false, error: err.message });
    throw err;
  }
}

export async function apiPut(url, body, token) {
  setLoading(url, { loading: true, error: null });
  try {
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    const data = await res.json();
    setLoading(url, { loading: false, error: null });
    return data;
  } catch (err) {
    setLoading(url, { loading: false, error: err.message });
    throw err;
  }
}

export function useLoading(key) {
  return loadingMap[key] || { loading: false, error: null };
}
