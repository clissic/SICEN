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
  USERS_BAR_COLORS,
} from "../constants/usersChartTheme.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Barras horizontales: usuarios por sigla de unidad.
 * `byUnit`: { unit: string, count: number }[]
 */
export function UsersUnitBarChart({ byUnit, loading, error }) {
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

  const rows = Array.isArray(byUnit) ? byUnit : [];
  const labels = rows.map((r) => r.unit);
  const counts = rows.map((r) => r.count);

  if (labels.length === 0) {
    return (
      <div className="users-chart-empty text-muted small py-5 text-center">
        No hay datos por unidad para mostrar.
      </div>
    );
  }

  const data = {
    labels,
    datasets: [
      {
        label: "Usuarios",
        data: counts,
        backgroundColor: labels.map((_, i) => USERS_BAR_COLORS[i % USERS_BAR_COLORS.length]),
        borderWidth: 0,
        borderRadius: 6,
      },
    ],
  };

  const chartHeight = horizontalUsersChartHeight(labels.length);
  const options = horizontalUsersBarOptions();

  return (
    <div
      className="position-relative w-100 flex-grow-1 users-chart-canvas"
      style={{ height: `${chartHeight}px`, minHeight: "220px" }}
    >
      <Bar data={data} options={options} />
    </div>
  );
}
