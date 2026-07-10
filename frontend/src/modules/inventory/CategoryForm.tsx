import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useToast } from '../../components/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';

type Tipo = 'BIEN' | 'SERVICIO' | 'COMBO';

interface Category {
  id: number;
  name: string;
  tipo: Tipo;
}

interface Props {
  readonly initial: Category | null;
  readonly onSaved: () => void;
  readonly onCancel: () => void;
}

const TIPOS: { value: Tipo; label: string }[] = [
  { value: 'BIEN', label: 'Bien' },
  { value: 'SERVICIO', label: 'Servicio' },
  { value: 'COMBO', label: 'Combo' },
];

export default function CategoryForm({ initial, onSaved, onCancel }: Props) {
  const showToast = useToast();
  const [name, setName] = useState('');
  const [tipo, setTipo] = useState<Tipo>('BIEN');
  const [saving, setSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setTipo(initial.tipo);
    } else {
      setName('');
      setTipo('BIEN');
    }
  }, [initial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (initial) {
      setShowSaveConfirm(true);
    } else {
      void executeSave();
    }
  }

  async function executeSave() {
    setSaving(true);
    try {
      if (initial) {
        await api.put(`/categories/${initial.id}`, { name, tipo });
      } else {
        await api.post('/categories', { name, tipo });
      }
      showToast(initial ? 'Categoria actualizada' : 'Categoria creada', 'success');
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      showToast(msg ?? 'Error al guardar la categoria', 'error');
    } finally {
      setSaving(false);
      setShowSaveConfirm(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded shadow p-4 space-y-4 max-w-md">
      <h2 className="text-lg font-semibold text-gray-800">
        {initial ? 'Editar categoria' : 'Nueva categoria'}
      </h2>

      <div>
        <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          id="cat-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="cat-tipo" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
        <select
          id="cat-tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as Tipo)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 text-sm"
        >
          Cancelar
        </button>
      </div>

      {showSaveConfirm && (
        <ConfirmModal
          title="Guardar cambios"
          message={`¿Deseas guardar los cambios realizados en la categoria "${name}"?`}
          confirmLabel="Guardar"
          onConfirm={executeSave}
          onCancel={() => setShowSaveConfirm(false)}
          loading={saving}
        />
      )}
    </form>
  );
}
