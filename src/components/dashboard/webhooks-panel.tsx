"use client";

import { useState } from "react";
import type { WebhookEndpoint, WebhookEvent } from "@/lib/types/database";

interface WebhooksPanelProps {
  endpoints: WebhookEndpoint[];
  events: WebhookEvent[];
  metrics: {
    total_endpoints: number;
    total_events: number;
    inbound_today: number;
    outbound_today: number;
    failed_last_24h: number;
    by_provider: Record<string, number>;
    by_status: Record<string, number>;
  };
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, status: string) => void;
}

export function WebhooksPanel({
  endpoints,
  events,
  metrics,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: WebhooksPanelProps) {
  const [tab, setTab] = useState<"endpoints" | "events" | "metrics">("endpoints");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["endpoints", "events", "metrics"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "endpoints" && "Endpoints"}
              {t === "events" && "Eventos"}
              {t === "metrics" && "Métricas"}
            </button>
          ))}
        </div>
        {tab === "endpoints" && (
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
          >
            + Nuevo Endpoint
          </button>
        )}
      </div>

      {tab === "endpoints" && (
        <div className="space-y-3">
          {endpoints.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No hay endpoints configurados. Crea uno para empezar a recibir eventos.
            </div>
          ) : (
            endpoints.map((ep) => (
              <div
                key={ep.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{ep.name}</h4>
                    <p className="text-sm text-gray-500 font-mono truncate max-w-md">
                      {ep.url}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ep.status === "active"
                        ? "bg-green-100 text-green-700"
                        : ep.status === "error"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {ep.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>✓ {ep.success_count} ok</span>
                  <span>✕ {ep.failure_count} fail</span>
                  {ep.last_sent_at && (
                    <span>Último envío: {new Date(ep.last_sent_at).toLocaleString("es-AR")}</span>
                  )}
                </div>

                {ep.events.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {ep.events.map((evt) => (
                      <span
                        key={evt}
                        className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
                      >
                        {evt}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(ep.id)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onToggle(ep.id, ep.status === "active" ? "paused" : "active")}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    {ep.status === "active" ? "Pausar" : "Activar"}
                  </button>
                  <button
                    onClick={() => onDelete(ep.id)}
                    className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "events" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {events.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No hay eventos registrados.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Evento</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Proveedor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Dirección</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Recibido</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-mono text-xs">{evt.event_type}</td>
                    <td className="py-3 px-4">{evt.provider}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          evt.direction === "inbound"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-purple-50 text-purple-600"
                        }`}
                      >
                        {evt.direction === "inbound" ? "Entrante" : "Saliente"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          evt.status === "processed"
                            ? "bg-green-50 text-green-600"
                            : evt.status === "failed"
                            ? "bg-red-50 text-red-600"
                            : evt.status === "processing"
                            ? "bg-yellow-50 text-yellow-600"
                            : "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">
                      {new Date(evt.received_at).toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "metrics" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{metrics.total_endpoints}</p>
            <p className="text-xs text-gray-500 mt-1">Endpoints</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{metrics.total_events}</p>
            <p className="text-xs text-gray-500 mt-1">Eventos totales</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{metrics.inbound_today}</p>
            <p className="text-xs text-gray-500 mt-1">Hoy entrantes</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{metrics.outbound_today}</p>
            <p className="text-xs text-gray-500 mt-1">Hoy salientes</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{metrics.failed_last_24h}</p>
            <p className="text-xs text-gray-500 mt-1">Fallos 24h</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2">
            <p className="text-xs text-gray-500 mb-2">Proveedores</p>
            <div className="space-y-1">
              {Object.entries(metrics.by_provider).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{provider}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
