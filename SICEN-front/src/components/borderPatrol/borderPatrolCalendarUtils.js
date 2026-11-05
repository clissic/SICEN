export function pad(n) {
  return String(n).padStart(2, "0");
}

export function isoDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function formatDisplay(iso) {
  const [y, m, d] = String(iso || "").split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function weekdayLong(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  const name = new Date(y, m - 1, d).toLocaleDateString("es-UY", {
    weekday: "long",
  });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function monthCells(year, month) {
  const first = new Date(year, month - 1, 1);
  const padCount = (first.getDay() + 6) % 7;
  const count = daysInMonth(year, month);
  const cells = [];
  for (let i = 0; i < padCount; i += 1) cells.push(null);
  for (let day = 1; day <= count; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shiftMonth(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function monthLabel(year, month) {
  const raw = new Date(year, month - 1, 1).toLocaleDateString("es-UY", {
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const raw = new Date(2026, index, 1).toLocaleDateString("es-UY", {
    month: "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
});

export function yearChoices(selectedYear) {
  const now = new Date().getFullYear();
  const start = Math.max(2000, Math.min(now - 5, selectedYear));
  const end = Math.min(2100, Math.max(now + 10, selectedYear));
  const years = [];
  for (let value = start; value <= end; value += 1) years.push(value);
  return years;
}

export const WEEKDAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
