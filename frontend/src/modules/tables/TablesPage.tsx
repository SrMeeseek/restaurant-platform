import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import { useToast } from '../../components/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';

// --- Types ---

interface Mesa {
  id: number;
  numero: string;
  capacidad: number;
  status: 'LIBRE' | 'OCUPADA' | 'RESERVADA';
  shape: 'CUADRADA' | 'REDONDA';
  posX: number;
  posY: number;
  active: boolean;
}

type TableStatus = Mesa['status'];

interface DragState {
  id: number;
  offsetX: number;
  offsetY: number;
}

// --- Constants ---

const CANVAS_W = 1400;
const CANVAS_H = 600;
const BLOCK_W = 110;
const BLOCK_H = 90;

// --- Helpers ---

function statusBg(status: TableStatus): string {
  if (status === 'LIBRE') return 'bg-green-500';
  if (status === 'OCUPADA') return 'bg-red-500';
  return 'bg-yellow-400';
}

function statusLabel(status: TableStatus): string {
  if (status === 'LIBRE') return 'Libre';
  if (status === 'OCUPADA') return 'Ocupada';
  return 'Reservada';
}

// --- MobileTableGrid ---

interface MobileTableGridProps {
  readonly mesas: Mesa[];
  readonly onStatusClick: (mesa: Mesa) => void;
}

function MobileTableGrid({ mesas, onStatusClick }: MobileTableGridProps) {
  if (mesas.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-12">No hay mesas activas.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {mesas.map((mesa) => (
        <button
          key={mesa.id}
          type="button"
          onClick={() => onStatusClick(mesa)}
          className={`${statusBg(mesa.status)} rounded-xl p-4 text-white text-left shadow-sm active:brightness-90 transition-all`}
        >
          <p className="font-bold text-base leading-tight line-clamp-2 break-words">{mesa.numero}</p>
          <p className="text-xs opacity-80 mt-1">{mesa.capacidad} pers.</p>
          <p className="text-xs font-semibold mt-2 uppercase tracking-wide opacity-90">{statusLabel(mesa.status)}</p>
        </button>
      ))}
    </div>
  );
}

// --- TableBlock ---

interface TableBlockProps {
  readonly mesa: Mesa;
  readonly posX: number;
  readonly posY: number;
  readonly scale: number;
  readonly editMode: boolean;
  readonly onDragStart: (e: React.MouseEvent, id: number) => void;
  readonly onStatusClick: (mesa: Mesa) => void;
  readonly onEdit: (mesa: Mesa) => void;
  readonly onArchive: (mesa: Mesa) => void;
}

