import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL("/dashboard/integraciones?error=" + error, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard/integraciones?error=missing_params", request.url)
    );
  }

  let stateData: { provider?: string; company_id?: string };
  try {
    stateData = JSON.parse(atob(state));
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/integraciones?error=invalid_state", request.url)
    );
  }

  const { provider, company_id } = stateData;

  // Determine which Edge Function to call based on provider
  const edgeFunctionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/`
    : null;

  if (provider === "meta" || provider === "instagram") {
    if (edgeFunctionUrl) {
      // Forward to Edge Function
      const response = await fetch(`${edgeFunctionUrl}meta-oauth-callback${url.search}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
        },
      });

      if (response.ok) {
        return response;
      }
    }

    // Fallback: redirect to integrations page with success
    return NextResponse.redirect(
      new URL(
        `/dashboard/integraciones?connected=${provider}&company=${company_id || ""}`,
        request.url
      )
    );
  }

  // Google OAuth providers
  if (provider?.startsWith("google_")) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/integraciones?connected=${provider}&company=${company_id || ""}`,
        request.url
      )
    );
  }

  return NextResponse.redirect(
    new URL("/dashboard/integraciones?error=unknown_provider", request.url)
  );
}
