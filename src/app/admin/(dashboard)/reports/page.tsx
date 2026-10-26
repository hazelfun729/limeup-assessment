"use client";

import { useState, Suspense } from "react";
import { FileText, Mail } from "lucide-react";
import { ReportsTab } from "./reports-tab";
import { EmailsTab } from "./emails-tab";

/* ── Tab definitions ── */
const TABS = [
  { key: "reports", label: "报告管理", icon: FileText },
  { key: "emails", label: "邮件记录", icon: Mail },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ════════════════════════════════════════════
   Main Page with Tabs
   ════════════════════════════════════════════ */
function ReportManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("reports");

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">报告管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            支付确认、报告审核、邮件发送
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

      {/* Tab content */}
      {activeTab === "reports" && <ReportsTab />}
      {activeTab === "emails" && <EmailsTab />}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-muted-foreground">
          加载中...
        </div>
      }
    >
      <ReportManagementPage />
    </Suspense>
  );
}
