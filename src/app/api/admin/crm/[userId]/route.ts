import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * PUT /api/admin/crm/[userId]
 * Update CRM contact fields
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")?.value) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { tags, owner, intentionLevel, learningPlanetIntention, coachIntention, wechatAdded, notes, retestReminder } = body;

    const updateData: Record<string, unknown> = {};
    if (tags !== undefined) updateData.tags = tags;
    if (owner !== undefined) updateData.owner = owner;
    if (intentionLevel !== undefined) updateData.intentionLevel = intentionLevel;
    if (learningPlanetIntention !== undefined) updateData.learningPlanetIntention = learningPlanetIntention;
    if (coachIntention !== undefined) updateData.coachIntention = coachIntention;
    if (wechatAdded !== undefined) updateData.wechatAdded = wechatAdded;
    if (notes !== undefined) updateData.notes = notes;
    if (retestReminder !== undefined) updateData.retestReminder = retestReminder ? new Date(retestReminder) : null;
    updateData.lastContactAt = new Date();

    const contact = await prisma.cRMContact.upsert({
      where: { userId },
      create: {
        userId,
        ...updateData,
        source: "测评网站",
      },
      update: updateData,
    });

    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error("Update CRM error:", error);
    return NextResponse.json({ error: "更新 CRM 失败" }, { status: 500 });
  }
}
