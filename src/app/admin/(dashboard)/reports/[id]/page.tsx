"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sparkles,
  Eye,
  PanelLeftOpen,
  PanelLeftClose,
  ChevronDown,
} from "lucide-react";
import { ReportAudit } from "@/components/report-audit";
import { Button } from "@/components/ui/button";

// ==========================================
// Types
// ==========================================

type SystemScoreEntry = { score: number; level: string };
type DimensionScoreEntry = { score: number; level: string; name: string };
type ModuleScoreEntry = { score: number; level: string; name: string };

type ReportDetail = {
  status?: string;
  paymentId?: string;
  handbook?: {
    id: string;
    assessmentId: string;
    status: string;
    contentHtml: string | null;
    aiRawOutput: string | null;
    version: number;
    createdAt: string;
  };
  delivery?: { status: string; error: string | null; sentAt: string | null; to: string } | null;
  jobIssue?: string | null;
  user: { email: string; phone: string | null; emailVerified?: boolean };
  assessment: {
    studentName: string | null;
    parentName: string | null;
    grade: string | null;
    studentGender: string | null;
  };
  profile: {
    learningMode: string;
    learningModeName: string | null;
    learningModeEmoji: string | null;
    systemScores: Record<string, SystemScoreEntry>;
    dimensionScores: Record<string, DimensionScoreEntry>;
    moduleScores: Record<string, ModuleScoreEntry>;
    strengths: Array<{ code: string; score: number }> | null;
    weaknesses: Array<{ code: string; score: number }> | null;
    growthFocus: string | null;
    growthFocusDetail: string | null;
    summary: string | null;
  } | null;
  answers: Array<{
    questionOrder: number;
    questionContent: string;
    answer: string;
    score: number | null;
    module: string;
    dimension: string;
    system: string;
    isReverseScored: boolean;
  }>;
  payment: { status: string; amount: number; confirmedAt: string | null } | null;
};

// ==========================================
// Constants
// ==========================================

const ANSWER_LABELS: Record<string, string> = {
  ALWAYS: "非常符合",
  OFTEN: "比较符合",
  SOMETIMES: "比较不符合",
  RARELY: "非常不符合",
  UNKNOWN: "不了解",
};

const SYSTEM_INFO: Record<string, { name: string; icon: string; dimensions: string[] }> = {
  motivation: { name: "学习动力", icon: "🎯", dimensions: ["DR_INNER", "DR_CONF", "DR_START"] },
  ability: { name: "学习能力", icon: "🧠", dimensions: ["AB_PLAN", "AB_THINK", "AB_REFLECT"] },
  perseverance: { name: "学习毅力", icon: "💪", dimensions: ["PE_DURABLE", "PE_EMOTION", "PE_RESILIENCE"] },
};

const SYSTEM_ORDER = ["motivation", "ability", "perseverance"] as const;

// ==========================================
// Helpers
// ==========================================


function getBarColor(level: string): string {
  if (level === "强") return "#86b930";
  if (level === "中") return "#f59e0b";
  return "#ef4444";
}

function getSystemTagStyle(level: string): React.CSSProperties {
  if (level === "强") return { background: "#dcfce7", color: "#15803d" };
  if (level === "中") return { background: "#fef3c7", color: "#b45309" };
  return { background: "#fee2e2", color: "#dc2626" };
}

// ==========================================
// Sub-Components
// ==========================================

