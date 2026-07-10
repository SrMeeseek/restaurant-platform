import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import AllStockHistoryModal from './AllStockHistoryModal';
import { useToast } from '../../components/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';

export interface Category {
  id: number;
  name: string;
  tipo: 'BIEN' | 'SERVICIO' | 'COMBO';
  active: boolean;
}

export interface ComboItem {
  id: number;
  productId: number;
  quantity: number;
  product: Product;
}

export interface Product {
  id: number;
  name: string;
  categoryId: number;
  category: Category;
  purchasePrice: string | null;
  salePrice: string;
  hasIva: boolean;
  ivaPercentage: string | null;
  stock: number | null;
  active: boolean;
  comboItems: ComboItem[];
}

const TIPO_LABEL: Record<string, string> = {
  BIEN: 'Bien',
  SERVICIO: 'Servicio',
  COMBO: 'Combo',
};

function formatPrice(val: string | null) {
  if (val === null) return '—';
  return `$${Number.parseFloat(val).toLocaleString('es-CO')}`;
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function load(archived: boolean) {
    setLoading(true);
    try {
      const res = await api.get<Product[]>(`/products?active=${!archived}`);
      setProducts(res.data);
    } catch {
      showToast('Error al cargar los productos', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(showArchived); }, [showArchived]);

  async function handleArchiveToggle() {
    if (!confirmTarget) return;
    setActionLoading(true);
    try {
      const endpoint = confirmTarget.active
        ? `/products/${confirmTarget.id}/archive`
        : `/products/${confirmTarget.id}/unarchive`;
      await api.put(endpoint);
      showToast(confirmTarget.active ? 'Producto archivado' : 'Producto desarchivado', 'success');
      await load(showArchived);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      showToast(msg ?? 'Error al cambiar estado del producto', 'error');
    } finally {
      setActionLoading(false);
      setConfirmTarget(null);
    }
  }

  function renderRows() {
    if (loading) {
      return (
        <tr>
          <td colSpan={8} className="px-4 py-6 text-center text-gray-400">Cargando...</td>
        </tr>
      );
    }
    if (products.length === 0) {
      return (
        <tr>
          <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
            {showArchived ? 'No hay productos archivados' : 'No hay productos registrados'}
          </td>
        </tr>
      );
    }
    return products.map((p) => (
      <tr key={p.id}>
        <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
        <td className="px-4 py-3 text-gray-600">{p.category.name}</td>
        <td className="px-4 py-3 text-gray-600">{TIPO_LABEL[p.category.tipo]}</td>
        <td className="px-4 py-3 text-right text-gray-600">{formatPrice(p.purchasePrice)}</td>
        <td className="px-4 py-3 text-right text-gray-800 font-medium">{formatPrice(p.salePrice)}</td>
        <td className="px-4 py-3 text-center text-gray-600">
          {p.hasIva ? `${p.ivaPercentage}%` : '—'}
        </td>
        <td className="px-4 py-3 text-center text-gray-700">
          {p.category.tipo === 'BIEN' ? (p.stock ?? 0) : '—'}
        </td>
        <td className="px-4 py-3 text-center space-x-2">
          {!showArchived && (
            <button
              onClick={() => navigate(`/productos/${p.id}/editar`)}
              className="text-blue-600 hover:underline text-xs"
            >
              Editar
            </button>
          )}
          <button
            onClick={() => setConfirmTarget(p)}
            className={`text-xs hover:underline ${showArchived ? 'text-green-600' : 'text-red-500'}`}
          >
            {showArchived ? 'Desarchivar' : 'Archivar'}
          </button>
        </td>
      </tr>
    ));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAllHistory(true)}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 text-sm"
          >
            Historial de inventario
          </button>
          {!showArchived && (
            <button
              onClick={() => navigate('/productos/nuevo')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
            >
              Nuevo producto
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setShowArchived(false)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            !showArchived
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Activos
        </button>
        <button
          onClick={() => setShowArchived(true)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            showArchived
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Archivados
        </button>
      </div>

      {showAllHistory && (
        <AllStockHistoryModal onClose={() => setShowAllHistory(false)} />
      )}

      {confirmTarget && (
        <ConfirmModal
          title={confirmTarget.active ? 'Archivar producto' : 'Desarchivar producto'}
          message={
            confirmTarget.active
              ? `¿Deseas archivar "${confirmTarget.name}"? No aparecerá en las listas activas.`
              : `¿Deseas desarchivar "${confirmTarget.name}"? Volverá a estar disponible.`
          }
          confirmLabel={confirmTarget.active ? 'Archivar' : 'Desarchivar'}
          danger={confirmTarget.active}
          onConfirm={handleArchiveToggle}
          onCancel={() => setConfirmTarget(null)}
          loading={actionLoading}
        />
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Categoria</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-right">P. Compra</th>
              <th className="px-4 py-3 text-right">P. Venta</th>
              <th className="px-4 py-3 text-center">IVA</th>
              <th className="px-4 py-3 text-center">Stock</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {renderRows()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
