import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { loadReportDocument, renderReportDocument } from "@/lib/report/document";

export const runtime = "nodejs";

/** The review copy uses the same layout as the delivered report, before publication. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const handbook = await loadReportDocument(id);
  if (!handbook) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  if (!handbook.contentHtml?.trim()) return NextResponse.json({ error: "报告尚未生成" }, { status: 409 });

  const download = request.nextUrl.searchParams.get("download") === "1";
  const path = `/api/admin/reports/${encodeURIComponent(handbook.id)}/document?download=1`;
  const html = await renderReportDocument(handbook, download, false, undefined, path);
  return new NextResponse(html, { headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store",
    "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'",
    ...(download ? { "Content-Disposition": `attachment; filename="growth-report.html"; filename*=UTF-8''${encodeURIComponent((handbook.assessment.studentName || "孩子") + "-成长导航报告.html")}` } : {}),
  } });
}
