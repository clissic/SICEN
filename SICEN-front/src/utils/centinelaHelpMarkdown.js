/**
 * Parser liviano del manual de El Centinela (subset Markdown).
 * Soporta: # (título doc), ## secciones, ### subtítulos,
 * párrafos, listas (- / * / 1.), blockquotes/callouts (> tip|aviso|clave|…),
 * **negrita**, *cursiva*.
 */

/**
 * @param {string} title
 * @returns {string}
 */
export function slugifyHelpId(title) {
  return String(title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * @typedef {{ type: "text", text: string } | { type: "strong", text: string } | { type: "em", text: string }} InlineNode
 * @typedef {{ type: "p", inlines: InlineNode[], lead?: boolean } | { type: "ul", items: InlineNode[][] } | { type: "ol", items: InlineNode[][] } | { type: "h3", id: string, title: string, inlines: InlineNode[] } | { type: "callout", variant: string, inlines: InlineNode[] }} ContentBlock
 * @typedef {{ id: string, title: string, subsections: { id: string, title: string }[], blocks: ContentBlock[] }} HelpSection
 */

/**
 * @param {string} text
 * @returns {InlineNode[]}
 */
export function parseInlineMarkdown(text) {
  const src = String(text || "");
  /** @type {InlineNode[]} */
  const nodes = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) {
      nodes.push({ type: "text", text: src.slice(last, m.index) });
    }
    const token = m[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push({ type: "strong", text: token.slice(2, -2) });
    } else {
      nodes.push({ type: "em", text: token.slice(1, -1) });
    }
    last = m.index + token.length;
  }
  if (last < src.length) {
    nodes.push({ type: "text", text: src.slice(last) });
  }
  return nodes.length ? nodes : [{ type: "text", text: src }];
}

/**
 * @param {string} raw
 * @returns {{ variant: string, text: string }}
 */
function parseCalloutLine(raw) {
  const body = String(raw || "").replace(/^>\s?/, "").trim();
  const m = body.match(/^(tip|aviso|clave|ok)\s*[:—-]\s*(.+)$/i);
  if (m) {
    return { variant: m[1].toLowerCase(), text: m[2].trim() };
  }
  return { variant: "nota", text: body };
}

/**
 * @param {string} body
 * @returns {{ subsections: { id: string, title: string }[], blocks: ContentBlock[] }}
 */
function parseSectionBody(body) {
  const lines = String(body || "").replace(/\r\n/g, "\n").split("\n");
  /** @type {{ id: string, title: string }[]} */
  const subsections = [];
  /** @type {ContentBlock[]} */
  const blocks = [];
  /** @type {string[]} */
  let paraLines = [];
  /** @type {string[] | null} */
  let listItems = null;
  /** @type {"ul" | "ol" | null} */
  let listKind = null;
  let sawLead = false;

  function flushPara() {
    if (!paraLines.length) return;
    const text = paraLines.join(" ").trim();
    paraLines = [];
    if (!text) return;
    const lead = !sawLead;
    sawLead = true;
    blocks.push({ type: "p", inlines: parseInlineMarkdown(text), lead });
  }

  function flushList() {
    if (!listItems || !listItems.length || !listKind) {
      listItems = null;
      listKind = null;
      return;
    }
    blocks.push({
      type: listKind,
      items: listItems.map((item) => parseInlineMarkdown(item)),
    });
    listItems = null;
    listKind = null;
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      flushList();
      continue;
    }

    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3) {
      flushPara();
      flushList();
      const title = h3[1].trim();
      const id = slugifyHelpId(title);
      subsections.push({ id, title });
      blocks.push({
        type: "h3",
        id,
        title,
        inlines: parseInlineMarkdown(title),
      });
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushPara();
      flushList();
      const { variant, text } = parseCalloutLine(trimmed);
      if (text) {
        blocks.push({
          type: "callout",
          variant,
          inlines: parseInlineMarkdown(text),
        });
        sawLead = true;
      }
      continue;
    }

    const ol = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      flushPara();
      if (listKind !== "ol") {
        flushList();
        listKind = "ol";
        listItems = [];
      }
      listItems.push(ol[1].trim());
      continue;
    }

    const li = trimmed.match(/^[-*]\s+(.+)$/);
    if (li) {
      flushPara();
      if (listKind !== "ul") {
        flushList();
        listKind = "ul";
        listItems = [];
      }
      listItems.push(li[1].trim());
      continue;
    }

    flushList();
    paraLines.push(trimmed);
  }

  flushPara();
  flushList();

  // Solo el primer párrafo de la sección (antes de h3/listas) es lead
  let firstP = true;
  for (const b of blocks) {
    if (b.type === "p") {
      b.lead = firstP;
      firstP = false;
    } else if (b.type === "h3" || b.type === "ul" || b.type === "ol" || b.type === "callout") {
      firstP = false;
    }
  }

  return { subsections, blocks };
}

/**
 * @param {string} markdown
 * @returns {{ title: string, sections: HelpSection[] }}
 */
export function parseCentinelaHelpMarkdown(markdown) {
  const src = String(markdown || "").replace(/\r\n/g, "\n").trim();
  let docTitle = "Manual de El Centinela";
  const parts = src.split(/^##\s+/m);
  /** @type {HelpSection[]} */
  const sections = [];

  const preamble = parts[0] || "";
  const h1 = preamble.match(/^#\s+(.+)$/m);
  if (h1) docTitle = h1[1].trim();

  for (let i = 1; i < parts.length; i += 1) {
    const chunk = parts[i];
    const nl = chunk.indexOf("\n");
    const title = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const body = nl === -1 ? "" : chunk.slice(nl + 1);
    if (!title) continue;
    const id = slugifyHelpId(title);
    const { subsections, blocks } = parseSectionBody(body);
    sections.push({ id, title, subsections, blocks });
  }

  return { title: docTitle, sections };
}
