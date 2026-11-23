export function formatDuration(totalMinutes) {
  const m = Math.max(0, Number(totalMinutes) || 0);
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${hours} ч ${mins} мин`;
}

export function formatPrice(val) {
  const num = Number(val) || 0;
  return Number(num.toFixed(2));
}

export function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return "Укажите контактный номер телефона";
  }
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length !== 10 && digits.length !== 11) {
    return "Номер телефона должен содержать 10 или 11 цифр (например, +7 (999) 123-45-67)";
  }

  const uniqueDigits = new Set(digits.split(""));
  if (uniqueDigits.size <= 2) {
    return "Некорректный номер телефона (не может состоять из одинаковых цифр)";
  }

  if (
    digits.includes("12345678") ||
    digits.includes("98765432") ||
    digits.includes("01234567")
  ) {
    return "Некорректный номер телефона (фиктивная последовательность цифр)";
  }

  if (digits.length === 11 && digits[0] !== "7" && digits[0] !== "8") {
    return "Номер телефона из 11 цифр должен начинаться с +7 или 8";
  }

  const mainPart = digits.length === 11 ? digits.slice(1) : digits;
  if (!mainPart.startsWith("9") && !mainPart.startsWith("4") && !mainPart.startsWith("8") && !mainPart.startsWith("3")) {
    return "Некорректный код оператора или региона в номере телефона";
  }

  return null;
}
