import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  if(!await getAdminSession()) return NextResponse.json({error:"未登录"},{status:401});
  const {id}=await params;
  const h=await prisma.growthHandbook.findFirst({where:{OR:[{id},{assessmentId:id}]}});
  if(!h) return NextResponse.json({error:"报告不存在"},{status:404});
  const records=await prisma.siteConfig.findMany({where:{key:{startsWith:`report:run:${h.assessmentId}:`}},orderBy:{updatedAt:'desc'},take:20});
  const runs=records.map(r=>JSON.parse(r.value));
  if(request.nextUrl.searchParams.get('download')==='1') return new NextResponse(JSON.stringify({runs},null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Disposition':'attachment; filename="report-audit.json"'}});
  return NextResponse.json({runs:runs.map(r=>({runId:r.runId,state:r.state,startedAt:r.startedAt,elapsedMs:r.elapsedMs,model:r.returnedModel||r.model,usage:r.usage,prompts:r.prompts,notes:r.notes,error:r.error,bodyCharacters:r.bodyCharacters}))},{headers:{'Cache-Control':'no-store'}});
}
