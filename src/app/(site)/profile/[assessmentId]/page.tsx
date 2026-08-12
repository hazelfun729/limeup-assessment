"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type SystemScore = {
  name: string;
  score: number;
  level: "强" | "中" | "弱";
};

type ProfileData = {
  learningMode: string;
  learningModeName?: string;
  learningModeEmoji?: string;
  summary?: string;
  systemScores: Record<string, { score: number; level: string }> | SystemScore[];
  growthFocus?: string;
  growthFocusDetail?: string;
  actionSuggestion?: string;
};

// Fallback mock data for when API is unavailable (dev without DB)
const MOCK_PROFILE: ProfileData = {
  learningMode: "孔雀型",
  learningModeName: "孔雀型",
  learningModeEmoji: "🦚",
  summary:
    "孩子拥有充沛的学习热情和出色的理解力，但在坚持深度学习和抵御挫折方面需要更多支持。",
  systemScores: [
    { name: "学习动力", score: 86, level: "强" },
    { name: "学习能力", score: 69, level: "中" },
    { name: "学习毅力", score: 39, level: "弱" },
  ],
  growthFocus: "培养持续学习的毅力与情绪调节能力",
  growthFocusDetail:
    "孩子在面对需要长期坚持的任务时容易放弃。当前最关键的不是学习方法，而是帮助孩子建立\"我可以坚持\"的信心，以及学会在挫败时自我调节。",
  actionSuggestion:
    "从今天开始，每天固定15分钟做一件需要坚持的小事（如背10个单词），完成后给自己一个小奖励，连续坚持7天。",
};

const levelColors: Record<string, string> = {
  强: "bg-primary/20 text-primary",
  中: "bg-secondary text-muted-foreground",
  弱: "bg-destructive/10 text-destructive",
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function normalizeSystemScores(
  raw: ProfileData["systemScores"]
): SystemScore[] {
  if (Array.isArray(raw)) return raw;
  // Convert from DB object format
  const nameMap: Record<string, string> = {
    motivation: "学习动力",
    ability: "学习能力",
    perseverance: "学习毅力",
  };
  return Object.entries(raw).map(([key, val]) => ({
    name: nameMap[key] || key,
    score: val.score,
    level: val.level as "强" | "中" | "弱",
  }));
}

export default function GrowthProfilePage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/profile/${assessmentId}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          return;
        }
      } catch {
        // API unavailable, use mock
      }
      setProfile(MOCK_PROFILE);
    }
    fetchProfile().finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-muted-foreground">正在生成成长画像...</p>
      </main>
    );
  }

  if (!profile) return null;

  const systemScores = normalizeSystemScores(profile.systemScores);

  return (
    <main className="min-h-dvh bg-background px-6 py-12">
      {/* Navigation */}
      <div className="mx-auto max-w-2xl">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回成长档案
        </Link>
      </div>

      <div className="mx-auto max-w-2xl space-y-12">
        {/* Header */}
        <motion.section {...fadeUp} transition={{ duration: 0.4 }}>
          <p className="text-sm text-muted-foreground">成长画像</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            {profile.learningModeEmoji || "📊"}{" "}
            {profile.learningModeName || profile.learningMode}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {profile.summary || ""}
          </p>
        </motion.section>

        {/* System Scores */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-medium text-foreground">三大系统得分</h2>
          <div className="space-y-3">
            {systemScores.map((system) => (
              <div
                key={system.name}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {system.name}
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${system.score}%` }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold tabular-nums text-foreground">
                    {system.score}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      levelColors[system.level] || ""
                    }`}
                  >
                    {system.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Growth Focus */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="text-lg font-medium text-foreground">
            下一阶段成长重点
          </h2>
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-base font-medium text-foreground">
              {profile.growthFocus || ""}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {profile.growthFocusDetail || ""}
            </p>
          </div>
        </motion.section>

        {/* Action Suggestion */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-3"
        >
          <h2 className="text-lg font-medium text-foreground">
            一条可落地行动建议
          </h2>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
            <p className="text-sm leading-relaxed text-foreground">
              {profile.actionSuggestion || ""}
            </p>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="border-t border-border pt-8 text-center"
        >
          <p className="text-base font-medium text-foreground">
            获得成长导航手册，查看孩子完整成长升级方案。
          </p>
          <Link href={`/payment/${assessmentId}`}>
            <Button className="mt-5 h-12 rounded-full bg-primary px-8 text-primary-foreground hover:brightness-95">
              获取成长导航手册 ¥9.9
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.section>
      </div>
    </main>
  );
}
