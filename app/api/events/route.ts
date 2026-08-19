import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const type = req.nextUrl.searchParams.get('type');

  let events;
  if (type && type !== 'all') {
    events = await sql`
      SELECT se.*, d.name as driver_name
      FROM safety_events se
      JOIN drivers d ON d.id = se.driver_id
      WHERE se.event_type = ${type}
      ORDER BY se.event_date DESC, se.created_at DESC
    `;
  } else {
    events = await sql`
      SELECT se.*, d.name as driver_name
      FROM safety_events se
      JOIN drivers d ON d.id = se.driver_id
      ORDER BY se.event_date DESC, se.created_at DESC
    `;
  }

  const corrections = await sql`SELECT * FROM corrections ORDER BY created_at DESC`;

  const result = events.map((e: any) => ({
    ...e,
    driver: e.driver_name,
    corrections: corrections.filter((c: any) => c.event_id === e.id),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    event_type,
    driver_id,
    truck,
    dispatch,
    company,
    event_date,
    category,
    severity,
    description,
    points,
    is_inspection,
  } = body;

  if (!driver_id || !event_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const prefix =
    event_type === 'Accident'
      ? 'ACC'
      : event_type === 'Samsara Event'
      ? 'SAM'
      : is_inspection
      ? 'INSP'
      : 'SFT';

  const id = `${prefix}-${String(1000 + Math.floor(Math.random() * 900)).padStart(3, '0')}`;

  const [event] = await sql`
    INSERT INTO safety_events (
      id, event_type, driver_id, truck, dispatch, company,
      event_date, category, severity, description, points, is_inspection
    ) VALUES (
      ${id},
      ${event_type},
      ${driver_id},
      ${truck || '-'},
      ${dispatch || '-'},
      ${company || 'MNM Freight'},
      ${event_date || new Date().toISOString().split('T')[0]},
      ${category || null},
      ${severity || null},
      ${description || 'No description provided'},
      ${points || 0},
      ${!!is_inspection}
    )
    RETURNING *
  `;

  return NextResponse.json(event);
}