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

const CHART_FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Opciones Chart.js alineadas entre jerarquía y unidad (título desactivado; va en card-header). */
export function horizontalUsersBarOptions() {
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
        backgroundColor: "rgba(33, 37, 41, 0.92)",
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
          color: "#495057",
        },
        grid: { color: "rgba(0, 0, 0, 0.06)" },
        border: { display: false },
      },
      y: {
        ticks: {
          autoSkip: false,
          font: { size: 11, family: CHART_FONT_FAMILY },
          color: "#212529",
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
