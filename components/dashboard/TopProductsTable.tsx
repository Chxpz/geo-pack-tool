import type { TopProduct } from '@/lib/types';

interface Props {
  products: TopProduct[];
}

export default function TopProductsTable({ products }: Props) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">
        No AI mentions yet. Run a scan to see which products are being recommended.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-medium text-gray-500 w-full">Product</th>
            <th className="text-right py-2 pr-4 font-medium text-gray-500 whitespace-nowrap">Mentions</th>
            <th className="text-right py-2 font-medium text-gray-500 whitespace-nowrap">Avg Position</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={p.id} className={i < products.length - 1 ? 'border-b border-gray-50' : ''}>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2.5">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt=""
                      className="w-8 h-8 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-gray-100 shrink-0" />
                  )}
                  <span className="font-medium text-gray-900 line-clamp-1">{p.name}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-gray-700">{p.mentions}</td>
              <td className="py-2.5 text-right tabular-nums">
                {p.avg_position != null ? (
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.avg_position <= 3
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    #{p.avg_position}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
