import { useEffect } from "react";

export const SICEN_POPOVER_ATTR = "data-sicen-popover";

/**
 * Inicializa popovers Bootstrap en todo el documento para elementos con
 * `data-sicen-popover="texto"`. Sustituye al atributo HTML `title` nativo.
 * Montar una sola vez (p. ej. en Layout).
 */
export function useDocumentSicenPopovers() {
  useEffect(() => {
    const Bootstrap = globalThis.bootstrap;
    if (!Bootstrap?.Popover) return undefined;

    function ensure(el) {
      if (!(el instanceof Element)) return;
      const content = el.getAttribute(SICEN_POPOVER_ATTR);
      if (!content) {
        Bootstrap.Popover.getInstance(el)?.dispose();
        return;
      }
      if (Bootstrap.Popover.getInstance(el)) return;
      try {
        new Bootstrap.Popover(el, {
          trigger: "hover",
          placement:
            el.getAttribute("data-sicen-popover-placement") || "top",
          container: "body",
          sanitize: true,
          content: () => el.getAttribute(SICEN_POPOVER_ATTR) || "",
        });
      } catch {
        /* noop */
      }
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
        Bootstrap.Popover.getInstance(root)?.dispose();
      }
      root.querySelectorAll?.(`[${SICEN_POPOVER_ATTR}]`).forEach((el) => {
        Bootstrap.Popover.getInstance(el)?.dispose();
      });
    }

    scan(document.body);

    const obs = new MutationObserver((mutations) => {
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
          if (n.nodeType === 1) disposeTree(n);
        }
      }
    });

    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [SICEN_POPOVER_ATTR],
    });

    return () => {
      obs.disconnect();
      document.querySelectorAll(`[${SICEN_POPOVER_ATTR}]`).forEach((el) => {
        Bootstrap.Popover.getInstance(el)?.dispose();
      });
    };
  }, []);
}
