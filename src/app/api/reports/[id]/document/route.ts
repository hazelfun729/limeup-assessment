import { NextRequest, NextResponse } from "next/server";
import { assessmentAccess } from "@/lib/security/assessment";
import { loadReportDocument, renderReportDocument } from "@/lib/report/document";

export const runtime = "nodejs";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const handbook=await loadReportDocument(id);
  if(!handbook) return NextResponse.json({error:"报告不存在"},{status:404});
  const denied=await assessmentAccess(handbook.assessmentId,false);
  if(denied) return denied;
  if(handbook.status!=="SENT") return NextResponse.json({error:"报告尚在制作或审核中"},{status:409});
  if(!handbook.contentHtml) return NextResponse.json({error:"报告尚未生成"},{status:409});
  const download=request.nextUrl.searchParams.get('download')==='1';
  const html=await renderReportDocument(handbook,download);
  return new NextResponse(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store',
    'Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'",
    ...(download?{'Content-Disposition':`attachment; filename="growth-report.html"; filename*=UTF-8''${encodeURIComponent((handbook.assessment.studentName||'孩子')+'-成长导航报告.html')}`}:{})}});
}
