import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { event_date, description, points, category, severity } = body;

  await sql`
    UPDATE safety_events SET
      event_date = COALESCE(${event_date}, event_date),
      description = COALESCE(${description}, description),
      points = COALESCE(${points}, points),
      category = COALESCE(${category}, category),
      severity = COALESCE(${severity}, severity),
      updated_at = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await sql`DELETE FROM safety_events WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}