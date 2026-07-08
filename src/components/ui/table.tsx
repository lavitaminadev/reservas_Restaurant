"use client";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left py-3 px-4 font-medium text-gray-500"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr
              key={(item.id as string) ?? i}
              onClick={() => onRowClick?.(item)}
              className={`border-b border-gray-100 ${
                onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4">
                  {col.render ? col.render(item) : String(item[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-8 text-gray-400"
              >
                Sin datos
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
