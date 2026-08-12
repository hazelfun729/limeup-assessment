"use client";

import { useEffect, useState } from "react";
import { Shield, Plus, Eye, EyeOff, MoreVertical } from "lucide-react";

type Admin = {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("OPERATOR");
  const [showPwd, setShowPwd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [resetPwdId, setResetPwdId] = useState<string | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetShowPwd, setResetShowPwd] = useState(false);

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/admin/admins");
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [menuOpen]);

  const handleCreate = async () => {
    if (!newUsername || !newEmail || !newPassword) {
      setError("请填写所有必填项");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, email: newEmail, password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "创建失败");
        return;
      }
      setShowCreate(false);
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("OPERATOR");
      fetchAdmins();
    } catch {
      setError("网络错误");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    setMenuOpen(null);
    try {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) fetchAdmins();
    } catch {}
  };

  const handleResetPassword = async (id: string) => {
    if (!resetPwd || resetPwd.length < 6) {
      setError("密码至少6位");
      return;
    }
    try {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPwd }),
      });
      if (res.ok) {
        setResetPwdId(null);
        setResetPwd("");
      }
    } catch {}
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN": return "超级管理员";
      case "OPERATOR": return "运营";
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">管理员管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理后台运营账户和权限</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError(""); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-95"
        >
          <Plus className="h-4 w-4" />
          新增管理员
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-medium text-foreground">新增管理员</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">用户名</label>
              <input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                placeholder="登录用户名"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">邮箱</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">密码</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm"
                  placeholder="至少6位"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">角色</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="OPERATOR">运营</option>
                <option value="SUPER_ADMIN">超级管理员</option>
              </select>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
            >
              {creating ? "创建中..." : "创建"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Admin list */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">用户名</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">邮箱</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">角色</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">状态</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">创建时间</th>
              <th className="px-5 py-3 text-right font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {admins.map((a) => (
              <tr key={a.id} className="hover:bg-secondary/30">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {a.role === "SUPER_ADMIN" && <Shield className="h-3.5 w-3.5 text-primary" />}
                    <span className="font-medium text-foreground">{a.username}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{a.email}</td>
                <td className="px-5 py-3 text-muted-foreground">{roleLabel(a.role)}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${a.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {a.isActive ? "启用" : "停用"}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {new Date(a.createdAt).toLocaleDateString("zh-CN")}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="relative inline-block">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === a.id ? null : a.id); }}
                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen === a.id && (
                      <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-border bg-card py-1 shadow-lg">
                        <button
                          onClick={() => { setMenuOpen(null); setResetPwdId(a.id); setResetPwd(""); setError(""); }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-secondary"
                        >
                          重置密码
                        </button>
                        <button
                          onClick={() => toggleActive(a.id, a.isActive)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-secondary"
                        >
                          {a.isActive ? "停用账户" : "启用账户"}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset password modal */}
      {resetPwdId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setResetPwdId(null)}>
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-medium text-foreground">重置密码</h3>
            <div className="relative">
              <input
                type={resetShowPwd ? "text" : "password"}
                value={resetPwd}
                onChange={(e) => setResetPwd(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm"
                placeholder="输入新密码（至少6位）"
              />
              <button
                type="button"
                onClick={() => setResetShowPwd(!resetShowPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {resetShowPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => handleResetPassword(resetPwdId)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-95"
              >
                确认重置
              </button>
              <button
                onClick={() => setResetPwdId(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
