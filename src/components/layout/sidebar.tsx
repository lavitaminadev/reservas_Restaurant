"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "□" },
  { label: "Empresas", href: "/dashboard/empresas", icon: "■" },
  { label: "Usuarios", href: "/dashboard/usuarios", icon: "○" },
  { label: "Roles", href: "/dashboard/roles", icon: "○" },
  { label: "Integraciones", href: "/dashboard/integraciones", icon: "🔌" },
  { label: "Meta / Facebook", href: "/dashboard/integraciones/meta", icon: "f" },
  { label: "Instagram", href: "/dashboard/integraciones/instagram", icon: "◈" },
  { label: "Google Calendar", href: "/dashboard/integraciones/google-calendar", icon: "📅" },
  { label: "Gmail", href: "/dashboard/integraciones/gmail", icon: "✉" },
  { label: "Google Drive", href: "/dashboard/integraciones/google-drive", icon: "📁" },
  { label: "Google Business", href: "/dashboard/integraciones/google-business", icon: "📍" },
  { label: "Webhooks", href: "/dashboard/webhooks", icon: "↗" },
  { label: "API Keys", href: "/dashboard/api-keys", icon: "🔑" },
  { label: "Archivos", href: "/dashboard/archivos", icon: "△" },
  { label: "Base de Conocimiento", href: "/dashboard/conocimiento", icon: "▲" },
  { label: "Chatbot", href: "/dashboard/chatbot", icon: "◇" },
  { label: "Flujos", href: "/dashboard/flujos", icon: "◆" },
  { label: "Campañas", href: "/dashboard/campanas", icon: "☆" },
  { label: "Conversaciones", href: "/dashboard/conversaciones", icon: "★" },
  { label: "Tickets", href: "/dashboard/tickets", icon: "☐" },
  { label: "Clientes", href: "/dashboard/clientes", icon: "☑" },
  { label: "Métricas", href: "/dashboard/metricas", icon: "📊" },
  { label: "Auditoría", href: "/dashboard/auditoria", icon: "📋" },
  { label: "Configuración", href: "/dashboard/configuracion", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } bg-gray-900 text-white min-h-screen transition-all duration-200 flex flex-col`}
    >
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!collapsed && (
          <Link href="/dashboard" className="font-bold text-lg truncate">
            Reservas
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-lg w-5 text-center flex-shrink-0">
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="text-sm text-gray-400 hover:text-white w-full text-left"
          >
            {collapsed ? "⊂" : "Cerrar Sesión"}
          </button>
        </form>
      </div>
    </aside>
  );
}
