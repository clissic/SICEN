import { useEffect, useRef } from "react";
import { scrollErrorAlertIntoView } from "../utils/scrollErrorAlertIntoView.js";

/**
 * Alert Bootstrap de error con scroll automático al aparecer / cambiar.
 * Si `message` (o `children`) es falsy, no renderiza nada.
 *
 * @example
 * <ErrorAlert message={err} />
 * <ErrorAlert message={statsErr} className="alert alert-danger py-2 small mb-3" />
 */
export function ErrorAlert({
  message,
  children,
  className = "alert alert-danger py-2",
  role = "alert",
}) {
  const ref = useRef(null);
  const content = children ?? message;

  useEffect(() => {
    if (!content) return;
    scrollErrorAlertIntoView(ref.current);
  }, [content]);

  if (!content) return null;

  return (
    <div ref={ref} className={className} role={role}>
      {content}
    </div>
  );
}
