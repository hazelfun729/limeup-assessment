"use client";
import { useEffect, useState } from "react";
type Run = {runId:string;state:string;model:string;elapsedMs?:number;error?:string;startedAt:string;bodyCharacters?:number;usage?:{prompt_tokens?:number;completion_tokens?:number;total_tokens?:number;completion_tokens_details?:{reasoning_tokens?:number}};prompts?:Array<{version:number}>};
export function ReportAudit({id,refresh}:{id:string;refresh:boolean}) {
  const [run,setRun]=useState<Run|null>(null);
  const [isStale,setIsStale]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    async function read(){const response=await fetch(`/api/admin/reports/${id}/audit`);if(response.ok){const data=await response.json();if(!cancelled){const latest:Run|null=data.runs?.[0]||null;setRun(latest);setIsStale(!!latest&&latest.state==="RUNNING"&&Date.now()-Date.parse(latest.startedAt)>25*60_000);}}}
    void read().catch(()=>{});const timer=setInterval(()=>{void read().catch(()=>{});},8000);
    return ()=>{cancelled=true;clearInterval(timer);};
  },[id,refresh]);
  if(!run)return null;
  const reasoning=run.usage?.completion_tokens_details?.reasoning_tokens;
  return <section className="mx-6 my-4 rounded-xl border bg-white p-4 text-sm" aria-live="polite">
    <strong>生成记录 · {run.state==="RUNNING"?"生成中":run.state==="SUCCEEDED"?"已完成，待审核":"失败，未自动重试"}</strong>
    <p className="mt-2 text-gray-600">{run.model} · 提示词版本 {run.prompts?.map(p=>p.version).join(" / ")} · {run.elapsedMs?`${Math.round(run.elapsedMs/1000)} 秒`:"等待模型返回"}</p>
    {run.usage&&<p className="mt-1 text-gray-600">输入 {run.usage.prompt_tokens} · 思考 {reasoning??"未提供"} · 输出 {run.usage.completion_tokens} · 总 token {run.usage.total_tokens} · 正文 {run.bodyCharacters??"—"} 字符</p>}
    {run.error&&<p className="mt-2 text-red-700">{run.error}</p>}
    {isStale&&<p className="mt-2 text-amber-700">本次运行可能已中断，请核查记录后手动重试。</p>}
  </section>;
}
