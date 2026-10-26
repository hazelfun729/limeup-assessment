import sanitize from "sanitize-html";

export function cleanReportHtml(raw: string | null | undefined) {
  let html = (raw || "").trim();
  const pre = html.match(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/i);
  if (pre) html = pre[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  const fence = html.match(/^```(?:html)?\s*\n([\s\S]*?)\n```\s*$/i);
  if (fence) html = fence[1];
  return sanitize(html, {
    allowedTags: sanitize.defaults.allowedTags,
    allowedAttributes: { "*": ["class"], a: ["href", "title"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"] },
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
    parseStyleAttributes: false,
  });
}
