import { prisma } from "@/lib/prisma";
import { generateProfile, saveProfile } from "@/lib/scoring/profile";
import { numericScores, systemCombination } from "@/lib/knowledge/reference";
import { SYSTEMS, DIMENSIONS, MODULES } from "@/lib/scoring/engine";
import type { ProfileCopy, ProfileView } from "./content";

export async function getProfileView(
  assessmentId: string,
): Promise<ProfileView> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { growthProfile: true, payment: true, handbook: true },
  });
  if (!assessment || assessment.status !== "COMPLETED" || !assessment.userId)
    throw new Error("请先完成测评及注册");
  let profile = assessment.growthProfile;
  if (!profile) {
    const generated = await generateProfile({ assessmentId });
    if (!generated) throw new Error("测评信息不足");
    await saveProfile(assessmentId, assessment.userId, generated);
    profile = await prisma.growthProfile.findUniqueOrThrow({
      where: { assessmentId },
    });
  }
  const active = await prisma.siteConfig.findUnique({
    where: { key: "profile-copy:active" },
  });
  if (!active) throw new Error("画像文案尚未发布");
  const combination = systemCombination(profile.systemScores);
  const record = await prisma.siteConfig.findUnique({
    where: { key: `profile-copy:${active.value}:${combination}` },
  });
  if (!record) throw new Error("画像文案暂不可用");
  const copy = JSON.parse(record.value) as ProfileCopy;
  const systems = numericScores(profile.systemScores),
    dimensions = numericScores(profile.dimensionScores);
  const payment = assessment.payment;
  const purchased = payment?.status === "CONFIRMED";
  const reportReady = purchased && assessment.handbook?.status === "SENT";
  const orderActive = !!payment;
  return {
    id: profile.id,
    assessmentId,
    version: active.value,
    copy,
    emoji: profile.learningModeEmoji || "🌱",
    systems: SYSTEMS.map((s) => ({
      code: s.code,
      name: s.name,
      score: systems[s.code] ?? systems[s.nameEn] ?? null,
      dimensions: DIMENSIONS.filter((d) => d.systemCode === s.code).map(
        (d) => ({
          code: d.code,
          name: d.name,
          modules: d.modules.map(
            (code) => MODULES.find((m) => m.code === code)!.name,
          ),
          score: dimensions[d.code] ?? null,
        }),
      ),
    })),
    purchase: {
      purchased: !!purchased,
      label: reportReady
        ? "查看成长导航报告"
        : orderActive
          ? "查看报告进度"
          : "获取成长导航报告 · ¥9.9",
      href: reportReady
        ? `/report/${assessment.handbook!.id}`
        : orderActive
          ? `/status/${assessmentId}`
          : `/payment/${assessmentId}`,
    },
  };
}
