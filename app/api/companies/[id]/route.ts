import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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
      star: { select: { id: true, name: true, resources: true } },
      employees: { include: { worker: { select: { id: true, displayName: true } } } },
    },
  });
  if (!company) {
    return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(company);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const companyId = parseInt(params.id, 10);
  const { name, companyType } = await req.json();

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
  }
  if (company.ownerId !== session.userId) {
    return NextResponse.json({ error: "Nicht deine Firma." }, { status: 403 });
  }

  const data: Record<string, any> = {};
  if (name && typeof name === "string") data.name = name;
  if (companyType && typeof companyType === "string") data.companyType = companyType;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen angegeben." }, { status: 400 });
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const companyId = parseInt(params.id, 10);
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
  }
  if (company.ownerId !== session.userId) {
    return NextResponse.json({ error: "Nicht deine Firma." }, { status: 403 });
  }

  await prisma.companyEmployee.deleteMany({ where: { companyId } });
  await prisma.company.delete({ where: { id: companyId } });
  return NextResponse.json({ success: true });
}
