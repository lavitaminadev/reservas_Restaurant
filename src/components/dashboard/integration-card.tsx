"use client";

import type { IntegrationProvider, CompanyIntegration, IntegrationAccount, IntegrationStatus } from "@/lib/types/database";

interface IntegrationCardProps {
  provider: IntegrationProvider;
  integration: (CompanyIntegration & { provider: IntegrationProvider }) | null | undefined;
  accounts: IntegrationAccount[];
  onConnect: (providerSlug: string) => void;
  onDisconnect: (integrationId: string) => void;
  oauthUrl?: string;
}

const statusConfig: Record<IntegrationStatus, { label: string; variant: string; icon: string }> = {
  pending: { label: "Pendiente", variant: "bg-gray-100 text-gray-600", icon: "○" },
  connecting: { label: "Conectando...", variant: "bg-yellow-100 text-yellow-700", icon: "◐" },
  connected: { label: "Conectado", variant: "bg-green-100 text-green-700", icon: "●" },
  error: { label: "Error", variant: "bg-red-100 text-red-700", icon: "✕" },
  disconnected: { label: "Desconectado", variant: "bg-gray-100 text-gray-500", icon: "○" },
  revoked: { label: "Revocado", variant: "bg-red-100 text-red-700", icon: "⊘" },
};

const providerIcons: Record<string, string> = {
  meta: "f",
  instagram: "◈",
  google_calendar: "📅",
  gmail: "✉",
  google_drive: "📁",
  google_business: "📍",
};

export function IntegrationCard({
  provider,
  integration,
  accounts,
  onConnect,
  onDisconnect,
  oauthUrl,
}: IntegrationCardProps) {
  const isConnected = integration?.status === "connected";
  const status = integration?.status ?? "pending";
  const config = statusConfig[status] ?? statusConfig.pending;
  const latestAccount = accounts[0];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
            {providerIcons[provider.slug] ?? "🔌"}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{provider.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{provider.description}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.variant}`}>
          <span>{config.icon}</span>
          {config.label}
        </span>
      </div>

      {isConnected && latestAccount && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {latestAccount.avatar_url && (
              <img
                src={latestAccount.avatar_url}
                alt=""
                className="w-6 h-6 rounded-full"
              />
            )}
            <div>
              <p className="text-sm font-medium text-gray-700">
                {latestAccount.external_account_name}
              </p>
              <p className="text-xs text-gray-400">
                ID: {latestAccount.external_account_id.slice(0, 12)}...
              </p>
            </div>
          </div>
          {latestAccount.permissions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {latestAccount.permissions.slice(0, 4).map((perm) => (
                <span
                  key={perm}
                  className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
                >
                  {perm.replace(/_/g, " ")}
                </span>
              ))}
              {latestAccount.permissions.length > 4 && (
                <span className="text-xs text-gray-400">
                  +{latestAccount.permissions.length - 4} más
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {integration?.last_error && (
        <div className="mb-3 p-2 bg-red-50 text-red-600 rounded-lg text-xs">
          {integration.last_error}
        </div>
      )}

      <div className="flex gap-2">
        {isConnected ? (
          <button
            onClick={() => onDisconnect(integration!.id)}
            className="flex-1 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Desconectar
          </button>
        ) : (
          <button
            onClick={() => onConnect(provider.slug)}
            className="flex-1 px-3 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Conectar
          </button>
        )}
      </div>
    </div>
  );
}
