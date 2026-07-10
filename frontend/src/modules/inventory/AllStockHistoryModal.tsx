import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useToast } from '../../components/ToastContext';

type AuditType = 'STOCK_ADD' | 'STOCK_CORRECT' | 'PRICE_PURCHASE' | 'PRICE_SALE';

interface ProductAudit {
  id: number;
  type: AuditType;
  stockBefore: number | null;
  stockAfter: number | null;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  createdAt: string;
  product: {
    id: number;
    name: string;
    category: { name: string };
  };
  user: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface Props {
  readonly onClose: () => void;
}

const TYPE_LABEL: Record<AuditType, string> = {
  STOCK_ADD: 'Compra',
  STOCK_CORRECT: 'Corrección',
  PRICE_PURCHASE: 'Precio compra',
  PRICE_SALE: 'Precio venta',
};

const TYPE_COLOR: Record<AuditType, string> = {
  STOCK_ADD: 'bg-green-100 text-green-700',
  STOCK_CORRECT: 'bg-orange-100 text-orange-700',
  PRICE_PURCHASE: 'bg-blue-100 text-blue-700',
  PRICE_SALE: 'bg-purple-100 text-purple-700',
};

function formatPrice(val: string | null) {
  if (val === null) return '—';
  return `$${Number.parseFloat(val).toLocaleString('es-CO')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function AllStockHistoryModal({ onClose }: Props) {
  const showToast = useToast();
  const [entries, setEntries] = useState<ProductAudit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ProductAudit[]>('/products/stock-history')
      .then((r) => setEntries(r.data))
      .catch(() => showToast('Error al cargar el historial de inventario', 'error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Historial de cambios — todos los productos</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            Cerrar
          </button>
        </div>

        <div className="overflow-auto flex-1">
          {loading && <p className="p-5 text-gray-500 text-sm">Cargando...</p>}
          {!loading && entries.length === 0 && (
            <p className="p-5 text-gray-400 text-sm">No hay cambios registrados.</p>
          )}
          {!loading && entries.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha y hora</th>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-center">Detalle</th>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-xs">
                      {formatDate(e.createdAt)}
                    </td>
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-800">{e.product.name}</p>
                      <p className="text-xs text-gray-400">{e.product.category.name}</p>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[e.type]}`}>
                        {TYPE_LABEL[e.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {e.type === 'STOCK_ADD' || e.type === 'STOCK_CORRECT' ? (
                        <span className="font-medium text-gray-800">{e.stockAfter ?? '—'} uds.</span>
                      ) : (
                        <span className="text-xs text-gray-600">
                          {formatPrice(e.oldValue)} → {formatPrice(e.newValue)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600 text-xs whitespace-nowrap">
                      {e.user.firstName} {e.user.lastName}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{e.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
