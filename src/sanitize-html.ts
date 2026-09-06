const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "sub", "sup",
  "ul", "ol", "li", "blockquote", "h2", "h3", "h4", "span", "a",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
};

const UNSAFE_HREF = /^\s*(javascript|data|vbscript):/i;

function scrub(node: Element) {
  for (const child of Array.from(node.children)) {
    const tag = child.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      child.replaceWith(...Array.from(child.childNodes));
      continue;
    }
    const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      if (!allowed.has(name) || name.startsWith("on")) {
        child.removeAttribute(attr.name);
        continue;
      }
      if (name === "href" && UNSAFE_HREF.test(attr.value)) {
        child.removeAttribute(attr.name);
      }
    }
    scrub(child);
  }
}

export function sanitizeArticleHtml(html: string | null | undefined): string {
  if (!html?.trim()) return "";
  if (typeof document === "undefined") {
    return html.replace(/<\s*\/?\s*(script|style|iframe|object|embed)[^>]*>/gi, "");
  }
  const host = document.createElement("div");
  host.innerHTML = html;
  for (const el of Array.from(host.querySelectorAll("script,style,iframe,object,embed"))) {
    el.remove();
  }
  scrub(host);
  return host.innerHTML;
}

export function looksLikeHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?[a-z][\s\S]*>/i.test(value);
}
