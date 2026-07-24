import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const companyId = parseInt(params.id, 10);
  const { wagePerPP } = await req.json();
  const wage = parseFloat(wagePerPP);
  if (isNaN(wage) || wage < 0) {
    return NextResponse.json({ error: "Ungültiger Lohn." }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
  }
  if (company.ownerId !== session.userId) {
    return NextResponse.json({ error: "Nicht deine Firma." }, { status: 403 });
  }

  // Store wage on company and update all existing employees
  await Promise.all([
    prisma.company.update({
      where: { id: companyId },
      data: { wagePerPP: wage },
    }),
    prisma.companyEmployee.updateMany({
      where: { companyId },
      data: { wagePerPP: wage },
    }),
  ]);

  await logActivity(session.userId, "company_set_wage", `Hat Lohn in Firma "${company.name}" auf ${wage} Credits/PP festgelegt.`);

  return NextResponse.json({ success: true, wagePerPP: wage });
}
