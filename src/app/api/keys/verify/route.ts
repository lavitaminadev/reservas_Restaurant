import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { valid: false, error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7);
  const body = await request.json().catch(() => ({}));

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { valid: false, error: "Server not configured" },
        { status: 500 }
      );
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const prefix = apiKey.slice(0, 10);

    // Simple hash for verification
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const keyHash = Math.abs(hash).toString(16).padStart(8, "0");

    const { data, error } = await supabase
      .from("api_keys")
      .select("*, company:companies(name)")
      .eq("key_prefix", prefix)
      .eq("key_hash", keyHash)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { valid: false, error: "Invalid API key" },
        { status: 401 }
      );
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: "API key expired" },
        { status: 401 }
      );
    }

    // Check rate limit based on scope
    const action = body.action || "default";
    const hasScope = data.scopes.includes(action) || data.scopes.length === 0;

    if (!hasScope && data.scopes.length > 0) {
      return NextResponse.json(
        { valid: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Update last used
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);

    return NextResponse.json({
      valid: true,
      company_id: data.company_id,
      company_name: data.company?.name,
      scopes: data.scopes,
      key_name: data.name,
    });
  } catch (err) {
    return NextResponse.json(
      { valid: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
