import { neon, NeonQueryFunction } from '@neondatabase/serverless';

function getDatabaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

export const sql: NeonQueryFunction<false, false> = neon(getDatabaseUrl());