import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; eid: string } }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const companyId = parseInt(params.id, 10);
  const employeeId = parseInt(params.eid, 10);

  const [company, employee] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.companyEmployee.findUnique({ where: { id: employeeId } }),
  ]);

  if (!company || !employee) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (company.ownerId !== session.userId) {
    return NextResponse.json({ error: "Nur der Besitzer kann Angestellte entlassen." }, { status: 403 });
  }
  if (employee.companyId !== companyId) {
    return NextResponse.json({ error: "Angestellter gehört nicht zu dieser Firma." }, { status: 400 });
  }

  await prisma.companyEmployee.delete({ where: { id: employeeId } });
  return NextResponse.json({ success: true });
}
