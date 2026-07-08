"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { IntegrationCard } from "@/components/dashboard/integration-card";
import { getProviders, getCompanyIntegrations, getIntegrationAccounts, connectIntegration, disconnectIntegration } from "@/lib/services/integrations";
import type { IntegrationProvider, CompanyIntegration, IntegrationAccount } from "@/lib/types/database";

function IntegracionesContent() {
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [integrations, setIntegrations] = useState<(CompanyIntegration & { provider: IntegrationProvider })[]>([]);
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const companyId = "00000000-0000-0000-0000-000000000000";
      const [providersData, integrationsData, accountsData] = await Promise.all([
        getProviders(),
        getCompanyIntegrations(companyId),
        getIntegrationAccounts(companyId),
      ]);
      setProviders(providersData);
      setIntegrations(integrationsData);
      setAccounts(accountsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConnect = async (providerSlug: string) => {
    try {
      const companyId = "00000000-0000-0000-0000-000000000000";
      const { oauth_url } = await connectIntegration(companyId, providerSlug);
      if (oauth_url.startsWith("http")) {
        window.location.href = oauth_url;
      } else {
        window.location.href = oauth_url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection error");
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const companyId = "00000000-0000-0000-0000-000000000000";
      await disconnectIntegration(companyId, integrationId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error disconnecting");
    }
  };

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integraciones</h1>
        <p className="text-gray-500 mt-1">
          Conecta tus canales externos: Instagram, Facebook, Google y más
        </p>
      </div>

      {connectedParam && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
          {connectedParam === "instagram" && "Instagram conectado exitosamente."}
          {connectedParam === "meta" && "Meta/Facebook conectado exitosamente."}
          {connectedParam !== "instagram" && connectedParam !== "meta" && `${connectedParam} conectado exitosamente.`}
        </div>
      )}

      {errorParam && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          {errorParam === "missing_meta_app_id" && "Meta App ID no configurado. Revisa .env.local"}
          {errorParam === "google_oauth_not_configured" && "Google OAuth no configurado. Próximamente."}
          {errorParam === "unknown_provider" && "Proveedor desconocido."}
          {!["missing_meta_app_id", "google_oauth_not_configured", "unknown_provider"].includes(errorParam) && `Error: ${errorParam}`}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando integraciones...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => {
            const integration = integrations.find((i) => i.provider_id === provider.id);
            const providerAccounts = accounts.filter((a) => a.provider === provider.slug);
            return (
              <IntegrationCard
                key={provider.id}
                provider={provider}
                integration={integration}
                accounts={providerAccounts}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Estado general</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{providers.length}</p>
            <p className="text-xs text-gray-500">Proveedores</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {integrations.filter((i) => i.status === "connected").length}
            </p>
            <p className="text-xs text-gray-500">Conectados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {integrations.filter((i) => i.status === "pending" || i.status === "connecting").length}
            </p>
            <p className="text-xs text-gray-500">Pendientes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {integrations.filter((i) => i.status === "error" || i.status === "disconnected").length}
            </p>
            <p className="text-xs text-gray-500">Con errores</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntegracionesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">Cargando...</div>}>
      <IntegracionesContent />
    </Suspense>
  );
}
