import { useEffect, useState } from 'react';
import api from '../../lib/api';
import CategoryForm from './CategoryForm';
import { useToast } from '../../components/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';

interface Category {
  id: number;
  name: string;
  tipo: 'BIEN' | 'SERVICIO' | 'COMBO';
  active: boolean;
  _count: { products: number };
}

const TIPO_LABEL: Record<string, string> = {
  BIEN: 'Bien',
  SERVICIO: 'Servicio',
  COMBO: 'Combo',
};

export default function CategoriesPage() {
  const showToast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Category | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function load(archived: boolean) {
    setLoading(true);
    try {
      const res = await api.get<Category[]>(`/categories?active=${!archived}`);
      setCategories(res.data);
    } catch {
      showToast('Error al cargar las categorias', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(showArchived); }, [showArchived]);

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setShowForm(true);
  }

  async function handleArchiveToggle() {
    if (!confirmTarget) return;
    setActionLoading(true);
    try {
      const endpoint = confirmTarget.active
        ? `/categories/${confirmTarget.id}/archive`
        : `/categories/${confirmTarget.id}/unarchive`;
      await api.put(endpoint);
      showToast(confirmTarget.active ? 'Categoria archivada' : 'Categoria desarchivada', 'success');
      await load(showArchived);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      showToast(msg ?? 'Error al cambiar estado de la categoria', 'error');
    } finally {
      setActionLoading(false);
      setConfirmTarget(null);
    }
  }

  function handleSaved() {
    setShowForm(false);
    load(showArchived);
  }

  function renderRows() {
    if (loading) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-6 text-center text-gray-400">Cargando...</td>
        </tr>
      );
    }
    if (categories.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
            {showArchived ? 'No hay categorias archivadas' : 'No hay categorias registradas'}
          </td>
        </tr>
      );
    }
    return categories.map((cat) => (
      <tr key={cat.id}>
        <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
        <td className="px-4 py-3 text-gray-600">{TIPO_LABEL[cat.tipo]}</td>
        <td className="px-4 py-3 text-center text-gray-600">{cat._count.products}</td>
        <td className="px-4 py-3 text-center space-x-2">
          {!showArchived && (
            <button
              onClick={() => openEdit(cat)}
              className="text-blue-600 hover:underline text-xs"
            >
              Editar
            </button>
          )}
          <button
            onClick={() => setConfirmTarget(cat)}
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
        <h1 className="text-2xl font-bold text-gray-800">Categorias</h1>
        {!showArchived && (
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Nueva categoria
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => { setShowArchived(false); setShowForm(false); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            !showArchived
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Activas
        </button>
        <button
          onClick={() => { setShowArchived(true); setShowForm(false); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            showArchived
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Archivadas
        </button>
      </div>

      {showForm && !showArchived && (
        <div className="mb-6">
          <CategoryForm
            initial={editing}
            onSaved={handleSaved}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {confirmTarget && (
        <ConfirmModal
          title={confirmTarget.active ? 'Archivar categoria' : 'Desarchivar categoria'}
          message={
            confirmTarget.active
              ? `¿Deseas archivar "${confirmTarget.name}"? No estará disponible al crear productos.`
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
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-center">Productos</th>
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
