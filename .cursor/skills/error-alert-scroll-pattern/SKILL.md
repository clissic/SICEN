---
name: error-alert-scroll-pattern
description: >-
  Muestra alertas de error en SICEN-front con scroll automático hasta el div
  rojo (ErrorAlert + scrollErrorAlertIntoView). Usar siempre que se construya,
  modifique o revise un mensaje de fallo al usuario (formulario, modal, listado,
  login, carga fallida, validación de submit) con Bootstrap alert-danger, o
  cuando aparezca un setErr / setFormErr / setError que deba verse en pantalla.
---

# Alertas de error con scroll automático

Cada vez que salte una alerta de error — un div en rojo para enterar al
usuario de algo que, por ejemplo, por cierta razón falló o no se pudo
ejecutar — **debe** hacerse scroll automático hasta el div para que el
usuario pueda verlo.

No crear `<div className="alert alert-danger …">` a mano. Usar el
componente compartido.

## Helper / API

| Pieza | Path | Uso |
|---|---|---|
| `ErrorAlert` | `SICEN-front/src/components/ErrorAlert.jsx` | **Preferido.** Renderiza el alert y scrollea al aparecer/cambiar el mensaje. |
| `scrollErrorAlertIntoView` | `SICEN-front/src/utils/scrollErrorAlertIntoView.js` | Bajo nivel; scrollea un `HTMLElement`. |
| `useScrollToErrorAlert` | `SICEN-front/src/hooks/useScrollToErrorAlert.js` | Solo si el markup no puede ser `ErrorAlert` (ref manual). |

```jsx
import { ErrorAlert } from "../components/ErrorAlert.jsx";

// Reemplaza: {err ? <div className="alert alert-danger py-2">{err}</div> : null}
<ErrorAlert message={err} />

// Clases extra del diseño original
<ErrorAlert
  message={statsErr}
  className="alert alert-danger py-2 small mb-3"
/>
```

`ErrorAlert` no renderiza nada si `message`/`children` es falsy. Default:
`className="alert alert-danger py-2"`, `role="alert"`. El scroll usa
`behavior: "smooth"` y `block: "nearest"` (sirve en página y dentro de
`modal-body` con overflow).

## Reglas

1. **Todo fallo visible al usuario** con estética de alert rojo → `ErrorAlert`.
2. **No** usar `<div className="alert alert-danger">` suelto.
3. **No** aplicar este patrón a `alert-success`, `alert-warning`,
   `alert-secondary`, botones `btn-danger`, ni a `text-danger` de labels /
   hints de campo (salvo que el mensaje sea un bloque de error de acción).
4. Preservar `className` custom (`small`, `mb-0`, `mt-3`, etc.) cuando el
   diseño original las tenía.
5. En modales con formulario largo, el contenedor scrolleable (p. ej.
   `.modal-body`) debe permitir overflow; el `scrollIntoView` del alert
   mueve ese contenedor.

## Template

```jsx
const [err, setErr] = useState("");

async function onSubmit(e) {
  e.preventDefault();
  setErr("");
  try {
    await saveSomething(payload);
  } catch (e) {
    setErr(e?.message || "No se pudo guardar.");
  }
}

return (
  <>
    <ErrorAlert message={err} />
    <form onSubmit={onSubmit}>{/* … */}</form>
  </>
);
```

Markup custom inevitable:

```jsx
import { useScrollToErrorAlert } from "../hooks/useScrollToErrorAlert.js";

const errorRef = useScrollToErrorAlert(err);
return err ? (
  <div ref={errorRef} className="alert alert-danger py-2" role="alert">
    {err}
  </div>
) : null;
```

## Antipatrones

- Setear el error y confiar en que el usuario scrollee hasta arriba del form.
- Duplicar `scrollIntoView` / `scrollPageToTop` ad-hoc para el mismo caso.
- Usar Swal solo para errores de validación de formulario que ya tienen
  alert inline (salvo flujos de delete, que siguen `delete-flow-pattern`).

## Ejemplos vivos

- Formularios / auth: `LoginPage`, `SignupPage`, `NewUserPage`, `UpdateDataPage`
- Modales: `SportMovementFormModal`, `SportMovementCloseModal`,
  `InspectionCompletionModal`, `SeafarerMetadataAddModal`
- Listados: `SportMovementsDispatchesPage`, `AllShipsPage`, `AllCarFinesPage`
- Componente: `SICEN-front/src/components/ErrorAlert.jsx`
