import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { event_id, correction_type, points_reduced, notes } = await req.json();

  if (!event_id || !correction_type || !points_reduced || points_reduced <= 0) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  await sql`
    INSERT INTO corrections (event_id, correction_type, points_reduced, notes)
    VALUES (
      ${event_id},
      ${correction_type},
      ${points_reduced},
      ${notes || 'No notes provided'}
    )
  `;

  await sql`
    UPDATE safety_events
    SET points = GREATEST(0, points - ${points_reduced}),
        updated_at = NOW()
    WHERE id = ${event_id}
  `;

  return NextResponse.json({ success: true });
}