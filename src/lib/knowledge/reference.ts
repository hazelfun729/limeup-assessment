import { prisma } from "@/lib/prisma";
import { getScoreLevel } from "@/lib/assessment-constants";

export function numericScores(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    const score = typeof value === "number" ? value : value?.score;
    if (typeof score === "number" && Number.isFinite(score)) result[key] = score;
  }
  return result;
}

export function systemCombination(raw: unknown): string {
  const scores = numericScores(raw);
  return [["D", "motivation"], ["A", "ability"], ["P", "perseverance"]].map(([code, alias]) => {
    const score = scores[code] ?? scores[alias];
    if (score === undefined) throw new Error("三大系统得分不完整，无法匹配解读资料");
    return getScoreLevel(score);
  }).join("_");
}

export async function loadReportReference(rawSystemScores: unknown) {
  const active = await prisma.siteConfig.findUnique({ where: { key: "knowledge:active" } });
  if (!active) throw new Error("报告基础资料尚未导入");
  const version = active.value;
  const combination = systemCombination(rawSystemScores);
  const prefix = `knowledge:${version}:`;
  const keys = ["taxonomy", `type:${combination}`, "scoring"];
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: keys.map(key => prefix + key) } } });
  const data = Object.fromEntries(rows.map(row => [row.key.slice(prefix.length), JSON.parse(row.value)]));
  if (keys.some(key => !data[key])) throw new Error("报告基础资料不完整，请检查资料版本");
  const materials = { version, combination, taxonomy: data.taxonomy, interpretation: data[`type:${combination}`], scoring: { source: data.scoring.source, unknown: data.scoring.unknown, thresholds: data.scoring.thresholds } };
  return { version, combination, text: JSON.stringify(materials, null, 2) };
}
