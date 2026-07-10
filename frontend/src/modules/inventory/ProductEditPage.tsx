import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import ProductForm from './ProductForm';
import { useToast } from '../../components/ToastContext';
import type { Category, Product } from './ProductsPage';

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
  user: {
    firstName: string;
    lastName: string;
  };
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

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showToast = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [history, setHistory] = useState<ProductAudit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function loadHistory() {
    if (!id) return;
    setLoadingHistory(true);
    try {
      const res = await api.get<ProductAudit[]>(`/products/${id}/stock-history`);
      setHistory(res.data);
    } catch {
      showToast('Error al cargar el historial de cambios', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    Promise.all([
      api.get<Product>(`/products/${id}`),
      api.get<Category[]>('/categories?active=true'),
      api.get<Product[]>('/products?active=true'),
    ])
      .then(([prodRes, catRes, allProdRes]) => {
        setProduct(prodRes.data);
        setCategories(catRes.data);
        setAllProducts(allProdRes.data);
      })
      .catch(() => {
        showToast('Error al cargar el producto', 'error');
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));

    loadHistory();
  }, [id]);

  if (loading) return <p className="text-gray-500">Cargando...</p>;
  if (loadFailed || !product) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 mb-3">No se pudo cargar el producto.</p>
        <button
          onClick={() => navigate('/productos')}
          className="text-blue-600 hover:underline text-sm"
        >
          Volver a productos
        </button>
      </div>
    );
  }

  const isBien = product.category.tipo === 'BIEN';

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0">
        <ProductForm
          initial={product}
          categories={categories}
          allProducts={allProducts}
          onSaved={() => navigate('/productos')}
          onCancel={() => navigate('/productos')}
          onStockChange={loadHistory}
        />
      </div>

      <div className="w-96 shrink-0 sticky top-6">
        <div className="bg-white rounded shadow flex flex-col" style={{ maxHeight: 'calc(100vh - 5rem)' }}>
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-800">Historial de cambios</h3>
          </div>

          <div className="overflow-y-auto flex-1">
            {loadingHistory && (
              <p className="p-4 text-xs text-gray-400">Cargando...</p>
            )}
            {!loadingHistory && history.length === 0 && (
              <p className="p-4 text-xs text-gray-400">
                {isBien
                  ? 'Sin cambios registrados para este producto.'
                  : 'El historial de stock solo aplica a bienes.'}
              </p>
            )}
            {!loadingHistory && history.length > 0 && (
              <ul className="divide-y divide-gray-100">
                {history.map((e) => (
                  <li key={e.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[e.type]}`}>
                        {TYPE_LABEL[e.type]}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(e.createdAt)}
                      </span>
                    </div>

                    <div className="text-sm font-medium text-gray-800">
                      {e.type === 'STOCK_ADD' || e.type === 'STOCK_CORRECT' ? (
                        <>Stock total: <span className="text-blue-600">{e.stockAfter ?? '—'} uds.</span></>
                      ) : (
                        <span className="text-gray-700">
                          {formatPrice(e.oldValue)} → {formatPrice(e.newValue)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{e.user.firstName} {e.user.lastName}</span>
                      {e.note && <span className="italic truncate ml-2 max-w-40">{e.note}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
