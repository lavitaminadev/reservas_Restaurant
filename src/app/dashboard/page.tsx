"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardMetrics } from "@/lib/services/dashboard";
import type { DashboardMetrics } from "@/lib/types/database";

const defaultMetrics: DashboardMetrics = {
  total_companies: 0,
  active_companies: 0,
  total_users: 0,
  active_users: 0,
  files_uploaded: 0,
  documents_processed: 0,
  chunks_vectorized: 0,
  conversations_active: 0,
  tickets_open: 0,
  campaigns_active: 0,
  instagram_connected: 0,
  instagram_pending: 0,
  recent_errors: 0,
  chatbot_enabled: 0,
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Panel general de la plataforma multiempresa
          </p>
        </div>
        <Badge variant="info">
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Empresas Activas"
          value={metrics.active_companies}
          subtitle={`${metrics.total_companies} totales`}
          icon="■"
          variant="info"
        />
        <Card
          title="Usuarios Activos"
          value={metrics.active_users}
          subtitle={`${metrics.total_users} totales`}
          icon="○"
          variant="default"
        />
        <Card
          title="Instagram"
          value={metrics.instagram_connected}
          subtitle={`${metrics.instagram_pending} pendientes`}
          icon="◎"
          variant={metrics.instagram_connected > 0 ? "success" : "warning"}
        />
        <Card
          title="Chatbot"
          value={metrics.chatbot_enabled}
          subtitle="habilitados"
          icon="◇"
          variant={metrics.chatbot_enabled > 0 ? "success" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Archivos Cargados"
          value={metrics.files_uploaded}
          icon="△"
          variant="default"
        />
        <Card
          title="Documentos Procesados"
          value={metrics.documents_processed}
          subtitle={`${metrics.chunks_vectorized} chunks vectorizados`}
          icon="▲"
          variant="info"
        />
        <Card
          title="Conversaciones"
          value={metrics.conversations_active}
          subtitle="activas"
          icon="★"
          variant="default"
        />
        <Card
          title="Tickets Abiertos"
          value={metrics.tickets_open}
          icon="☐"
          variant={metrics.tickets_open > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Campañas Activas"
          value={metrics.campaigns_active}
          icon="☆"
          variant={metrics.campaigns_active > 0 ? "success" : "default"}
        />
        <Card
          title="Errores Recientes (24h)"
          value={metrics.recent_errors}
          icon="⚠"
          variant={metrics.recent_errors > 0 ? "danger" : "success"}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Acceso rápido
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Empresas", href: "/dashboard/empresas" },
            { label: "Archivos", href: "/dashboard/archivos" },
            { label: "Conocimiento", href: "/dashboard/conocimiento" },
            { label: "Chatbot", href: "/dashboard/chatbot" },
            { label: "Flujos", href: "/dashboard/flujos" },
            { label: "Conversaciones", href: "/dashboard/conversaciones" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-center py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
