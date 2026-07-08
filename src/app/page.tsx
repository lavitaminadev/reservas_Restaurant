import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-2xl mx-auto p-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Reservas Restaurant
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Plataforma SaaS multiempresa para restaurantes.
          Gestión inteligente con Instagram, chatbot IA y base de conocimiento vectorial.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
