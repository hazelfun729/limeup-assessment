"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

export default function CRMPage() {
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

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">CRM 跟进</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {total} 位联系人
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchContacts}
          className="gap-2 rounded-lg"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索邮箱、手机号..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 w-64 rounded-lg pl-9"
          />
        </div>
        <div className="flex gap-1">
          {INTENTION_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setIntentionFilter(f.value);
                setPage(1);
              }}
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

      {/* Table */}
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
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  加载中...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  暂无联系人
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{c.userEmail}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.learningMode || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {c.tags.length === 0 && <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.intentionLevel ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.intentionLevel === "高"
                            ? "bg-emerald-100 text-emerald-700"
                            : c.intentionLevel === "中"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {c.intentionLevel}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.wechatAdded ? <span className="text-emerald-600">✓</span> : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.learningPlanetIntention ? <span className="text-emerald-600">✓</span> : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.coachIntention ? <span className="text-emerald-600">✓</span> : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.owner || "—"} </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.lastContactAt
                      ? new Date(c.lastContactAt).toLocaleDateString("zh-CN")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            第 {page} 页 / 共 {Math.ceil(total / 20)} 页
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(total / 20)}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
