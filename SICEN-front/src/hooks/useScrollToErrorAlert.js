import { useEffect, useRef } from "react";
import { scrollErrorAlertIntoView } from "../utils/scrollErrorAlertIntoView.js";

/**
 * Devuelve un `ref` para el div de error. Cuando `error` pasa a truthy,
 * hace scroll automático hasta ese elemento.
 */
export function useScrollToErrorAlert(error) {
  const ref = useRef(null);

  useEffect(() => {
    if (!error) return;
    scrollErrorAlertIntoView(ref.current);
  }, [error]);

  return ref;
}