function TableBlock({ mesa, posX, posY, scale, editMode, onDragStart, onStatusClick, onEdit, onArchive }: TableBlockProps) {
  const cursorClass = editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:brightness-110';
  const isRound = mesa.shape === 'REDONDA';
  const blockW = (isRound ? 100 : BLOCK_W) * scale;
  const blockH = (isRound ? 100 : BLOCK_H) * scale;
  const shapeClass = isRound ? 'rounded-full' : 'rounded-2xl';
  const btnSize = Math.round(20 * scale);
  const btnTop = Math.round(4 * scale);
  const btnRight = Math.round(4 * scale);

  return (
    <div
      style={{ left: posX * scale, top: posY * scale, width: blockW, height: blockH, position: 'absolute' }}
      role={!editMode ? 'button' : undefined}
      tabIndex={!editMode ? 0 : undefined}
      className={`${shapeClass} flex flex-col items-center justify-center text-white shadow-lg select-none transition-shadow overflow-hidden ${statusBg(mesa.status)} ${cursorClass}`}
      onMouseDown={editMode ? (e) => onDragStart(e, mesa.id) : undefined}
      onClick={!editMode ? () => onStatusClick(mesa) : undefined}
      onKeyDown={!editMode ? (e) => { if (e.key === 'Enter' || e.key === ' ') onStatusClick(mesa); } : undefined}
    >
      <span style={{ fontSize: `${0.875 * scale}rem` }} className="font-bold leading-tight line-clamp-2 w-full px-2 text-center break-words">{mesa.numero}</span>
      <span style={{ fontSize: `${0.75 * scale}rem` }} className="opacity-90 mt-0.5 shrink-0">{mesa.capacidad} pers.</span>
      {editMode && (
        <div style={{ position: 'absolute', top: btnTop, right: btnRight }} className="flex gap-1">
          <button
            type="button"
            style={{ width: btnSize, height: btnSize, fontSize: `${0.75 * scale}rem` }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(mesa); }}
            title="Editar"
            className="rounded bg-white/20 hover:bg-white/40 flex items-center justify-center"
          >
            ✎
          </button>
          <button
            type="button"
            style={{ width: btnSize, height: btnSize, fontSize: `${0.75 * scale}rem` }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onArchive(mesa); }}
            title="Archivar"
            className="rounded bg-white/20 hover:bg-red-600 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// --- TableStatusModal ---

interface StatusModalProps {
  readonly mesa: Mesa;
  readonly loading: boolean;
  readonly onConfirm: (status: TableStatus) => void;
  readonly onCancel: () => void;
}

const STATUS_OPTIONS: { value: TableStatus; label: string; color: string }[] = [
  { value: 'LIBRE', label: 'Libre', color: 'bg-green-500 hover:bg-green-600' },
  { value: 'OCUPADA', label: 'Ocupada', color: 'bg-red-500 hover:bg-red-600' },
  { value: 'RESERVADA', label: 'Reservada', color: 'bg-yellow-400 hover:bg-yellow-500' },
];

function TableStatusModal({ mesa, loading, onConfirm, onCancel }: StatusModalProps) {
  const [selected, setSelected] = useState<TableStatus>(mesa.status);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Mesa {mesa.numero}</h2>
          <p className="text-sm text-gray-500 mt-1">Selecciona el nuevo estado:</p>
        </div>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelected(opt.value)}
              className={`flex-1 py-2 rounded text-white text-sm font-medium transition-opacity ${opt.color} ${selected === opt.value ? 'ring-2 ring-offset-2 ring-gray-400' : 'opacity-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={loading || selected === mesa.status}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MesaFormModal ---

interface MesaFormModalProps {
  readonly initial: Mesa | null;
  readonly onSave: (data: { numero: string; capacidad: number; shape: Mesa['shape'] }) => Promise<void>;
  readonly onCancel: () => void;
}

function MesaFormModal({ initial, onSave, onCancel }: MesaFormModalProps) {
  const [numero, setNumero] = useState(initial?.numero ?? '');
  const [capacidad, setCapacidad] = useState(initial?.capacidad ?? 2);
  const [shape, setShape] = useState<Mesa['shape']>(initial?.shape ?? 'CUADRADA');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!numero.trim()) {
      setError('El número de mesa es requerido');
      return;
    }
    if (capacidad < 1) {
      setError('La capacidad debe ser al menos 1');
      return;
    }
    setSaving(true);
    try {
      await onSave({ numero: numero.trim(), capacidad, shape });
      onCancel();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(msg ?? 'Error al guardar');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          {initial ? 'Editar mesa' : 'Nueva mesa'}
        </h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="mesa-numero" className="block text-sm font-medium text-gray-700 mb-1">
              Número / nombre
            </label>
            <input
              id="mesa-numero"
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ej: 1, Terraza 3, VIP"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="mesa-capacidad" className="block text-sm font-medium text-gray-700 mb-1">
              Capacidad (personas)
            </label>
            <input
              id="mesa-capacidad"
              type="number"
              min={1}
              value={capacidad}
              onChange={(e) => setCapacidad(Number.parseInt(e.target.value, 10) || 1)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1">Forma</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShape('CUADRADA')}
                className={`flex-1 py-2 border rounded text-sm font-medium transition-colors ${shape === 'CUADRADA' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                ▪ Cuadrada
              </button>
              <button
                type="button"
                onClick={() => setShape('REDONDA')}
                className={`flex-1 py-2 border rounded text-sm font-medium transition-colors ${shape === 'REDONDA' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                ● Redonda
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- TablesHeader ---

interface TablesHeaderProps {
  readonly libre: number;
  readonly ocupada: number;
  readonly reservada: number;
  readonly isAdmin: boolean;
  readonly editMode: boolean;
  readonly savingPositions: boolean;
  readonly isMobileView: boolean;
  readonly onEnterEdit: () => void;
  readonly onAddMesa: () => void;
  readonly onSavePositions: () => void;
  readonly onCancelEdit: () => void;
  readonly onShowArchived: () => void;
}

function TablesHeader({ libre, ocupada, reservada, isAdmin, editMode, savingPositions, isMobileView, onEnterEdit, onAddMesa, onSavePositions, onCancelEdit, onShowArchived }: TablesHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Mesas</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {libre} libres · {ocupada} ocupadas · {reservada} reservadas
        </p>
      </div>
      {isAdmin && !editMode && !isMobileView && (
        <button
          type="button"
          onClick={onEnterEdit}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50"
        >
          Editar plano
        </button>
      )}
      {isAdmin && editMode && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAddMesa}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            + Agregar mesa
          </button>
          <button
            type="button"
            onClick={onShowArchived}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50"
          >
            Archivadas
          </button>
          <button
            type="button"
            onClick={onSavePositions}
            disabled={savingPositions}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          >
            {savingPositions ? 'Guardando...' : 'Guardar plano'}
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

// --- ArchivedMesasModal ---

interface ArchivedMesasModalProps {
  readonly mesas: Mesa[];
  readonly loading: boolean;
  readonly onRestore: (mesa: Mesa) => void;
  readonly onClose: () => void;
}

function ArchivedMesasModal({ mesas, loading, onRestore, onClose }: ArchivedMesasModalProps) {
  let content: React.ReactNode;
  if (loading) {
    content = <p className="text-sm text-gray-500 py-6 text-center">Cargando...</p>;
  } else if (mesas.length === 0) {
    content = <p className="text-sm text-gray-500 py-6 text-center">No hay mesas archivadas.</p>;
  } else {
    content = (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Mesa</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Capacidad</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mesas.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2 text-gray-700">{m.numero}</td>
                <td className="px-4 py-2 text-gray-500">{m.capacidad} personas</td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onRestore(m)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Restaurar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Mesas archivadas</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        {content}
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- TablesModals ---

interface TablesModalsProps {
  readonly pendingStatus: Mesa | null;
  readonly formTarget: Mesa | 'new' | null;
  readonly archiveTarget: Mesa | null;
  readonly unarchiveTarget: Mesa | null;
  readonly statusLoading: boolean;
  readonly archiveLoading: boolean;
  readonly unarchiveLoading: boolean;
  readonly onStatusConfirm: (status: TableStatus) => void;
  readonly onStatusCancel: () => void;
  readonly onFormSave: (data: { numero: string; capacidad: number; shape: Mesa['shape'] }) => Promise<void>;
  readonly onFormCancel: () => void;
  readonly onArchiveConfirm: () => void;
  readonly onArchiveCancel: () => void;
  readonly onUnarchiveConfirm: () => void;
  readonly onUnarchiveCancel: () => void;
}

function TablesModals({ pendingStatus, formTarget, archiveTarget, unarchiveTarget, statusLoading, archiveLoading, unarchiveLoading, onStatusConfirm, onStatusCancel, onFormSave, onFormCancel, onArchiveConfirm, onArchiveCancel, onUnarchiveConfirm, onUnarchiveCancel }: TablesModalsProps) {
  return (
    <>
      {pendingStatus && (
        <TableStatusModal
          mesa={pendingStatus}
          loading={statusLoading}
          onConfirm={onStatusConfirm}
          onCancel={onStatusCancel}
        />
      )}
      {formTarget !== null && (
        <MesaFormModal
          initial={formTarget === 'new' ? null : formTarget}
          onSave={onFormSave}
          onCancel={onFormCancel}
        />
      )}
      {archiveTarget && (
        <ConfirmModal
          title="Archivar mesa"
          message={`¿Archivar la mesa "${archiveTarget.numero}"? Desaparecerá del plano.`}
          confirmLabel="Archivar"
          danger
          loading={archiveLoading}
          onConfirm={onArchiveConfirm}
          onCancel={onArchiveCancel}
        />
      )}
      {unarchiveTarget && (
        <ConfirmModal
          title="Restaurar mesa"
          message={`¿Restaurar la mesa "${unarchiveTarget.numero}"? Volverá a aparecer en el plano.`}
          confirmLabel="Restaurar"
          loading={unarchiveLoading}
          onConfirm={onUnarchiveConfirm}
          onCancel={onUnarchiveCancel}
        />
      )}
    </>
  );
}

// --- TablesPage ---

export default function TablesPage() {
  const showToast = useToast();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draftPos, setDraftPos] = useState<Record<number, { x: number; y: number }>>({});
  const [pendingStatus, setPendingStatus] = useState<Mesa | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [formTarget, setFormTarget] = useState<Mesa | 'new' | null>(null);
  const [savingPositions, setSavingPositions] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Mesa | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archivedMesas, setArchivedMesas] = useState<Mesa[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [unarchiveTarget, setUnarchiveTarget] = useState<Mesa | null>(null);
  const [unarchiveLoading, setUnarchiveLoading] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<DragState | null>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  const [isMobileView, setIsMobileView] = useState(false);

  const isAdmin = (JSON.parse(localStorage.getItem('user') ?? '{}') as { role?: string }).role === 'ADMIN';

  useEffect(() => {
    void loadMesas();
  }, []);

  // Listeners de drag a nivel de documento para que funcione fuera del canvas
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const drag = draggingRef.current;
      if (!drag) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const s = scaleRef.current;
      const x = Math.min(Math.max(0, (e.clientX - rect.left) / s - drag.offsetX), CANVAS_W - BLOCK_W);
      const y = Math.min(Math.max(0, (e.clientY - rect.top) / s - drag.offsetY), CANVAS_H - BLOCK_H);
      setDraftPos((prev) => ({ ...prev, [drag.id]: { x, y } }));
    }

    function onMouseUp() {
      draggingRef.current = null;
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobileView(window.innerWidth < 1129);
      const el = containerRef.current;
      if (el) {
        const s = Math.min(el.clientWidth / CANVAS_W, 1);
        scaleRef.current = s;
        setScale(s);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function loadMesas() {
    try {
      const res = await api.get<Mesa[]>('/tables?active=true');
      setMesas(res.data);
    } catch {
      setLoadFailed(true);
      showToast('No se pudieron cargar las mesas', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleEnterEditMode() {
    const initial: Record<number, { x: number; y: number }> = {};
    mesas.forEach((m) => { initial[m.id] = { x: m.posX, y: m.posY }; });
    setDraftPos(initial);
    setEditMode(true);
  }

  function handleCancelEdit() {
    draggingRef.current = null;
    setDraftPos({});
    setEditMode(false);
  }

  function handleDragStart(e: React.MouseEvent, id: number) {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = draftPos[id] ?? { x: 0, y: 0 };
    const s = scaleRef.current;
    draggingRef.current = {
      id,
      offsetX: (e.clientX - rect.left) / s - pos.x,
      offsetY: (e.clientY - rect.top) / s - pos.y,
    };
  }

  async function handleSavePositions() {
    setSavingPositions(true);
    try {
      const positions = mesas.map((m) => ({
        id: m.id,
        posX: Math.round(draftPos[m.id]?.x ?? m.posX),
        posY: Math.round(draftPos[m.id]?.y ?? m.posY),
      }));
      await api.put('/tables/positions', { positions });
      setMesas((prev) =>
        prev.map((m) => ({
          ...m,
          posX: Math.round(draftPos[m.id]?.x ?? m.posX),
          posY: Math.round(draftPos[m.id]?.y ?? m.posY),
        }))
      );
      setDraftPos({});
      setEditMode(false);
      showToast('Plano guardado', 'success');
    } catch {
      showToast('Error al guardar posiciones', 'error');
    } finally {
      setSavingPositions(false);
    }
  }

  async function handleStatusConfirm(status: TableStatus) {
    if (!pendingStatus) return;
    setStatusLoading(true);
    try {
      await api.put(`/tables/${pendingStatus.id}/status`, { status });
      setMesas((prev) => prev.map((m) => m.id === pendingStatus.id ? { ...m, status } : m));
      showToast('Estado actualizado', 'success');
      setPendingStatus(null);
    } catch {
      showToast('Error al actualizar estado', 'error');
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleFormSave(data: { numero: string; capacidad: number; shape: Mesa['shape'] }) {
    const centerX = Math.round(CANVAS_W / 2 - BLOCK_W / 2);
    const centerY = Math.round(CANVAS_H / 2 - BLOCK_H / 2);
    if (formTarget === 'new') {
      const res = await api.post<Mesa>('/tables', { ...data, posX: centerX, posY: centerY });
      setMesas((prev) => [...prev, res.data]);
      setDraftPos((prev) => ({ ...prev, [res.data.id]: { x: res.data.posX, y: res.data.posY } }));
      showToast('Mesa creada', 'success');
      return;
    }
    if (formTarget === null) return;
    const res = await api.put<Mesa>(`/tables/${formTarget.id}`, data);
    setMesas((prev) => prev.map((m) => m.id === formTarget.id ? { ...m, ...res.data } : m));
    showToast('Mesa actualizada', 'success');
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiveLoading(true);
    try {
      await api.put(`/tables/${archiveTarget.id}/archive`);
      setMesas((prev) => prev.filter((m) => m.id !== archiveTarget.id));
      setDraftPos((prev) => {
        const next = { ...prev };
        delete next[archiveTarget.id];
        return next;
      });
      showToast('Mesa archivada', 'success');
      setArchiveTarget(null);
    } catch {
      showToast('Error al archivar mesa', 'error');
    } finally {
      setArchiveLoading(false);
    }
  }

  async function handleToggleArchived() {
    if (showArchived) {
      setShowArchived(false);
      return;
    }
    setShowArchived(true);
    setArchivedLoading(true);
    try {
      const res = await api.get<Mesa[]>('/tables?active=false');
      setArchivedMesas(res.data);
    } catch {
      showToast('Error al cargar mesas archivadas', 'error');
    } finally {
      setArchivedLoading(false);
    }
  }

  async function handleUnarchiveConfirm() {
    if (!unarchiveTarget) return;
    setUnarchiveLoading(true);
    try {
      const res = await api.put<Mesa>(`/tables/${unarchiveTarget.id}/unarchive`);
      setArchivedMesas((prev) => prev.filter((m) => m.id !== unarchiveTarget.id));
      setMesas((prev) => [...prev, res.data]);
      setDraftPos((prev) => ({ ...prev, [res.data.id]: { x: res.data.posX, y: res.data.posY } }));
      showToast('Mesa restaurada', 'success');
      setUnarchiveTarget(null);
    } catch {
      showToast('Error al restaurar mesa', 'error');
    } finally {
      setUnarchiveLoading(false);
    }
  }

  const libre = mesas.filter((m) => m.status === 'LIBRE').length;
  const ocupada = mesas.filter((m) => m.status === 'OCUPADA').length;
  const reservada = mesas.filter((m) => m.status === 'RESERVADA').length;

  if (loading) return <p className="text-gray-500 p-4">Cargando mesas...</p>;
  if (loadFailed) return <p className="text-red-500 p-4">No se pudieron cargar las mesas. Intenta recargar la página.</p>;

  return (
    <div className="space-y-4">
      <TablesHeader
        libre={libre}
        ocupada={ocupada}
        reservada={reservada}
        isAdmin={isAdmin}
        editMode={editMode}
        savingPositions={savingPositions}
        isMobileView={isMobileView}
        onEnterEdit={handleEnterEditMode}
        onAddMesa={() => setFormTarget('new')}
        onSavePositions={() => void handleSavePositions()}
        onCancelEdit={handleCancelEdit}
        onShowArchived={() => void handleToggleArchived()}
      />

      <div ref={containerRef} className="w-full">
        {isMobileView ? (
          <MobileTableGrid mesas={mesas} onStatusClick={setPendingStatus} />
        ) : (
          <>
            {editMode && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-2 rounded mb-4">
                Modo edición activo — arrastra las mesas para reposicionarlas. Los cambios no se guardan hasta hacer clic en "Guardar plano".
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden" style={{ width: CANVAS_W * scale }}>
              <div
                ref={canvasRef}
                style={{
                  width: CANVAS_W * scale,
                  height: CANVAS_H * scale,
                  position: 'relative',
                  backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                  backgroundSize: `${30 * scale}px ${30 * scale}px`,
                }}
              >
                {mesas.map((mesa) => {
                  const pos = editMode
                    ? (draftPos[mesa.id] ?? { x: mesa.posX, y: mesa.posY })
                    : { x: mesa.posX, y: mesa.posY };
                  return (
                    <TableBlock
                      key={mesa.id}
                      mesa={mesa}
                      posX={pos.x}
                      posY={pos.y}
                      scale={scale}
                      editMode={editMode}
                      onDragStart={handleDragStart}
                      onStatusClick={setPendingStatus}
                      onEdit={setFormTarget}
                      onArchive={setArchiveTarget}
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span>Libre</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span>Ocupada</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
          <span>Reservada</span>
        </span>
      </div>

      {showArchived && (
        <ArchivedMesasModal
          mesas={archivedMesas}
          loading={archivedLoading}
          onRestore={setUnarchiveTarget}
          onClose={() => setShowArchived(false)}
        />
      )}

      <TablesModals
        pendingStatus={pendingStatus}
        formTarget={formTarget}
        archiveTarget={archiveTarget}
        unarchiveTarget={unarchiveTarget}
        statusLoading={statusLoading}
        archiveLoading={archiveLoading}
        unarchiveLoading={unarchiveLoading}
        onStatusConfirm={(status) => void handleStatusConfirm(status)}
        onStatusCancel={() => setPendingStatus(null)}
        onFormSave={handleFormSave}
        onFormCancel={() => setFormTarget(null)}
        onArchiveConfirm={() => void handleArchiveConfirm()}
        onArchiveCancel={() => setArchiveTarget(null)}
        onUnarchiveConfirm={() => void handleUnarchiveConfirm()}
        onUnarchiveCancel={() => setUnarchiveTarget(null)}
      />
    </div>
  );
}
