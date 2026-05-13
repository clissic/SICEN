/** Paleta compartida para gráficas de barras horizontales (usuarios). */
export const USERS_BAR_COLORS = [
  "rgba(13, 110, 253, 0.78)",
  "rgba(25, 135, 84, 0.78)",
  "rgba(102, 16, 242, 0.72)",
  "rgba(214, 51, 132, 0.72)",
  "rgba(253, 126, 20, 0.75)",
  "rgba(32, 201, 151, 0.78)",
  "rgba(108, 117, 125, 0.78)",
];

/** Misma familia de tonos, más luminosos para fondos oscuros (`card` en modo oscuro). */
export const USERS_BAR_COLORS_DARK = [
  "rgba(110, 168, 254, 0.92)",
  "rgba(117, 216, 164, 0.92)",
  "rgba(203, 162, 247, 0.9)",
  "rgba(241, 149, 188, 0.92)",
  "rgba(255, 183, 122, 0.92)",
  "rgba(118, 226, 206, 0.92)",
  "rgba(206, 212, 218, 0.88)",
];

const CHART_FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function usersBarColorAt(index, isDark) {
  const pal = isDark ? USERS_BAR_COLORS_DARK : USERS_BAR_COLORS;
  return pal[index % pal.length];
}

/** Opciones Chart.js alineadas entre jerarquía y unidad (título desactivado; va en card-header). */
export function horizontalUsersBarOptions(isDark = false) {
  const tickX = isDark ? "#adb5bd" : "#495057";
  const tickY = isDark ? "#e9ecef" : "#212529";
  const gridX = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)";

  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: isDark ? "rgba(248, 249, 250, 0.96)" : "rgba(33, 37, 41, 0.92)",
        titleColor: isDark ? "#212529" : "#fff",
        bodyColor: isDark ? "#212529" : "#fff",
        borderColor: isDark ? "rgba(0, 0, 0, 0.12)" : "transparent",
        borderWidth: isDark ? 1 : 0,
        titleFont: { size: 12, family: CHART_FONT_FAMILY },
        bodyFont: { size: 13, family: CHART_FONT_FAMILY },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.x;
            return ` ${v} usuario${v === 1 ? "" : "s"}`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: { size: 11, family: CHART_FONT_FAMILY },
          color: tickX,
        },
        grid: { color: gridX },
        border: { display: false },
      },
      y: {
        ticks: {
          autoSkip: false,
          font: { size: 11, family: CHART_FONT_FAMILY },
          color: tickY,
        },
        grid: { display: false },
        border: { display: false },
      },
    },
  };
}

/** Altura del contenedor según cantidad de barras (misma lógica en ambas gráficas). */
export function horizontalUsersChartHeight(labelCount) {
  const rowPx = 32;
  const paddingPx = 80;
  return Math.max(220, labelCount * rowPx + paddingPx);
}
