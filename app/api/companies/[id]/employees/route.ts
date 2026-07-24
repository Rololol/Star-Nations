import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const companyId = parseInt(params.id, 10);
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      employees: {
        include: { worker: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!company) {
    return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(company.employees);
}

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

  const [company, user] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
  ]);

  if (!company || !user) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (company.ownerId !== session.userId) {
    return NextResponse.json({ error: "Nur der Besitzer kann Löhne festlegen." }, { status: 403 });
  }

  await logActivity(user.id, "company_set_wage", `Hat Lohn in Firma "${company.name}" auf ${wage} Credits/PP festgelegt.`);

  return NextResponse.json({ success: true, wagePerPP: wage });
}
