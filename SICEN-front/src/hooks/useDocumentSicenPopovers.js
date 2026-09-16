import { useEffect } from "react";

export const SICEN_POPOVER_ATTR = "data-sicen-popover";
export const SICEN_POPOVER_TOUCH_ATTR = "data-sicen-popover-touch";

const TOUCH_MQ =
  "(hover: none), (pointer: coarse), (max-width: 767.98px)";

function prefersClickTrigger() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(TOUCH_MQ).matches;
}

/**
 * Inicializa popovers Bootstrap en todo el documento para elementos con
 * `data-sicen-popover="texto"`. Sustituye al atributo HTML `title` nativo.
 * Montar una sola vez (p. ej. en Layout).
 *
 * Desktop: trigger hover.
 * Mobile/touch: solo si `data-sicen-popover-touch="click"` (p. ej. íconos
 * de info); los botones de menú no abren popover.
 */
export function useDocumentSicenPopovers() {
  useEffect(() => {
    const Bootstrap = globalThis.bootstrap;
    if (!Bootstrap?.Popover) return undefined;

    function hideAll() {
      document.querySelectorAll(`[${SICEN_POPOVER_ATTR}]`).forEach((el) => {
        Bootstrap.Popover.getInstance(el)?.hide();
      });
      document.querySelectorAll("body > .popover").forEach((tip) => {
        tip.remove();
      });
    }

    function hideAllExcept(exceptEl) {
      document.querySelectorAll(`[${SICEN_POPOVER_ATTR}]`).forEach((el) => {
        if (el === exceptEl) return;
        Bootstrap.Popover.getInstance(el)?.hide();
      });
      document.querySelectorAll("body > .popover").forEach((tip) => {
        const id = tip.getAttribute("id");
        if (!id) {
          tip.remove();
          return;
        }
        const owner = document.querySelector(
          `[${SICEN_POPOVER_ATTR}][aria-describedby="${id}"]`
        );
        if (owner && owner !== exceptEl) tip.remove();
      });
    }

    function ensure(el) {
      if (!(el instanceof Element)) return;
      const content = el.getAttribute(SICEN_POPOVER_ATTR);
      if (!content) {
        Bootstrap.Popover.getInstance(el)?.dispose();
        return;
      }

      const touchUi = prefersClickTrigger();
      const touchPolicy = el.getAttribute(SICEN_POPOVER_TOUCH_ATTR);
      // En mobile, los botones de menú no llevan tip; solo opt-in (íconos info).
      if (touchUi && touchPolicy !== "click") {
        Bootstrap.Popover.getInstance(el)?.dispose();
        return;
      }

      if (Bootstrap.Popover.getInstance(el)) return;
      try {
        new Bootstrap.Popover(el, {
          trigger: touchUi ? "click" : "hover",
          placement:
            el.getAttribute("data-sicen-popover-placement") || "top",
          container: "body",
          sanitize: true,
          // Hover: demora 1 s en aparecer. Click (mobile info): sin demora.
          delay: touchUi ? 0 : { show: 1000, hide: 0 },
          content: () => el.getAttribute(SICEN_POPOVER_ATTR) || "",
        });
      } catch {
        /* noop */
      }
    }

    function remountAll() {
      document.querySelectorAll(`[${SICEN_POPOVER_ATTR}]`).forEach((el) => {
        Bootstrap.Popover.getInstance(el)?.dispose();
        ensure(el);
      });
    }

    function scan(root) {
      if (!root) return;
      if (root instanceof Element && root.hasAttribute(SICEN_POPOVER_ATTR)) {
        ensure(root);
      }
      root.querySelectorAll?.(`[${SICEN_POPOVER_ATTR}]`).forEach(ensure);
    }

    function disposeTree(root) {
      if (!root || !(root instanceof Element)) return;
      if (root.hasAttribute(SICEN_POPOVER_ATTR)) {
        const inst = Bootstrap.Popover.getInstance(root);
        inst?.hide();
        inst?.dispose();
      }
      root.querySelectorAll?.(`[${SICEN_POPOVER_ATTR}]`).forEach((el) => {
        const inst = Bootstrap.Popover.getInstance(el);
        inst?.hide();
        inst?.dispose();
      });
    }

    scan(document.body);

    function onPointerDown(e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(".popover")) return;

      const trigger = t.closest(`[${SICEN_POPOVER_ATTR}]`);
      if (trigger && Bootstrap.Popover.getInstance(trigger)) {
        hideAllExcept(trigger);
        return;
      }
      hideAll();
    }

    document.addEventListener("pointerdown", onPointerDown, true);

    const mq = window.matchMedia(TOUCH_MQ);
    const onMq = () => remountAll();
    mq.addEventListener("change", onMq);

    const obs = new MutationObserver((mutations) => {
      let removedTrigger = false;
      for (const m of mutations) {
        if (m.type === "attributes" && m.target instanceof Element) {
          const inst = Bootstrap.Popover.getInstance(m.target);
          if (inst) inst.dispose();
          ensure(m.target);
          continue;
        }
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) scan(n);
        }
        for (const n of m.removedNodes) {
          if (n.nodeType === 1) {
            disposeTree(n);
            removedTrigger = true;
          }
        }
      }
      if (removedTrigger) {
        document.querySelectorAll("body > .popover").forEach((tip) => {
          tip.remove();
        });
      }
    });

    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [SICEN_POPOVER_ATTR, SICEN_POPOVER_TOUCH_ATTR],
    });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      mq.removeEventListener("change", onMq);
      obs.disconnect();
      document.querySelectorAll(`[${SICEN_POPOVER_ATTR}]`).forEach((el) => {
        Bootstrap.Popover.getInstance(el)?.dispose();
      });
      document.querySelectorAll("body > .popover").forEach((tip) => {
        tip.remove();
      });
    };
  }, []);
}
