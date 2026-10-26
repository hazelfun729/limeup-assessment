import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { loadReportDocument, renderReportEmail } from "@/lib/report/document";

export const runtime = "nodejs";

/** Browser approximation of the exact email HTML; actual mail uses a CID attachment. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const handbook = await loadReportDocument(id);
  if (!handbook) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  if (!handbook.contentHtml?.trim()) return NextResponse.json({ error: "报告尚未生成" }, { status: 409 });
  const logo = (await readFile(join(process.cwd(), "public/logo-banner.png"))).toString("base64");
  const html = (await renderReportEmail(handbook, true)).replace(
    /cid:limeup-report-logo/g,
    `data:image/png;base64,${logo}`,
  );
  return new NextResponse(html, { headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store",
    "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'",
  } });
}
