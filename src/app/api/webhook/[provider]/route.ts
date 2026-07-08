import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      try {
        const edgeUrl = `${supabaseUrl}/functions/v1/meta-webhook${url.search}`;
        const response = await fetch(edgeUrl, {
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
          },
        });
        if (response.ok) {
          const text = await response.text();
          return new NextResponse(text, { status: 200 });
        }
      } catch {
        // Fallback verification
      }
    }
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const signature = request.headers.get("x-hub-signature-256") || "";
  const body = await request.text();

  // Forward to Supabase Edge Function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const edgeUrl = `${supabaseUrl}/functions/v1/meta-webhook`;
      const response = await fetch(edgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hub-Signature-256": signature,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
        },
        body,
      });

      if (response.ok) {
        return new NextResponse("OK", { status: 200 });
      }
    } catch {
      // Fallback processing
    }
  }

  return new NextResponse("OK", { status: 200 });
}
