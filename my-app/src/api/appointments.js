const API_URL = "/api/appointments";

export async function getAppointments() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      if (response.status === 502 || response.status === 503 || response.statusText === "Bad Gateway") {
        throw new Error("Сервер выключен");
      }
      throw new Error("Ошибка при получении записей");
    }
    return await response.json();
  } catch (err) {
    if (err.message === "Failed to fetch" || err.message === "Bad Gateway") {
      throw new Error("Сервер выключен");
    }
    throw err;
  }
}

export async function getAppointmentById(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) {
      if (response.status === 502 || response.status === 503 || response.statusText === "Bad Gateway") {
        throw new Error("Сервер выключен");
      }
      throw new Error("Ошибка при получении записи");
    }
    return await response.json();
  } catch (err) {
    if (err.message === "Failed to fetch" || err.message === "Bad Gateway") {
      throw new Error("Сервер выключен");
    }
    throw err;
  }
}

export async function createAppointment(appointmentData) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appointmentData),
    });
    if (!response.ok) {
      if (response.status === 502 || response.status === 503 || response.statusText === "Bad Gateway") {
        throw new Error("Сервер выключен");
      }
      throw new Error("Ошибка при создании записи");
    }
    return await response.json();
  } catch (err) {
    if (err.message === "Failed to fetch" || err.message === "Bad Gateway") {
      throw new Error("Сервер выключен");
    }
    throw err;
  }
}
