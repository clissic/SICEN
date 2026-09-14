import { useEffect, useId, useMemo, useRef, useState } from "react";
import manualMarkdown from "../../content/centinela-manual-usuario.md?raw";
import {
  parseCentinelaHelpMarkdown,
} from "../../utils/centinelaHelpMarkdown.js";

/**
 * @param {{ type: string, text: string }[]} inlines
 */
function InlineNodes({ inlines }) {
  return (inlines || []).map((node, i) => {
    if (node.type === "strong") {
      return <strong key={i}>{node.text}</strong>;
    }
    if (node.type === "em") {
      return <em key={i}>{node.text}</em>;
    }
    return <span key={i}>{node.text}</span>;
  });
}

/**
 * @param {{ type: string, inlines?: any, items?: any, id?: string, title?: string, variant?: string, lead?: boolean }[]} blocks
 * @param {string} idPrefix
 */
function SectionBlocks({ blocks, idPrefix }) {
  return (blocks || []).map((block, i) => {
    if (block.type === "h3") {
      return (
        <h3
          key={i}
          id={`${idPrefix}-${block.id}`}
          className="centinela-help-modal__h3"
        >
          <InlineNodes inlines={block.inlines} />
        </h3>
      );
    }
    if (block.type === "ul" || block.type === "ol") {
      const Tag = block.type === "ol" ? "ol" : "ul";
      return (
        <Tag
          key={i}
          className={[
            "centinela-help-modal__list",
            block.type === "ol" ? "centinela-help-modal__list--ol" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {(block.items || []).map((item, j) => (
            <li key={j}>
              <InlineNodes inlines={item} />
            </li>
          ))}
        </Tag>
      );
    }
    if (block.type === "callout") {
      const variant = block.variant || "nota";
      const labels = {
        tip: "Consejo",
        aviso: "Aviso",
        clave: "Importante",
        ok: "Listo",
        nota: "Nota",
      };
      return (
        <aside
          key={i}
          className={`centinela-help-modal__callout centinela-help-modal__callout--${variant}`}
          role="note"
        >
          <span className="centinela-help-modal__callout-label">
            {labels[variant] || labels.nota}
          </span>
          <div className="centinela-help-modal__callout-body">
            <InlineNodes inlines={block.inlines} />
          </div>
        </aside>
      );
    }
    return (
      <p
        key={i}
        className={[
          "centinela-help-modal__p",
          block.lead ? "centinela-help-modal__p--lead" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <InlineNodes inlines={block.inlines} />
      </p>
    );
  });
}

/**
 * Modal grande con índice en acordeón y contenido del manual de usuario.
 *
 * @param {{ open: boolean, onClose: () => void }} props
 */
export function CentinelaHelpModal({ open, onClose }) {
  const baseId = useId();
  const accordionId = `${baseId}-acc`;
  const contentRef = useRef(null);
  const skipScrollTopRef = useRef(false);
  const parsed = useMemo(
    () => parseCentinelaHelpMarkdown(manualMarkdown),
    []
  );
  const [activeSectionId, setActiveSectionId] = useState(
    () => parsed.sections[0]?.id || ""
  );
  const [openAccordionId, setOpenAccordionId] = useState(
    () => parsed.sections[0]?.id || ""
  );
  const [pendingSubId, setPendingSubId] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (!activeSectionId && parsed.sections[0]) {
      setActiveSectionId(parsed.sections[0].id);
      setOpenAccordionId(parsed.sections[0].id);
    }
  }, [open, activeSectionId, parsed.sections]);

  useEffect(() => {
    if (!open || !contentRef.current) return;
    if (skipScrollTopRef.current) {
      skipScrollTopRef.current = false;
      return;
    }
    contentRef.current.scrollTop = 0;
  }, [open, activeSectionId]);

  useEffect(() => {
    if (!open || !pendingSubId) return undefined;
    const targetId = pendingSubId;
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`${baseId}-${targetId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingSubId(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [open, pendingSubId, activeSectionId, baseId]);

  if (!open) return null;

  const activeSection =
    parsed.sections.find((s) => s.id === activeSectionId) ||
    parsed.sections[0] ||
    null;

  function selectSection(sectionId, subId = null) {
    skipScrollTopRef.current = Boolean(subId);
    setActiveSectionId(sectionId);
    setOpenAccordionId(sectionId);
    setPendingSubId(subId);
  }

  function toggleAccordion(sectionId) {
    skipScrollTopRef.current = false;
    setOpenAccordionId((prev) => (prev === sectionId ? "" : sectionId));
    setActiveSectionId(sectionId);
    setPendingSubId(null);
  }

  return (
    <>
      <div
        className="modal fade show d-block centinela-help-modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
      >
        <div className="modal-dialog modal-xl modal-dialog-centered centinela-help-modal__dialog">
          <div className="modal-content centinela-help-modal__content">
            <div className="centinela-help-modal__header">
              <div className="centinela-help-modal__header-text">
                <p className="centinela-help-modal__eyebrow">El Centinela</p>
                <h2 id={`${baseId}-title`} className="centinela-help-modal__title">
                  {parsed.title}
                </h2>
                <p className="centinela-help-modal__subtitle">
                  Guía para operadores — leé a tu ritmo, sección por sección
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar manual"
                onClick={onClose}
              />
            </div>

            <div className="centinela-help-modal__body">
              <nav
                className="centinela-help-modal__nav"
                aria-label="Índice del manual"
              >
                <div className="centinela-help-modal__nav-label">Índice</div>
                <p className="centinela-help-modal__nav-hint">
                  Elegí un capítulo. Los subtítulos saltan al apartado.
                </p>
                <div className="accordion accordion-flush" id={accordionId}>
                  {parsed.sections.map((section, index) => {
                    const expanded = openAccordionId === section.id;
                    const isActive = activeSection?.id === section.id;
                    const collapseId = `${accordionId}-c-${index}`;
                    return (
                      <div
                        key={section.id}
                        className={[
                          "accordion-item",
                          "centinela-help-modal__acc-item",
                          isActive ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <h3 className="accordion-header">
                          <button
                            type="button"
                            className={[
                              "accordion-button",
                              "centinela-help-modal__acc-btn",
                              expanded ? "" : "collapsed",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            aria-expanded={expanded}
                            aria-controls={collapseId}
                            onClick={() => toggleAccordion(section.id)}
                          >
                            <span className="centinela-help-modal__acc-num">
                              {index + 1}
                            </span>
                            <span>{section.title}</span>
                          </button>
                        </h3>
                        <div
                          id={collapseId}
                          className={[
                            "accordion-collapse",
                            "collapse",
                            expanded ? "show" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div className="accordion-body centinela-help-modal__acc-body">
                            <button
                              type="button"
                              className="centinela-help-modal__sublink centinela-help-modal__sublink--section"
                              onClick={() => selectSection(section.id)}
                            >
                              Ver sección completa
                            </button>
                            {section.subsections.map((sub) => (
                              <button
                                key={sub.id}
                                type="button"
                                className="centinela-help-modal__sublink"
                                onClick={() =>
                                  selectSection(section.id, sub.id)
                                }
                              >
                                {sub.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </nav>

              <div
                ref={contentRef}
                className="centinela-help-modal__content-pane"
                tabIndex={0}
              >
                {activeSection ? (
                  <article
                    className="centinela-help-modal__article"
                    aria-labelledby={`${baseId}-sec-title`}
                  >
                    <h2
                      id={`${baseId}-sec-title`}
                      className="centinela-help-modal__h2"
                    >
                      {activeSection.title}
                    </h2>
                    <SectionBlocks
                      blocks={activeSection.blocks}
                      idPrefix={baseId}
                    />
                  </article>
                ) : (
                  <p className="text-muted mb-0">No hay contenido disponible.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="modal-backdrop fade show"
        onClick={onClose}
        aria-hidden
      />
    </>
  );
}
