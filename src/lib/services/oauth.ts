import { getSupabaseServer } from "../supabase/server";
import type { IntegrationProviderSlug } from "../types/database";

export async function handleOAuthCallback(params: {
  code: string;
  state: string;
  provider: IntegrationProviderSlug;
}): Promise<{ redirectUrl: string }> {
  const supabase = await getSupabaseServer();

  let stateData: { company_id: string; provider: string; redirect_uri: string };
  try {
    stateData = JSON.parse(atob(params.state));
  } catch {
    return { redirectUrl: "/dashboard/integraciones?error=invalid_state" };
  }

  if (stateData.provider !== params.provider) {
    return { redirectUrl: "/dashboard/integraciones?error=provider_mismatch" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { redirectUrl: "/login" };
  }

  const userBelongs = await supabase
    .from("company_users")
    .select("id")
    .eq("company_id", stateData.company_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!userBelongs.data) {
    return { redirectUrl: "/dashboard/integraciones?error=access_denied" };
  }

  return {
    redirectUrl: `/dashboard/integraciones?connecting=${params.provider}&company=${stateData.company_id}`,
  };
}

export async function buildOAuthUrl(
  companyId: string,
  provider: IntegrationProviderSlug
): Promise<string | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const callbackUrl = `${appUrl}/api/auth/callback`;

  const state = btoa(
    JSON.stringify({
      company_id: companyId,
      provider,
      redirect_uri: callbackUrl,
    })
  );

  switch (provider) {
    case "meta":
    case "instagram": {
      const appId = process.env.META_APP_ID;
      if (!appId) return null;
      const version = process.env.META_GRAPH_API_VERSION || "v18.0";
      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: callbackUrl,
        state,
        scope: "pages_show_list,instagram_basic,instagram_manage_messages,pages_messaging",
        response_type: "code",
      });
      return `https://www.facebook.com/${version}/dialog/oauth?${params}`;
    }
    case "google_calendar": {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return null;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        state,
        scope: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
    case "gmail": {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return null;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        state,
        scope: "https://www.googleapis.com/auth/gmail.send",
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
    case "google_drive": {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return null;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        state,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
    case "google_business": {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return null;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        state,
        scope: "https://www.googleapis.com/auth/business.manage",
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
    default:
      return null;
  }
}

export async function refreshMetaToken(
  companyId: string,
  accountId: string
): Promise<boolean> {
  const supabase = await getSupabaseServer();
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return false;

  const { data: token } = await supabase
    .from("integration_tokens")
    .select("*")
    .eq("integration_account_id", accountId)
    .eq("status", "active")
    .single();

  if (!token) return false;

  try {
    const url = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || "v18.0"}/oauth/access_token`;
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: token.access_token_encrypted,
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (data.access_token) {
      await supabase
        .from("integration_tokens")
        .update({
          access_token_encrypted: data.access_token,
          expires_at: new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString(),
          last_refreshed_at: new Date().toISOString(),
        })
        .eq("id", token.id);

      return true;
    }

    return false;
  } catch {
    return false;
  }
}
