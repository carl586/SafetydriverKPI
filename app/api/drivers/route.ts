import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const drivers = await sql`
    SELECT d.*, COALESCE(SUM(se.points), 0)::int AS total_points
    FROM drivers d
    LEFT JOIN safety_events se ON se.driver_id = d.id
    GROUP BY d.id
    ORDER BY total_points DESC, d.name
  `;

  const categories = await sql`
    SELECT driver_id, category, SUM(points)::int AS points
    FROM safety_events
    WHERE category IS NOT NULL
    GROUP BY driver_id, category
  `;

  const result = drivers.map((d: any) => {
    const cats: Record<string, number> = {};
    categories
      .filter((c: any) => Number(c.driver_id) === Number(d.id))
      .forEach((c: any) => {
        cats[c.category] = Number(c.points);
      });
    return { ...d, categoryPoints: cats };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, truck, dispatch, company } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Driver name is required' }, { status: 400 });
  }

  const [driver] = await sql`
    INSERT INTO drivers (name, truck, dispatch, company)
    VALUES (
      ${name.trim()},
      ${truck || '-'},
      ${dispatch || 'Unassigned'},
      ${company || 'MNM Freight'}
    )
    RETURNING *
  `;

  return NextResponse.json(driver);
}