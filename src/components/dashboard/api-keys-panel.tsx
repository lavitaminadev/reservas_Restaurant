"use client";

import { useState } from "react";
import type { ApiKey, ApiKeyScope } from "@/lib/types/database";
import { API_KEY_SCOPES } from "@/lib/services/api-keys";

interface ApiKeysPanelProps {
  apiKeys: ApiKey[];
  onCreate: (input: {
    name: string;
    description: string;
    scopes: ApiKeyScope[];
    expires_at?: string;
  }) => Promise<{ rawKey: string } | void>;
  onRevoke: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ApiKeysPanel({ apiKeys, onCreate, onRevoke, onDelete }: ApiKeysPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([]);
  const [expiresDays, setExpiresDays] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || selectedScopes.length === 0) return;
    setLoading(true);
    try {
      const expiresAt = expiresDays
        ? new Date(Date.now() + parseInt(expiresDays) * 86400000).toISOString()
        : undefined;
      const result = await onCreate({ name, description, scopes: selectedScopes, expires_at: expiresAt });
      if (result && "rawKey" in result) {
        setNewKey(result.rawKey);
      }
      setShowForm(false);
      setName("");
      setDescription("");
      setSelectedScopes([]);
      setExpiresDays("");
    } finally {
      setLoading(false);
    }
  };

  const toggleScope = (scope: ApiKeyScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  return (
    <div className="space-y-6">
      {newKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            ¡Clave creada! Cópiala ahora. No podrás volver a verla.
          </p>
          <div className="bg-white border border-yellow-300 rounded-lg p-3 font-mono text-sm break-all select-all">
            {newKey}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(newKey);
            }}
            className="mt-2 text-sm text-yellow-700 hover:text-yellow-800 underline"
          >
            Copiar al portapapeles
          </button>
          <button
            onClick={() => setNewKey(null)}
            className="mt-2 ml-4 text-sm text-yellow-700 hover:text-yellow-800 underline"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          API Keys ({apiKeys.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
        >
          {showForm ? "Cancelar" : "+ Nueva API Key"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Landing principal, Formulario reservas..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="¿Para qué se usará esta key?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permisos</label>
            <div className="grid grid-cols-2 gap-2">
              {API_KEY_SCOPES.map((scope) => (
                <label
                  key={scope.value}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                    selectedScopes.includes(scope.value)
                      ? "border-primary bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                    className="rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-700">{scope.label}</p>
                    <p className="text-xs text-gray-400">{scope.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expira en días (opcional)
            </label>
            <input
              type="number"
              value={expiresDays}
              onChange={(e) => setExpiresDays(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Dejar vacío para que no expire"
              min={1}
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !name || selectedScopes.length === 0}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear API Key"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {apiKeys.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No hay API Keys. Crea una para integrar sistemas externos.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Nombre</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Prefijo</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Permisos</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Último uso</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id} className="border-b border-gray-100">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900">{key.name}</p>
                    {key.description && (
                      <p className="text-xs text-gray-400">{key.description}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-gray-500">
                    {key.key_prefix}...{key.key_last_chars}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        key.status === "active"
                          ? "bg-green-100 text-green-700"
                          : key.status === "revoked"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {key.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-400">
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString("es-AR")
                      : "Nunca"}
                  </td>
                  <td className="py-3 px-4">
                    {key.status === "active" ? (
                      <button
                        onClick={() => onRevoke(key.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Revocar
                      </button>
                    ) : (
                      <button
                        onClick={() => onDelete(key.id)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