function ProgressBar({ score, level, height = 8 }: { score: number; level: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = getBarColor(level);
  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 200 ${height}`} preserveAspectRatio="none">
        <rect x="0" y="0" width="200" height={height} rx={height / 2} fill="#f3f4f6" />
        <rect x="0" y="0" width={pct * 2} height={height} rx={height / 2} fill={color} />
      </svg>
    </div>
  );
}

function RadarChart({ scores }: { scores: { motivation: number; ability: number; perseverance: number } }) {
  const cx = 120, cy = 110, r = 85;
  const top = { x: cx, y: cy - r };
  const bottomLeft = { x: cx - r * Math.sin(Math.PI / 3), y: cy + r * Math.cos(Math.PI / 3) };
  const bottomRight = { x: cx + r * Math.sin(Math.PI / 3), y: cy + r * Math.cos(Math.PI / 3) };

  function getPoint(vertex: { x: number; y: number }, pct: number) {
    const ratio = pct / 100;
    return { x: cx + (vertex.x - cx) * ratio, y: cy + (vertex.y - cy) * ratio };
  }

  function polygonPoints(v1: { x: number; y: number }, v2: { x: number; y: number }, v3: { x: number; y: number }, pct: number) {
    const p1 = getPoint(v1, pct), p2 = getPoint(v2, pct), p3 = getPoint(v3, pct);
    return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
  }

  const dM = getPoint(top, scores.motivation);
  const dAb = getPoint(bottomRight, scores.ability);
  const dPe = getPoint(bottomLeft, scores.perseverance);
  const dataPath = `M ${dM.x} ${dM.y} L ${dAb.x} ${dAb.y} L ${dPe.x} ${dPe.y} Z`;

  return (
    <svg viewBox="0 0 240 230" width="220" height="210" className="mx-auto block">
      {[25, 50, 75, 100].map((lv) => (
        <polygon key={lv} points={polygonPoints(top, bottomLeft, bottomRight, lv)} fill="none" stroke="#c6dfa0" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.7" />
      ))}
      <line x1={cx} y1={cy} x2={top.x} y2={top.y} stroke="#c6dfa0" strokeWidth="0.8" />
      <line x1={cx} y1={cy} x2={bottomLeft.x} y2={bottomLeft.y} stroke="#c6dfa0" strokeWidth="0.8" />
      <line x1={cx} y1={cy} x2={bottomRight.x} y2={bottomRight.y} stroke="#c6dfa0" strokeWidth="0.8" />
      <path d={dataPath} fill="#d2e659" fillOpacity="0.3" stroke="#6a9b1e" strokeWidth="2" />
      {[dM, dAb, dPe].map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#6a9b1e" stroke="#fff" strokeWidth="1.5" />
      ))}
      <text x={cx} y={top.y - 12} textAnchor="middle" className="text-[11px] font-medium" fill="#374151">学习动力</text>
      <text x={bottomLeft.x - 10} y={bottomLeft.y + 18} textAnchor="end" className="text-[11px] font-medium" fill="#374151">学习毅力</text>
      <text x={bottomRight.x + 10} y={bottomRight.y + 18} textAnchor="start" className="text-[11px] font-medium" fill="#374151">学习能力</text>
      <text x={dM.x + 6} y={dM.y - 5} className="text-[10px] font-semibold" fill="#4a7c00">{scores.motivation}</text>
      <text x={dAb.x + 6} y={dAb.y + 3} className="text-[10px] font-semibold" fill="#4a7c00">{scores.ability}</text>
      <text x={dPe.x - 26} y={dPe.y + 3} className="text-[10px] font-semibold" fill="#4a7c00">{scores.perseverance}</text>
    </svg>
  );
}

// ==========================================
// Report CSS (same as /report/[id])
// ==========================================

const REPORT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');

.report-prose { max-width: 760px; }
.report-prose h1 { font-family: "Noto Serif SC", "Songti SC", "STSong", serif; font-size: 1.5rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; color: #111827; padding-left: 12px; border-left: 4px solid #6a9b1e; }
.report-prose h2 { font-family: "Noto Serif SC", "Songti SC", "STSong", serif; font-size: 1.25rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; color: #111827; padding-left: 12px; border-left: 4px solid #86b930; }
.report-prose h3 { font-family: "Noto Serif SC", "Songti SC", "STSong", serif; font-size: 1.1rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #1f2937; padding-left: 10px; border-left: 3px solid #a3cc52; }
.report-prose h4 { font-size: 1rem; font-weight: 600; margin-top: 1.2rem; margin-bottom: 0.5rem; color: #374151; }
.report-prose p { margin-bottom: 1.2rem; line-height: 1.9; color: #374151; }
.report-prose ul, .report-prose ol { margin-bottom: 1.2rem; padding-left: 1.5rem; }
.report-prose li { margin-bottom: 0.5rem; line-height: 1.85; color: #374151; }
.report-prose ul li::marker { color: #86b930; }
.report-prose ol li::marker { color: #6a9b1e; font-weight: 600; }
.report-prose table { width: 100%; border-collapse: collapse; margin: 1.2rem 0; font-size: 0.9rem; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
.report-prose th, .report-prose td { padding: 10px 14px; border: 1px solid #e5e7eb; text-align: left; line-height: 1.6; }
.report-prose th { background: #f8fdf0; font-weight: 600; color: #374151; }
.report-prose tr:nth-child(even) td { background: #fafafa; }
.report-prose strong, .report-prose b { font-weight: 600; color: #111827; }
.report-prose blockquote { border-left: 4px solid #86b930; padding: 12px 16px; margin: 1.2rem 0; background: #f8fdf0; border-radius: 0 8px 8px 0; color: #4b5563; font-style: italic; }
.report-prose blockquote p { margin-bottom: 0.5rem; }
.report-prose blockquote p:last-child { margin-bottom: 0; }
.report-prose code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.88em; }
.report-prose hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
`;

// ==========================================
// Main Page
// ==========================================

export default function ReportReviewPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [data, setData] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"report" | "answers">("report");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedDims, setExpandedDims] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const [checkingMail, setCheckingMail] = useState(false);
  const [mailHealth, setMailHealth] = useState<{ ok: boolean; message: string } | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [reportId]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchReport(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchReport]);

  const handleStatusChange = async (status: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const result = await res.json();
        alert(result.error || "更新失败");
      }
      await fetchReport();
    } catch { alert("请求失败，请稍后重试"); }
    setSaving(false);
  };

  const handleSend = async () => {
    if (!data?.handbook) return;
    setSaving(true);
    setSendMessage("正在向邮件服务提交报告，请稍候…");
    try {
      const res = await fetch(`/api/admin/reports/${data.handbook.id}/send`, { method: "POST" });
      const result = await res.json();
      setSendMessage(res.ok ? `邮件服务已接受报告，收件地址：${result.delivery.to}` : result.error || "发送失败，请核查邮件记录");
      await fetchReport();
    } catch {
      setSendMessage("请求中断，请先刷新核对投递状态，避免重复发送");
    }
    setSaving(false);
  };

  const handleCheckMail = async () => {
    setCheckingMail(true);
    setMailHealth(null);
    try {
      const res = await fetch("/api/admin/mail-health", { cache: "no-store" });
      const result = await res.json();
      setMailHealth(res.ok ? result : { ok: false, message: result.error || "邮件服务检测失败" });
    } catch {
      setMailHealth({ ok: false, message: "无法连接本站的邮件检测接口" });
    }
    setCheckingMail(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/generate`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        if (result.warning) alert(result.warning);
        else if (result.outcome === "ALREADY_QUEUED") alert("报告已在生成队列中，请稍后刷新查看。");
        else if (result.outcome === "SKIPPED") alert("报告已有内容，本次没有重新调用 AI。");
        else if (result.queued) alert("报告已进入生成队列，请稍后刷新查看。");
        await fetchReport();
      } else {
        const err = await res.json();
        alert(err.error || "生成失败");
      }
    } catch {
      alert("生成请求失败");
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6 p-8">
        <p className="text-destructive">报告不存在</p>
        <Link href="/admin/reports">
          <Button variant="outline" className="rounded-lg gap-2"><ArrowLeft className="h-4 w-4" />返回列表</Button>
        </Link>
      </div>
    );
  }

  // AWAITING_PAYMENT state — no handbook yet, waiting for payment confirmation
  if (data.status === "AWAITING_PAYMENT") {
    const { user, assessment, answers } = data;
    return (
      <div className="flex h-dvh flex-col bg-[#fafafa]">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/admin/reports" className="text-gray-400 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-gray-900">支付待确认</h1>
              <p className="text-xs text-gray-500">{user.email} · {assessment.studentName || "—"}</p>
            </div>
          </div>
          <Link href="/admin/payments" className="rounded-lg bg-[#6a9b1e] px-3 py-2 text-sm text-white hover:bg-[#5a8518]">
            去核对微信收款
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[820px]">
            <div className="mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-center">
              <p className="text-lg font-semibold text-amber-800">等待支付确认</p>
              <p className="mt-1 text-sm text-amber-600">
                用户已提交付款信息。请先在微信收款账单中核对，再到支付确认页确认订单。
              </p>
            </div>
            <h3 className="mb-3 text-sm font-semibold text-gray-500">原始答卷 ({answers.length} 题)</h3>
            <div className="space-y-2">
              {answers.map((a) => (
                <div key={a.questionOrder} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
                  <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums">{a.questionOrder}</span>
                  <div className="flex-1">
                    <p className="text-gray-900">{a.questionContent}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>{a.system}</span><span>›</span><span>{a.dimension}</span><span>›</span><span>{a.module}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium text-gray-900">{ANSWER_LABELS[a.answer] || a.answer}</p>
                    <p className="text-xs tabular-nums text-gray-500">{a.score !== null ? `${a.score}分` : "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!data.handbook) {
    return (
      <div className="space-y-6 p-8">
        <p className="text-destructive">报告不存在</p>
        <Link href="/admin/reports">
          <Button variant="outline" className="rounded-lg gap-2"><ArrowLeft className="h-4 w-4" />返回列表</Button>
        </Link>
      </div>
    );
  }

  const { handbook, user, assessment, answers, payment } = data;
  const placeholderEmail = /\.(?:local|localhost|invalid|test|example)$/i.test(user.email.split("@")[1] || "");
  const profile = data.profile;
  const html = (handbook.contentHtml || "");

  const sysScores = profile?.systemScores ?? null;
  const sysEntries = sysScores
    ? SYSTEM_ORDER.map((key) => ({ key, ...(sysScores[key] ?? { score: 0, level: "中" }), ...SYSTEM_INFO[key] }))
    : [];

  return (
    <div className="flex h-dvh flex-col bg-[#fafafa]">
      {/* Inject report-prose CSS */}
      <style dangerouslySetInnerHTML={{ __html: REPORT_CSS }} />

      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            title={sidebarOpen ? "收起信息面板" : "展开信息面板"}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <Link href="/admin/reports" className="text-gray-400 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-gray-900">报告审核</h1>
            <p className="text-xs text-gray-500">
              {user.email} · {assessment.studentName || "—"} · 版本 {handbook.version || 1}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/admin/reports/${handbook.id}/document`}
            target="_blank"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <Eye className="h-4 w-4" />
            用户端预览
          </Link>

          {handbook.contentHtml && <a className="rounded-lg border px-3 py-1.5 text-sm" href={`/api/admin/reports/${handbook.id}/document?download=1`}>下载正式 HTML</a>}
          {handbook.contentHtml && <a className="rounded-lg border px-3 py-1.5 text-sm" href={`/api/admin/reports/${handbook.id}/email-preview`} target="_blank" rel="noopener noreferrer" title="用浏览器近似查看邮件正文；不同邮箱仍可能略有差异">邮件版预览</a>}
          <a className="rounded-lg border px-3 py-1.5 text-sm" href={`/api/admin/reports/${handbook.id}/audit?download=1`}>下载生成记录</a>
          {(handbook.status === "REVIEWING" || handbook.status === "SENDING") && (
            <Button variant="outline" size="sm" onClick={handleCheckMail} disabled={checkingMail}>
              {checkingMail ? "检测中…" : "检测邮件服务"}
            </Button>
          )}
          {handbook.status === "ANALYZING" && (
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generating || saving}
              className="gap-1 rounded-lg bg-[#6a9b1e] text-white hover:bg-[#5a8518]"
            >
              {generating ? (
                <><RefreshCw className="h-4 w-4 animate-spin" />生成中...</>
              ) : (
                <><Sparkles className="h-4 w-4" />AI 生成报告</>
              )}
            </Button>
          )}

          {handbook.status === "REVIEWING" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("ANALYZING")}
                disabled={saving || generating}
                className="gap-1 rounded-lg text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                驳回重新生成
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={saving || generating || placeholderEmail || data.user.emailVerified === false}
                className="gap-1 rounded-lg bg-[#6a9b1e] text-white hover:bg-[#5a8518]"
              >
                <CheckCircle className="h-4 w-4" />
                审核通过并发送邮件
              </Button>
            </>
          )}

          {handbook.status === "SENDING" && (
            <Button
              size="sm"
              onClick={handleSend}
              disabled={saving || generating || placeholderEmail || data.user.emailVerified === false || data.delivery?.status === "UNKNOWN" || data.delivery?.status === "SENDING"}
              className="gap-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {data.delivery?.status === "FAILED" ? "重试发送邮件" : "发送报告邮件"}
            </Button>
          )}

          {handbook.status === "SENT" && data.delivery?.status === "SENT" && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              ✓ 已发送
            </span>
          )}

          {handbook.status === "SENT" && data.delivery?.status !== "SENT" && (
            <span className="text-xs font-medium text-amber-700">旧记录缺少可核实的投递凭证</span>
          )}

          {handbook.status !== "ANALYZING" && handbook.status !== "SENDING" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating || saving}
              className="gap-1 rounded-lg"
              title="使用AI重新生成报告"
            >
              <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
              重新生成
            </Button>
          )}
        </div>
      </header>
      {data.jobIssue && <p role="alert" className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">{data.jobIssue}</p>}

      {placeholderEmail && (
        <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-900">
          这份历史记录使用占位邮箱，无法真实发信。请用已验证邮箱的用户报告进行收件测试。
        </p>
      )}

      {sendMessage && (
        <p role="status" className="border-b border-lime-200 bg-lime-50 px-5 py-2 text-sm text-lime-900">{sendMessage}</p>
      )}

      {mailHealth && (
        <p role="status" className={`border-b px-5 py-2 text-sm ${mailHealth.ok ? "border-lime-200 bg-lime-50 text-lime-900" : "border-red-200 bg-red-50 text-red-900"}`}>
          邮件服务检测：{mailHealth.message}
        </p>
      )}

      {data.user.emailVerified === false && (
        <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-900">用户邮箱尚未验证，不能发送报告。</p>
      )}

      {handbook.status === "SENDING" && !placeholderEmail && (
        <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-900">
          {data.delivery?.status === "FAILED" ? `邮件未送达：${data.delivery.error || "请检查邮件配置"}。可以重试。`
            : data.delivery?.status === "SENDING" || data.delivery?.status === "UNKNOWN" ? "邮件结果尚未确认，请先核对邮箱或服务商记录，暂勿重复发送。"
            : "审核已通过，但尚未产生报告邮件记录。请核对收件地址后点击“发送报告邮件”。"}
        </p>
      )}

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Info Sidebar */}
        {sidebarOpen && (
          <aside className="w-72 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-4">
            <div className="space-y-5">
              {/* User info */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">用户信息</h3>
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-gray-500">邮箱:</span> {user.email}</p>
                  <p><span className="text-gray-500">学生:</span> {assessment.studentName || "—"}</p>
                  <p><span className="text-gray-500">家长:</span> {assessment.parentName || "—"}</p>
                  <p><span className="text-gray-500">年级:</span> {assessment.grade || "—"}</p>
                  <p><span className="text-gray-500">支付:</span> {payment ? payment.status : "—"}</p>
                </div>
              </section>

              {/* Learning mode */}
              {profile && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">学习模式</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {profile.learningModeEmoji || "📊"} {profile.learningModeName || "—"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sysEntries.map((sys) => (
                      <span key={sys.key} className="rounded-full px-2 py-0.5 text-xs font-medium" style={getSystemTagStyle(sys.level)}>
                        {sys.name}：{sys.level}
                      </span>
                    ))}
                  </div>
                  {profile.growthFocus && (
                    <p className="text-xs text-gray-500 mt-1">成长重点: {profile.growthFocus}</p>
                  )}
                </section>
              )}

              {/* Radar chart */}
              {sysScores && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">三系统雷达图</h3>
                  <RadarChart scores={{
                    motivation: sysScores.motivation?.score ?? 0,
                    ability: sysScores.ability?.score ?? 0,
                    perseverance: sysScores.perseverance?.score ?? 0,
                  }} />
                </section>
              )}

              {/* System scores */}
              {sysScores && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">三大系统得分</h3>
                  {SYSTEM_ORDER.map((key) => {
                    const val = sysScores[key];
                    if (!val) return null;
                    const name = SYSTEM_INFO[key]?.name || key;
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{name}</span>
                        <span className="font-semibold tabular-nums text-gray-900">
                          {val.score}
                          <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                            val.level === "强" ? "bg-emerald-100 text-emerald-700"
                              : val.level === "弱" ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                          }`}>{val.level}</span>
                        </span>
                      </div>
                    );
                  })}
                </section>
              )}

              {/* Dimension scores (collapsible) */}
              {profile?.dimensionScores && Object.keys(profile.dimensionScores).length > 0 && (
                <section className="space-y-2">
                  <button
                    onClick={() => setExpandedDims(!expandedDims)}
                    className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600"
                  >
                    <span>九大维度得分</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedDims ? "rotate-180" : ""}`} />
                  </button>
                  {expandedDims && (
                    <div className="space-y-2">
                      {SYSTEM_ORDER.map((sysKey) => {
                        const info = SYSTEM_INFO[sysKey];
                        if (!info || !profile.dimensionScores) return null;
                        return (
                          <div key={sysKey} className="space-y-1.5">
                            <p className="text-xs font-medium text-gray-600">{info.icon} {info.name}</p>
                            {info.dimensions.map((dimCode) => {
                              const dim = profile.dimensionScores?.[dimCode];
                              if (!dim) return null;
                              return (
                                <div key={dimCode} className="flex items-center gap-2 text-xs">
                                  <span className="w-16 shrink-0 text-gray-600">{dim.name}</span>
                                  <div className="flex-1"><ProgressBar score={dim.score} level={dim.level} height={5} /></div>
                                  <span className="w-6 text-right font-medium tabular-nums text-gray-800">{dim.score}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Answers shortcut */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">原始答卷</h3>
                <button onClick={() => setActiveTab("answers")} className="text-sm text-[#4a7c00] hover:underline">
                  查看 {answers.length} 道原题答案 →
                </button>
              </section>
            </div>
          </aside>
        )}

        {/* CENTER: Report Preview */}
        <main className="flex-1 overflow-y-auto">
          {/* Tab bar */}
          <div className="sticky top-0 z-10 flex gap-1 border-b border-gray-200 bg-white px-4 py-2">
            <button
              onClick={() => setActiveTab("report")}
              className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                activeTab === "report" ? "bg-[#6a9b1e]/10 font-medium text-gray-900" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              报告预览
            </button>
            <button
              onClick={() => setActiveTab("answers")}
              className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                activeTab === "answers" ? "bg-[#6a9b1e]/10 font-medium text-gray-900" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              原始答卷 ({answers.length}题)
            </button>
          </div>

          <ReportAudit id={handbook.id} refresh={generating} />
          <div className="p-6">
            {activeTab === "report" ? (
              <div className="mx-auto max-w-[820px]">
                {html ? (
                  <iframe
                    key={`${handbook.id}-v${handbook.version}`}
                    title="正式成长导航报告"
                    src={`/api/admin/reports/${handbook.id}/document?v=${handbook.version}`}
                    className="h-[85vh] w-full rounded-xl border"
                  />
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center">
                    <div className="text-4xl mb-4">📝</div>
                    <p className="text-gray-500 text-lg">报告尚未生成</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {handbook.status === "ANALYZING" ? "点击上方「AI 生成报告」按钮开始生成" : "等待 AI 生成"}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* ── Answers Tab ── */
              <div className="mx-auto max-w-[820px] space-y-2">
                {answers.map((a) => (
                  <div key={a.questionOrder} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
                    <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums">{a.questionOrder}</span>
                    <div className="flex-1">
                      <p className="text-gray-900">{a.questionContent}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>{a.system}</span><span>›</span><span>{a.dimension}</span><span>›</span><span>{a.module}</span>
                        {a.isReverseScored && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">反向</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium text-gray-900">{ANSWER_LABELS[a.answer] || a.answer}</p>
                      <p className="text-xs tabular-nums text-gray-500">{a.score !== null ? `${a.score}分` : "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
