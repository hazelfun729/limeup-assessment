export type ReportChapter = { number: number; title: string; html: string };

// Split at chapter headings only. Subheadings, lists and tables stay intact.
export function splitChapters(html: string): ReportChapter[] {
  const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map(m=>({index:m.index!,end:m.index!+m[0].length,title:m[1].replace(/<[^>]*>/g,"").trim()}))
    .filter(h=>/^第[一二三四五六1-6]章/.test(h.title));
  return headings.map((h,i)=>({number:"一二三四五六".includes(h.title[1])?"一二三四五六".indexOf(h.title[1])+1:Number(h.title[1]),title:h.title,
    // The chapter layout already draws its own rule. A trailing Markdown ---
    // would otherwise leave two empty-looking lines between chapters.
    html:html.slice(h.end,headings[i+1]?.index??html.length).replace(/(?:\s*<hr\b[^>]*\/?>(?:\s|&nbsp;)*)+$/gi, "")}));
}
