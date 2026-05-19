import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  horizontalVesselShipTypesBarOptions,
  horizontalVesselShipTypesChartHeight,
  vesselBarColorAt,
} from "../constants/vesselsChartTheme.js";
import { useBootstrapTheme } from "./ThemeToggle.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Barras horizontales: cantidad de buques por etiqueta de tipo (`generalInfo.shipType`).
 * @param {{ label: string, count: number }[]} rows
 */
export function VesselShipTypeBarChart({
  rows,
  loading,
  error,
  emptyMessage,
  datasetLabel = "Buques",
  tooltipSingular = "buque",
  tooltipPlural = "buques",
}) {
  const bsTheme = useBootstrapTheme();
  const isDark = bsTheme === "dark";
  const list = Array.isArray(rows) ? rows : [];
  const labels = list.map((r) => r.label);
  const counts = list.map((r) => r.count);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: datasetLabel,
          data: counts,
          backgroundColor: labels.map((_, i) => vesselBarColorAt(i, isDark)),
          borderWidth: 0,
          borderRadius: 6,
        },
      ],
    }),
    [labels, counts, isDark]
  );

  const options = useMemo(
    () =>
      horizontalVesselShipTypesBarOptions(isDark, {
        tooltipSingular,
        tooltipPlural,
      }),
    [isDark, tooltipSingular, tooltipPlural],
  );

  if (error) {
    return (
      <div className="users-chart-empty text-muted small py-5 text-center">
        No se pudo cargar la gráfica.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="users-chart-empty text-muted small py-5 text-center">
        Cargando…
      </div>
    );
  }

  if (labels.length === 0) {
    return (
      <div className="users-chart-empty text-muted small py-5 text-center">
        {emptyMessage || "No hay datos para mostrar."}
      </div>
    );
  }

  const chartHeight = horizontalVesselShipTypesChartHeight(labels.length);

  return (
    <div
      className="position-relative w-100 flex-grow-1 users-chart-canvas"
      style={{ height: `${chartHeight}px`, minHeight: "220px" }}
    >
      <Bar data={chartData} options={options} />
    </div>
  );
}
