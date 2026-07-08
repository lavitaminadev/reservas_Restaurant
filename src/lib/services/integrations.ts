import { getSupabaseClient } from "../supabase/client";
import type {
  IntegrationProvider,
  CompanyIntegration,
  IntegrationAccount,
  IntegrationToken,
  IntegrationProviderSlug,
  IntegrationStatus,
} from "../types/database";

export async function getProviders(): Promise<IntegrationProvider[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("integration_providers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getProviderBySlug(
  slug: IntegrationProviderSlug
): Promise<IntegrationProvider | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("integration_providers")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function getCompanyIntegrations(
  companyId: string
): Promise<(CompanyIntegration & { provider: IntegrationProvider })[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("company_integrations")
    .select("*, provider:integration_providers(*)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCompanyIntegration(
  companyId: string,
  providerSlug: string
): Promise<(CompanyIntegration & { provider: IntegrationProvider }) | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("company_integrations")
    .select("*, provider:integration_providers(*)")
    .eq("company_id", companyId)
    .eq("provider.slug", providerSlug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function connectIntegration(
  companyId: string,
  providerSlug: string
): Promise<{ oauth_url: string; integration_id: string }> {
  const supabase = getSupabaseClient();
  const provider = await getProviderBySlug(providerSlug as IntegrationProviderSlug);
  if (!provider) throw new Error("Provider not found");

  const { data: existing, error: existingError } = await supabase
    .from("company_integrations")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (existingError) throw existingError;

  let integrationId = existing?.id;
  if (!integrationId) {
    const { data: newIntegration, error: insertError } = await supabase
      .from("company_integrations")
      .insert({
        company_id: companyId,
        provider_id: provider.id,
        status: "connecting",
        metadata: {},
      })
      .select("id")
      .single();

    if (insertError) throw insertError;
    integrationId = newIntegration.id;
  } else {
    await supabase
      .from("company_integrations")
      .update({ status: "connecting" })
      .eq("id", integrationId);
  }

  const oauthUrl = buildOAuthUrl(providerSlug, companyId);
  return { oauth_url: oauthUrl, integration_id: integrationId };
}

function buildOAuthUrl(providerSlug: string, companyId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const state = btoa(
    JSON.stringify({
      company_id: companyId,
      provider: providerSlug,
      redirect_uri: `${baseUrl}/api/auth/callback`,
    })
  );

  switch (providerSlug) {
    case "meta":
    case "instagram": {
      const appId = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID;
      if (!appId) return "/dashboard/integraciones?error=missing_meta_app_id";
      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: `${baseUrl}/api/auth/callback`,
        state,
        scope: "pages_show_list,instagram_basic,instagram_manage_messages,pages_messaging",
        response_type: "code",
      });
      return `https://www.facebook.com/${process.env.META_GRAPH_API_VERSION || "v18.0"}/dialog/oauth?${params}`;
    }
    case "google_calendar": {
      return `/dashboard/integraciones?error=google_oauth_not_configured`;
    }
    case "gmail": {
      return `/dashboard/integraciones?error=google_oauth_not_configured`;
    }
    case "google_drive": {
      return `/dashboard/integraciones?error=google_oauth_not_configured`;
    }
    case "google_business": {
      return `/dashboard/integraciones?error=google_oauth_not_configured`;
    }
    default:
      return `/dashboard/integraciones?error=unknown_provider`;
  }
}

export async function disconnectIntegration(
  companyId: string,
  integrationId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  await supabase
    .from("integration_tokens")
    .update({ status: "revoked" })
    .eq("company_id", companyId)
    .filter("integration_account_id in (select id from integration_accounts where company_integration_id)", "eq", integrationId);

  await supabase
    .from("integration_accounts")
    .update({ status: "revoked" })
    .eq("company_integration_id", integrationId);

  await supabase
    .from("company_integrations")
    .update({
      status: "disconnected",
      disconnected_at: new Date().toISOString(),
    })
    .eq("id", integrationId);
}

export async function getIntegrationAccounts(
  companyId: string,
  provider?: string
): Promise<IntegrationAccount[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("integration_accounts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (provider) {
    query = query.eq("provider", provider);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getIntegrationStatus(
  companyId: string
): Promise<
  Record<
    string,
    {
      status: IntegrationStatus;
      accounts: IntegrationAccount[];
      last_sync?: string;
      last_error?: string;
    }
  >
> {
  const integrations = await getCompanyIntegrations(companyId);
  const result: Record<string, any> = {};

  for (const integration of integrations) {
    const accounts = await getIntegrationAccounts(companyId, integration.provider.slug);
    result[integration.provider.slug] = {
      status: integration.status,
      accounts,
      last_error: integration.last_error,
    };
  }

  return result;
}

export async function getOAuthUrls(companyId: string) {
  const providers = await getProviders();

  const urls: Record<string, string> = {};
  for (const provider of providers) {
    const { oauth_url } = await connectIntegration(companyId, provider.slug).catch(() => ({
      oauth_url: `/dashboard/integraciones?error=${provider.slug}_not_configured`,
    }));
    urls[provider.slug] = oauth_url;
  }

  return urls;
}
