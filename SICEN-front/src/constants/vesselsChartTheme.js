import {
  horizontalUsersBarOptions,
  horizontalUsersChartHeight,
  usersBarColorAt,
} from "./usersChartTheme.js";

/** Misma paleta que usuarios; índice por posición en la gráfica. */
export function vesselBarColorAt(index, isDark) {
  return usersBarColorAt(index, isDark);
}

/** Barras horizontales: mismas escalas que usuarios; tooltip configurable. */
export function horizontalVesselShipTypesBarOptions(
  isDark = false,
  { tooltipSingular = "buque", tooltipPlural = "buques" } = {},
) {
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
            const word = v === 1 ? tooltipSingular : tooltipPlural;
            return ` ${v} ${word}`;
          },
        },
      },
    },
  };
}

export { horizontalUsersChartHeight as horizontalVesselShipTypesChartHeight };
