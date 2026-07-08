export default async function DashboardSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const section = slug[0];
  const titleMap: Record<string, string> = {
    empresas: "Empresas",
    usuarios: "Usuarios",
    cuentas: "Cuentas Conectadas",
    instagram: "Instagram",
    archivos: "Archivos",
    conocimiento: "Base de Conocimiento",
    chatbot: "Chatbot",
    flujos: "Flujos",
    campanas: "Campañas",
    conversaciones: "Conversaciones",
    tickets: "Tickets",
    clientes: "Clientes",
    metricas: "Métricas",
    auditoria: "Auditoría",
    configuracion: "Configuración",
  };

  const title = titleMap[section] ?? "Sección";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 mt-1">
          Gestión de {title.toLowerCase()}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
        <div className="text-6xl mb-4 text-gray-300">○</div>
        <h2 className="text-xl font-semibold text-gray-600 mb-2">
          {title}
        </h2>
        <p className="text-gray-400 max-w-md">
          Esta sección está en construcción. Pronto podrás gestionar{" "}
          {title.toLowerCase()} desde aquí.
        </p>
      </div>
    </div>
  );
}
