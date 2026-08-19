import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL as string;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

export const sql = neon(connectionString);