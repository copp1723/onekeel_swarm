import { sql } from 'drizzle-orm';

export async function tableExists(db: any, table: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = ${table}
    ) as exists
  `);
  return result.rows[0].exists;
}

export async function columnExists(db: any, table: string, column: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    ) as exists
  `);
  return result.rows[0].exists;
}

export async function getAllTables(db: any): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name
  `);
  return result.rows.map((r: any) => r.table_name);
}

export async function getTableColumns(db: any, table: string): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${table}
  `);
  return result.rows.map((r: any) => r.column_name);
}
