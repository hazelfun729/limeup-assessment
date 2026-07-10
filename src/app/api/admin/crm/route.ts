import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")?.value) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const intentionLevel = searchParams.get("intentionLevel") || "";

    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (intentionLevel) where.intentionLevel = intentionLevel;
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      };
    }

    const [contacts, total] = await Promise.all([
      prisma.cRMContact.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              growthProfiles: {
                select: { learningModeName: true, growthFocus: true },
                take: 1,
              },
              payments: {
                select: { status: true },
                take: 1,
              },
              handbooks: {
                select: { status: true },
                take: 1,
              },
            },
          },
          followUps: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
      }),
      prisma.cRMContact.count({ where }),
    ]);

    return NextResponse.json({
      contacts: contacts.map((c) => ({
        id: c.id,
        userId: c.userId,
        userEmail: c.user.email,
        userPhone: c.user.phone,
        tags: c.tags,
        owner: c.owner,
        source: c.source,
        intentionLevel: c.intentionLevel,
        learningPlanetIntention: c.learningPlanetIntention,
        coachIntention: c.coachIntention,
        wechatAdded: c.wechatAdded,
        notes: c.notes,
        learningMode: c.user.growthProfiles[0]?.learningModeName || null,
        paymentStatus: c.user.payments[0]?.status || null,
        handbookStatus: c.user.handbooks[0]?.status || null,
        lastContactAt: c.lastContactAt,
        retestReminder: c.retestReminder,
        recentFollowUps: c.followUps.map((f) => ({
          content: f.content,
          createdAt: f.createdAt,
          createdBy: f.createdBy,
        })),
        createdAt: c.createdAt,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("CRM API error:", error);
    return NextResponse.json({ error: "获取 CRM 列表失败" }, { status: 500 });
  }
}
