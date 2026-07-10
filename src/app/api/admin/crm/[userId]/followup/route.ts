import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * POST /api/admin/crm/[userId]/followup
 * Add a follow-up note to a CRM contact
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get("admin_session")?.value;
    if (!adminId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { userId } = await params;
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "跟进内容为必填项" }, { status: 400 });
    }

    // Ensure CRM contact exists
    const contact = await prisma.cRMContact.findUnique({ where: { userId } });
    if (!contact) {
      return NextResponse.json({ error: "CRM 联系人不存在" }, { status: 404 });
    }

    const followUp = await prisma.cRMFollowUp.create({
      data: {
        contactId: contact.id,
        content,
        createdBy: adminId,
      },
    });

    // Update last contact time
    await prisma.cRMContact.update({
      where: { id: contact.id },
      data: { lastContactAt: new Date() },
    });

    return NextResponse.json({ success: true, followUp });
  } catch (error) {
    console.error("Add followup error:", error);
    return NextResponse.json({ error: "添加跟进记录失败" }, { status: 500 });
  }
}
