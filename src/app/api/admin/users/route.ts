import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/admin/users
 * User list with search, filter, pagination
 */
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
    const filter = searchParams.get("filter") || "";

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (filter === "unpaid") {
      where.payments = { none: { status: "CONFIRMED" } };
    } else if (filter === "paid") {
      where.payments = { some: { status: "CONFIRMED" } };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          phone: true,
          createdAt: true,
          emailVerified: true,
          assessments: {
            select: {
              id: true,
              status: true,
              completedAt: true,
            },
            orderBy: { startedAt: "desc" },
            take: 1,
          },
          payments: {
            select: {
              id: true,
              status: true,
              amount: true,
            },
            take: 1,
          },
          growthProfiles: {
            select: {
              learningMode: true,
              learningModeName: true,
              growthFocus: true,
            },
            take: 1,
          },
          handbooks: {
            select: {
              status: true,
            },
            take: 1,
          },
          crmContact: {
            select: {
              tags: true,
              wechatAdded: true,
              owner: true,
              lastContactAt: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        createdAt: u.createdAt,
        emailVerified: u.emailVerified,
        assessmentStatus: u.assessments[0]?.status || null,
        paymentStatus: u.payments[0]?.status || null,
        handbookStatus: u.handbooks[0]?.status || null,
        learningMode: u.growthProfiles[0]?.learningModeName || null,
        growthFocus: u.growthProfiles[0]?.growthFocus || null,
        tags: u.crmContact?.tags || [],
        wechatAdded: u.crmContact?.wechatAdded || false,
        owner: u.crmContact?.owner || null,
        lastContactAt: u.crmContact?.lastContactAt || null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Users API error:", error);
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
}
