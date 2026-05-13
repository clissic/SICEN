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
  horizontalUsersBarOptions,
  horizontalUsersChartHeight,
  usersBarColorAt,
} from "../constants/usersChartTheme.js";
import { useBootstrapTheme } from "./ThemeToggle.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Barras horizontales: usuarios por sigla de unidad.
 * `byUnit`: { unit: string, count: number }[]
 */
export function UsersUnitBarChart({ byUnit, loading, error }) {
  const bsTheme = useBootstrapTheme();
  const isDark = bsTheme === "dark";
  const rows = Array.isArray(byUnit) ? byUnit : [];
  const labels = rows.map((r) => r.unit);
  const counts = rows.map((r) => r.count);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Usuarios",
          data: counts,
          backgroundColor: labels.map((_, i) => usersBarColorAt(i, isDark)),
          borderWidth: 0,
          borderRadius: 6,
        },
      ],
    }),
    [labels, counts, isDark]
  );

  const options = useMemo(
    () => horizontalUsersBarOptions(isDark),
    [isDark]
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
        No hay datos por unidad para mostrar.
      </div>
    );
  }

  const chartHeight = horizontalUsersChartHeight(labels.length);

  return (
    <div
      className="position-relative w-100 flex-grow-1 users-chart-canvas"
      style={{ height: `${chartHeight}px`, minHeight: "220px" }}
    >
      <Bar data={chartData} options={options} />
    </div>
  );
}
