"use client";

import { useEffect, useState, useCallback } from "react";
import { ApiKeysPanel } from "@/components/dashboard/api-keys-panel";
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  getApiKeyMetrics,
} from "@/lib/services/api-keys";
import type { ApiKey, ApiKeyScope } from "@/lib/types/database";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, active: 0, by_scope: {} as Record<string, number> });
  const [loading, setLoading] = useState(true);

  const companyId = "00000000-0000-0000-0000-000000000000";

  const loadData = useCallback(async () => {
    try {
      const [keysData, metricsData] = await Promise.all([
        getApiKeys(companyId),
        getApiKeyMetrics(companyId),
      ]);
      setApiKeys(keysData);
      setMetrics(metricsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (input: {
    name: string;
    description: string;
    scopes: ApiKeyScope[];
    expires_at?: string;
  }) => {
    const result = await createApiKey({
      company_id: companyId,
      name: input.name,
      description: input.description,
      scopes: input.scopes,
      expires_at: input.expires_at,
      created_by: "00000000-0000-0000-0000-000000000000",
    });
    await loadData();
    return { rawKey: result.rawKey };
  };

  const handleRevoke = async (id: string) => {
    await revokeApiKey(id, "Revocado por el usuario");
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await deleteApiKey(id);
    await loadData();
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando API Keys...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
        <p className="text-gray-500 mt-1">
          Genera claves de API para integrar sistemas externos con tu plataforma
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
          <p className="text-xs text-gray-500 mt-1">Totales</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{metrics.active}</p>
          <p className="text-xs text-gray-500 mt-1">Activas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{apiKeys.length - metrics.active}</p>
          <p className="text-xs text-gray-500 mt-1">Inactivas</p>
        </div>
      </div>

      <ApiKeysPanel
        apiKeys={apiKeys}
        onCreate={handleCreate}
        onRevoke={handleRevoke}
        onDelete={handleDelete}
      />
    </div>
  );
}
