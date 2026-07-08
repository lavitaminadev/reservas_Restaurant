"use client";

import { useEffect, useState, useCallback } from "react";
import { WebhooksPanel } from "@/components/dashboard/webhooks-panel";
import {
  getWebhookEndpoints,
  getWebhookEvents,
  getWebhookMetrics,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
} from "@/lib/services/webhooks";
import type { WebhookEndpoint, WebhookEvent } from "@/lib/types/database";

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [metrics, setMetrics] = useState({
    total_endpoints: 0,
    total_events: 0,
    inbound_today: 0,
    outbound_today: 0,
    failed_last_24h: 0,
    by_provider: {} as Record<string, number>,
    by_status: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", events: "" });

  const companyId = "00000000-0000-0000-0000-000000000000";

  const loadData = useCallback(async () => {
    try {
      const [endpointsData, eventsData, metricsData] = await Promise.all([
        getWebhookEndpoints(companyId),
        getWebhookEvents(companyId, { limit: 20 }),
        getWebhookMetrics(companyId),
      ]);
      setEndpoints(endpointsData);
      setEvents(eventsData);
      setMetrics(metricsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = () => setShowForm(true);

  const handleCreate = async () => {
    if (!form.name || !form.url) return;
    try {
      await createWebhookEndpoint({
        company_id: companyId,
        name: form.name,
        url: form.url,
        events: form.events.split(",").map((e) => e.trim()).filter(Boolean),
        created_by: "00000000-0000-0000-0000-000000000000",
      });
      setShowForm(false);
      setForm({ name: "", url: "", events: "" });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = async (id: string) => {
    const ep = endpoints.find((e) => e.id === id);
    if (ep) {
      setForm({ name: ep.name, url: ep.url, events: ep.events.join(", ") });
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteWebhookEndpoint(id);
    await loadData();
  };

  const handleToggle = async (id: string, status: string) => {
    await updateWebhookEndpoint(id, { status: status as any });
    await loadData();
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando webhooks...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
        <p className="text-gray-500 mt-1">
          Recibe y envía eventos a sistemas externos
        </p>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">
            {form.name ? "Editar endpoint" : "Nuevo endpoint"}
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Mi webhook"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="https://ejemplo.com/webhook"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eventos (separados por coma)
            </label>
            <input
              type="text"
              value={form.events}
              onChange={(e) => setForm({ ...form, events: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="lead.created, ticket.created, reservation.created"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              Guardar
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <WebhooksPanel
        endpoints={endpoints}
        events={events}
        metrics={metrics}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggle}
      />
    </div>
  );
}
