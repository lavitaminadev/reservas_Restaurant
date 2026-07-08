"use client";

interface CardProps {
  title?: string;
  value?: string | number;
  subtitle?: string;
  icon?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children?: React.ReactNode;
  className?: string;
}

const variantStyles = {
  default: "bg-white border-gray-200",
  success: "bg-green-50 border-green-200",
  warning: "bg-yellow-50 border-yellow-200",
  danger: "bg-red-50 border-red-200",
  info: "bg-blue-50 border-blue-200",
};

export function Card({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
  children,
  className = "",
}: CardProps) {
  return (
    <div
      className={`rounded-xl border p-5 ${variantStyles[variant]} ${className}`}
    >
      {icon && (
        <div className="text-2xl mb-2">{icon}</div>
      )}
      {title && (
        <p className="text-sm font-medium text-gray-500">{title}</p>
      )}
      {value !== undefined && (
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      )}
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
