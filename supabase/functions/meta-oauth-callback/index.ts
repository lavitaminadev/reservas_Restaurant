// ============================================================================
// Edge Function: Meta OAuth Callback Handler
// ============================================================================
// -- Recibe el callback OAuth de Meta después de que el usuario autoriza
// -- la app. Intercambia el código por un token de acceso de largo plazo.
// -- Guarda el token cifrado en integration_tokens.
// -- Crea/actualiza la cuenta conectada en integration_accounts.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface OAuthCallbackPayload {
  code: string;
  state: string;
  company_id?: string;
  provider?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  data_access_expiration_time?: number;
  graph_domain?: string;
  permissions?: string[];
}

function encryptToken(text: string, key: string): string {
  const encoded = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(key.padEnd(32, "0").slice(0, 32));
  const iv = crypto.getRandomValues(new Uint8Array(16));

  // Simple XOR + base64 for edge compatibility
  const encrypted = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i++) {
    encrypted[i] = encoded[i] ^ keyBytes[i % keyBytes.length];
  }

  const combined = new Uint8Array(iv.length + encrypted.length);
  combined.set(iv);
  combined.set(encrypted, iv.length);

  return btoa(String.fromCharCode(...combined));
}

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(
      JSON.stringify({ error: "OAuth denied", details: error }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!code || !state) {
    return new Response(
      JSON.stringify({ error: "Missing code or state" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Decode state: base64 JSON with company_id and provider
  let stateData: { company_id: string; provider: string; redirect_uri: string };
  try {
    stateData = JSON.parse(atob(state));
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid state" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { company_id, provider, redirect_uri } = stateData;
  const metaAppId = Deno.env.get("META_APP_ID")!;
  const metaAppSecret = Deno.env.get("META_APP_SECRET")!;
  const graphVersion = Deno.env.get("META_GRAPH_API_VERSION") || "v18.0";

  // Exchange code for access token
  const tokenUrl = `https://graph.facebook.com/${graphVersion}/oauth/access_token`;
  const tokenParams = new URLSearchParams({
    client_id: metaAppId,
    client_secret: metaAppSecret,
    redirect_uri,
    code,
  });

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    body: tokenParams,
  });

  if (!tokenResponse.ok) {
    const tokenError = await tokenResponse.text();
    return new Response(
      JSON.stringify({ error: "Token exchange failed", details: tokenError }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const tokenData: TokenResponse = await tokenResponse.json();
  const expiresAt = new Date(
    Date.now() + (tokenData.expires_in * 1000)
  ).toISOString();

  // Get long-lived token
  const longTokenUrl = `https://graph.facebook.com/${graphVersion}/oauth/access_token`;
  const longTokenParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: metaAppId,
    client_secret: metaAppSecret,
    fb_exchange_token: tokenData.access_token,
  });

  const longTokenResponse = await fetch(`${longTokenUrl}?${longTokenParams}`);
  const longTokenData: TokenResponse = await longTokenResponse.json();
  const longToken = longTokenData.access_token || tokenData.access_token;

  // Get pages owned by the user
  const pagesUrl = `https://graph.facebook.com/${graphVersion}/me/accounts?access_token=${longToken}`;
  const pagesResponse = await fetch(pagesUrl);
  const pagesData = await pagesResponse.json();

  const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || "default-dev-key-change-me!";

  // Find or create company_integration
  const { data: providerRow } = await supabase
    .from("integration_providers")
    .select("id")
    .eq("slug", provider)
    .single();

  if (!providerRow) {
    return new Response(
      JSON.stringify({ error: "Provider not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: companyIntegration } = await supabase
    .from("company_integrations")
    .upsert({
      company_id,
      provider_id: providerRow.id,
      status: "connected",
      connected_by: null,
      connected_at: new Date().toISOString(),
      metadata: {
        permissions: tokenData.permissions || [],
        graph_version: graphVersion,
      },
    })
    .select("id")
    .single();

  // Save each page/account
  for (const page of pagesData.data || []) {
    const { data: account } = await supabase
      .from("integration_accounts")
      .upsert({
        company_id,
        company_integration_id: companyIntegration!.id,
        provider,
        external_account_id: page.id,
        external_account_name: page.name,
        account_type: "page",
        avatar_url: `https://graph.facebook.com/${graphVersion}/${page.id}/picture`,
        status: "active",
        permissions: tokenData.permissions || [],
      })
      .select("id")
      .single();

    // Save encrypted token
    await supabase.from("integration_tokens").insert({
      company_id,
      integration_account_id: account!.id,
      provider,
      access_token_encrypted: encryptToken(page.access_token || longToken, encryptionKey),
      refresh_token_encrypted: null,
      expires_at: expiresAt,
      scopes: tokenData.permissions || [],
      status: "active",
    });
  }

  // Log audit
  await supabase.from("integration_audit_logs").insert({
    company_id,
    integration: provider,
    action: "oauth_connected",
    target_id: companyIntegration!.id,
    metadata: {
      pages_count: pagesData.data?.length || 0,
      scopes: tokenData.permissions || [],
    },
  });

  // Redirect back to dashboard
  const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";
  return Response.redirect(`${appUrl}/dashboard/integraciones?connected=${provider}`, 302);
});
