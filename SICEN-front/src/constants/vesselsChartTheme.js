import {
  horizontalUsersBarOptions,
  horizontalUsersChartHeight,
  usersBarColorAt,
} from "./usersChartTheme.js";

/** Misma paleta que usuarios; índice por posición en la gráfica. */
export function vesselBarColorAt(index, isDark) {
  return usersBarColorAt(index, isDark);
}

/** Barras horizontales: mismas escalas que usuarios, texto de tooltip para buques. */
export function horizontalVesselShipTypesBarOptions(isDark = false) {
  const base = horizontalUsersBarOptions(isDark);
  return {
    ...base,
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.x;
            return ` ${v} buque${v === 1 ? "" : "s"}`;
          },
        },
      },
    },
  };
}

export { horizontalUsersChartHeight as horizontalVesselShipTypesChartHeight };
