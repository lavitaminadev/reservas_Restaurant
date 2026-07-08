"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getProviderBySlug, getCompanyIntegrations, getIntegrationAccounts, getIntegrationStatus } from "@/lib/services/integrations";
import { getLastSync, getSyncJobs } from "@/lib/services/sync";
import { getWebhookEvents } from "@/lib/services/webhooks";
import type { IntegrationProvider, CompanyIntegration, IntegrationAccount } from "@/lib/types/database";

const providerInfo: Record<string, { name: string; description: string; icon: string }> = {
  meta: { name: "Meta / Facebook", description: "Páginas de Facebook, Instagram Professional, Graph API", icon: "f" },
  instagram: { name: "Instagram", description: "Mensajes, comentarios, leads desde Instagram", icon: "◈" },
  "google-calendar": { name: "Google Calendar", description: "Sincronización de reservas y disponibilidad", icon: "📅" },
  gmail: { name: "Gmail", description: "Envío de correos transaccionales", icon: "✉" },
  "google-drive": { name: "Google Drive", description: "Importación de documentos a base de conocimiento", icon: "📁" },
  "google-business": { name: "Google Business Profile", description: "Información pública del negocio en Google", icon: "📍" },
};

const providerSlugMap: Record<string, string> = {
  "google-calendar": "google_calendar",
  "google-drive": "google_drive",
  "google-business": "google_business",
};

export default function IntegrationDetailPage() {
  const params = useParams();
  const providerSlug = (params.provider as string).replace(/-/g, "_");
  const originalSlug = params.provider as string;
  const info = providerInfo[originalSlug];

  const [provider, setProvider] = useState<IntegrationProvider | null>(null);
  const [integration, setIntegration] = useState<(CompanyIntegration & { provider: IntegrationProvider }) | null>(null);
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [syncJobs, setSyncJobs] = useState<any[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const companyId = "00000000-0000-0000-0000-000000000000";

  useEffect(() => {
    const load = async () => {
      try {
        const [prov, integ, accs, jobs, events] = await Promise.all([
          getProviderBySlug(providerSlug as any),
          getCompanyIntegrations(companyId).then((list) =>
            list.find((i) => i.provider.slug === providerSlug) ?? null
          ),
          getIntegrationAccounts(companyId, providerSlug),
          getSyncJobs(companyId, { provider: providerSlug, limit: 10 }),
          getWebhookEvents(companyId, { provider: providerSlug, limit: 20 }),
        ]);
        setProvider(prov);
        setIntegration(integ);
        setAccounts(accs);
        setSyncJobs(jobs);
        setWebhookEvents(events);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [providerSlug, companyId]);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando...</div>;
  }

  if (!info) {
    return <div className="text-center py-12 text-gray-400">Integración no encontrada</div>;
  }

  const isConnected = integration?.status === "connected";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
          {info.icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{info.name}</h1>
          <p className="text-gray-500">{info.description}</p>
        </div>
        <span
          className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
            isConnected
              ? "bg-green-100 text-green-700"
              : integration?.status === "error"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {integration?.status ?? "No conectado"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cuentas conectadas</h2>
            {accounts.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">
                No hay cuentas conectadas
              </p>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2">
                  {acc.avatar_url && (
                    <img src={acc.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{acc.external_account_name}</p>
                    <p className="text-xs text-gray-400">ID: {acc.external_account_id}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      acc.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {acc.status}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimas sincronizaciones</h2>
            {syncJobs.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">Sin sincronizaciones</p>
            ) : (
              syncJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{job.job_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(job.created_at).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      job.status === "completed"
                        ? "bg-green-100 text-green-600"
                        : job.status === "failed"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-600"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Webhooks recibidos</h2>
            {webhookEvents.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">Sin eventos</p>
            ) : (
              webhookEvents.slice(0, 10).map((evt) => (
                <div key={evt.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{evt.event_type}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(evt.received_at).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      evt.status === "processed"
                        ? "bg-green-100 text-green-600"
                        : evt.status === "failed"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-600"
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>
            <div className="space-y-2">
              {!isConnected ? (
                <button className="w-full py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90">
                  Conectar {info.name}
                </button>
              ) : (
                <>
                  <button className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100">
                    Sincronizar ahora
                  </button>
                  <button className="w-full py-2 bg-yellow-50 text-yellow-600 rounded-lg text-sm hover:bg-yellow-100">
                    Renovar token
                  </button>
                  <button className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">
                    Desconectar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
