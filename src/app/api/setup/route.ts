import { NextResponse } from "next/server";
// @ts-expect-error - pg has no type declarations but works at runtime
import { Pool } from "pg";

export const runtime = "nodejs";

async function fetchSQL(path: string): Promise<string> {
  const res = await fetch(
    `https://raw.githubusercontent.com/lavitaminadev/reservas_Restaurant/main/${path}`
  );
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.text();
}

export async function GET() {
  try {
    const connectionString =
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_URL;

    if (!connectionString) {
      return NextResponse.json(
        { error: "No database connection string available" },
        { status: 500 }
      );
    }

    const pool = new Pool({ connectionString });

    const schemaSQL = await fetchSQL("supabase/migrations/001_schema.sql");
    await pool.query(schemaSQL);

    const userSQL = `
      INSERT INTO public.companies (name, slug, description)
      VALUES ('Restaurante Demo', 'restaurante-demo', 'Empresa demo para pruebas')
      ON CONFLICT (slug) DO NOTHING;

      INSERT INTO public.profiles (id, full_name)
      VALUES (
        (SELECT id FROM auth.users WHERE email = 'demo@lavitamina.com'),
        'Usuario Demo'
      )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.company_users (company_id, user_id, role, is_active)
      VALUES (
        (SELECT id FROM companies WHERE slug = 'restaurante-demo'),
        (SELECT id FROM auth.users WHERE email = 'demo@lavitamina.com'),
        'owner',
        true
      )
      ON CONFLICT (company_id, user_id) DO NOTHING;
    `;
    await pool.query(userSQL);

    await pool.end();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
