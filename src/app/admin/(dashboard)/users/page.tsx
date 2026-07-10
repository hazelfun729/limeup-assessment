"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Users as UsersIcon, UserCog } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* ── User types ── */
type UserItem = {
  id: string;
  email: string;
  phone: string | null;
  createdAt: string;
  assessmentCount: number;
  completedCount: number;
  hasHandbook: boolean;
  latestLearningMode: string | null;
};

/* ── CRM types ── */
type CRMContact = {
  id: string;
  userId: string;
  userEmail: string;
  tags: string[];
  owner: string | null;
  intentionLevel: string | null;
  wechatAdded: boolean;
  learningPlanetIntention: boolean;
  coachIntention: boolean;
  learningMode: string | null;
  paymentStatus: string | null;
  handbookStatus: string | null;
  notes: string | null;
  lastContactAt: string | null;
  recentFollowUps: Array<{ content: string; createdAt: string }>;
};

const INTENTION_FILTERS = [
  { value: "", label: "全部" },
  { value: "高", label: "高意向" },
  { value: "中", label: "中意向" },
  { value: "低", label: "低意向" },
];

/* ── Tab definitions ── */
const TABS = [
  { key: "users", label: "用户列表", icon: UsersIcon },
  { key: "crm", label: "CRM 跟进", icon: UserCog },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ════════════════════════════════════════════
   Users Tab
   ════════════════════════════════════════════ */
function UsersTab() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        search,
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total);
      }
    } catch {}
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索邮箱、手机号..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-10 w-64 rounded-lg pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">邮箱</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">手机</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">测评数</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">完成</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">手册</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">最近类型</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">注册时间</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">加载中...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">暂无用户</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{u.assessmentCount}</td>
                  <td className="px-4 py-3 tabular-nums">{u.completedCount}</td>
                  <td className="px-4 py-3">{u.hasHandbook ? <span className="text-emerald-600">✓</span> : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.latestLearningMode || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="text-sm font-medium text-primary hover:underline">详情 →</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">第 {page}/{Math.ceil(total / 20)} 页 · 共 {total} 人</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
      {total <= 20 && <p className="text-xs text-muted-foreground">共 {total} 人</p>}
    </div>
  );
}

/* ════════════════════════════════════════════
   CRM Tab
   ════════════════════════════════════════════ */
function CRMTab() {
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [intentionFilter, setIntentionFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        search,
        intentionLevel: intentionFilter,
      });
      const res = await fetch(`/api/admin/crm?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        setTotal(data.total);
      }
    } catch {}
    setLoading(false);
  }, [page, search, intentionFilter]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索邮箱..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-10 w-64 rounded-lg pl-9"
          />
        </div>
        <div className="flex gap-1">
          {INTENTION_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setIntentionFilter(f.value); setPage(1); }}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                intentionFilter === f.value
                  ? "bg-primary/10 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">邮箱</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">学习模式</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">标签</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">意向</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">企微</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">星球</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">教练</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">负责人</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">最近联系</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">加载中...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">暂无联系人</td></tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{c.userEmail}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.learningMode || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">{tag}</span>
                      ))}
                      {c.tags.length === 0 && <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.intentionLevel ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.intentionLevel === "高" ? "bg-emerald-100 text-emerald-700"
                          : c.intentionLevel === "中" ? "bg-amber-100 text-amber-700"
                            : "bg-secondary text-muted-foreground"
                      }`}>{c.intentionLevel}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">{c.wechatAdded ? <span className="text-emerald-600">✓</span> : "—"}</td>
                  <td className="px-4 py-3 text-center">{c.learningPlanetIntention ? <span className="text-emerald-600">✓</span> : "—"}</td>
                  <td className="px-4 py-3 text-center">{c.coachIntention ? <span className="text-emerald-600">✓</span> : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.owner || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.lastContactAt ? new Date(c.lastContactAt).toLocaleDateString("zh-CN") : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">第 {page}/{Math.ceil(total / 20)} 页</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
      {total <= 20 && <p className="text-xs text-muted-foreground">共 {total} 位联系人</p>}
    </div>
  );
}

/* ════════════════════════════════════════════
   Main Page
   ════════════════════════════════════════════ */
export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">用户管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            用户列表与 CRM 跟进
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-sm transition-colors ${
                activeTab === tab.key
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "users" && <UsersTab />}
      {activeTab === "crm" && <CRMTab />}
    </div>
  );
}
