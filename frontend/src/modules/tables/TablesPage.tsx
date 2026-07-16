import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Group, Text } from 'react-konva';
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

// --- Constants ---

const CANVAS_W = 1400;
const CANVAS_H = 600;
const BLOCK_W = 110;
const BLOCK_H = 90;
const ROUND_D = 100;
const MIN_SCALE = 0.7;
const MIN_CANVAS_W = Math.floor(CANVAS_W * MIN_SCALE);

// --- Helpers ---

function statusBg(status: TableStatus): string {
  if (status === 'LIBRE') return 'bg-green-500 hover:bg-green-600';
  if (status === 'OCUPADA') return 'bg-red-500 hover:bg-red-600';
  return 'bg-yellow-400 hover:bg-yellow-500';
}

function statusFill(status: TableStatus): string {
  if (status === 'LIBRE') return '#22c55e';
  if (status === 'OCUPADA') return '#ef4444';
  return '#facc15';
}

function statusHoverFill(status: TableStatus): string {
  if (status === 'LIBRE') return '#16a34a';
  if (status === 'OCUPADA') return '#dc2626';
  return '#eab308';
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
          className={`${statusBg(mesa.status)} rounded-xl p-4 text-white text-left active:brightness-90 transition-colors`}
        >
          <p className="font-bold text-base leading-tight line-clamp-2 break-words">{mesa.numero}</p>
          <p className="text-xs opacity-80 mt-1">{mesa.capacidad} pers.</p>
          <p className="text-xs font-semibold mt-2 uppercase tracking-wide opacity-90">{statusLabel(mesa.status)}</p>
        </button>
      ))}
    </div>
  );
}

// --- TableShape ---

function setCursor(e: { target: { getStage: () => { container: () => HTMLElement } | null } }, cursor: string) {
  const container = e.target.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

interface TableShapeProps {
  readonly mesa: Mesa;
  readonly posX: number;
  readonly posY: number;
  readonly scale: number;
  readonly containerHeight: number;
  readonly editMode: boolean;
  readonly onDragEnd: (id: number, x: number, y: number) => void;
  readonly onStatusClick: (mesa: Mesa) => void;
  readonly onEdit: (mesa: Mesa) => void;
  readonly onArchive: (mesa: Mesa) => void;
}

function TableShape({ mesa, posX, posY, scale, containerHeight, editMode, onDragEnd, onStatusClick, onEdit, onArchive }: TableShapeProps) {
  const isRound = mesa.shape === 'REDONDA';
  const w = isRound ? ROUND_D : BLOCK_W;
  const h = isRound ? ROUND_D : BLOCK_H;
  const [hovered, setHovered] = useState(false);
  const shapeFill = hovered ? statusHoverFill(mesa.status) : statusFill(mesa.status);

  return (
    <Group
      x={posX}
      y={posY}
      draggable={editMode}
      dragBoundFunc={editMode ? (pos) => ({
        x: Math.min(Math.max(0, pos.x), (CANVAS_W - w) * scale),
        y: Math.min(Math.max(64, pos.y), containerHeight - h * scale - 8),
      }) : undefined}
      onDragEnd={editMode ? (e) => onDragEnd(mesa.id, e.target.x(), e.target.y()) : undefined}
      onDragStart={(e) => { setHovered(false); setCursor(e, 'grabbing'); }}
      onMouseEnter={(e) => { setHovered(true); setCursor(e, editMode ? 'grab' : 'pointer'); }}
      onMouseLeave={(e) => { setHovered(false); setCursor(e, 'default'); }}
      onClick={!editMode ? () => onStatusClick(mesa) : undefined}
      onTap={!editMode ? () => onStatusClick(mesa) : undefined}
    >
      {isRound ? (
        <Circle
          x={ROUND_D / 2}
          y={ROUND_D / 2}
          radius={ROUND_D / 2}
          fill={shapeFill}
        />
      ) : (
        <Rect
          width={w}
          height={h}
          cornerRadius={12}
          fill={shapeFill}
        />
      )}

      <Text
        text={mesa.numero}
        x={0}
        y={isRound ? 18 : 10}
        width={w}
        height={isRound ? 34 : 42}
        align="center"
        verticalAlign="middle"
        fill="white"
        fontStyle="bold"
        fontSize={16}
        ellipsis
        wrap="word"
        listening={false}
      />

      <Text
        text={`${mesa.capacidad} pers.`}
        x={0}
        y={isRound ? 55 : 54}
        width={w}
        height={20}
        align="center"
        verticalAlign="middle"
        fill="rgba(255,255,255,0.75)"
        fontSize={11}
        listening={false}
      />

      {editMode && (
        <>
          <Group
            x={w - 46}
            y={4}
            onClick={(e) => { e.cancelBubble = true; onEdit(mesa); }}
            onTap={(e) => { e.cancelBubble = true; onEdit(mesa); }}
          >
            <Rect width={20} height={20} cornerRadius={3} fill="rgba(0,0,0,0.15)" />
            <Text text="✎" width={20} height={20} align="center" verticalAlign="middle" fill="white" fontSize={12} listening={false} />
          </Group>
          <Group
            x={w - 24}
            y={4}
            onClick={(e) => { e.cancelBubble = true; onArchive(mesa); }}
            onTap={(e) => { e.cancelBubble = true; onArchive(mesa); }}
          >
            <Rect width={20} height={20} cornerRadius={3} fill="rgba(0,0,0,0.15)" />
            <Text text="✕" width={20} height={20} align="center" verticalAlign="middle" fill="white" fontSize={12} listening={false} />
          </Group>
        </>
      )}
    </Group>
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
    if (!numero.trim()) { setError('El número de mesa es requerido'); return; }
    if (capacidad < 1) { setError('La capacidad debe ser al menos 1'); return; }
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
            <label htmlFor="mesa-numero" className="block text-sm font-medium text-gray-700 mb-1">Número / nombre</label>
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
            <label htmlFor="mesa-capacidad" className="block text-sm font-medium text-gray-700 mb-1">Capacidad (personas)</label>
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
            <button type="button" onClick={onCancel} disabled={saving} className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- TablesHeader ---

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
                  <button type="button" onClick={() => onRestore(m)} className="text-sm text-blue-600 hover:underline">
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
        <TableStatusModal mesa={pendingStatus} loading={statusLoading} onConfirm={onStatusConfirm} onCancel={onStatusCancel} />
      )}
      {formTarget !== null && (
        <MesaFormModal initial={formTarget === 'new' ? null : formTarget} onSave={onFormSave} onCancel={onFormCancel} />
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isMobileView, setIsMobileView] = useState(false);

  const scale = containerWidth > 0 ? Math.max(Math.min(containerWidth / CANVAS_W, 1.4), MIN_SCALE) : MIN_SCALE;
  const stageWidth = Math.max(containerWidth, MIN_CANVAS_W);

  const isAdmin = (JSON.parse(localStorage.getItem('user') ?? '{}') as { role?: string }).role === 'ADMIN';

  const loadMesas = useCallback(async () => {
    try {
      const res = await api.get<Mesa[]>('/tables?active=true');
      setMesas(res.data);
    } catch {
      setLoadFailed(true);
      showToast('No se pudieron cargar las mesas', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadMesas();
  }, [loadMesas]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    setIsMobileView(window.innerWidth < 1129);
    setContainerWidth(Math.floor(rect.width));
    setContainerHeight(Math.floor(rect.height));

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setIsMobileView(window.innerWidth < 1129);
      setContainerWidth(Math.floor(width));
      setContainerHeight(Math.floor(height));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [loading]);

  function handleEnterEditMode() {
    const initial: Record<number, { x: number; y: number }> = {};
    mesas.forEach((m) => { initial[m.id] = { x: m.posX, y: m.posY }; });
    setDraftPos(initial);
    setEditMode(true);
  }

  function handleCancelEdit() {
    setDraftPos({});
    setEditMode(false);
  }

  function handleDragEnd(id: number, x: number, y: number) {
    setDraftPos((prev) => ({ ...prev, [id]: { x: Math.round(x), y: Math.round(y) } }));
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
    if (showArchived) { setShowArchived(false); return; }
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

  const canvasBg: React.CSSProperties = {
    backgroundColor: '#f3f4f6',
    backgroundImage: 'radial-gradient(circle, #d1d5db 1.5px, transparent 1.5px)',
    backgroundSize: `${30 * scale}px ${30 * scale}px`,
  };
  const canvasClass = `-m-6 relative ${
    isMobileView
      ? 'min-h-[calc(100%+3rem)]'
      : 'h-[calc(100%+3rem)] overflow-x-auto overflow-y-hidden'
  }`;

  if (loading) return (
    <div className="-m-6 h-[calc(100%+3rem)] flex items-center justify-center" style={canvasBg}>
      <p className="text-gray-500">Cargando mesas...</p>
    </div>
  );
  if (loadFailed) return (
    <div className="-m-6 h-[calc(100%+3rem)] flex items-center justify-center" style={canvasBg}>
      <p className="text-red-400">No se pudieron cargar las mesas. Intenta recargar la página.</p>
    </div>
  );

  return (
    <>
      {/* Canvas full-page: -m-6 cancela el p-6 del Layout, h-[calc(100%+3rem)] llena el main completo */}
      <div
        ref={containerRef}
        className={canvasClass}
        style={isMobileView ? { backgroundColor: '#ffffff' } : canvasBg}
      >
        {/* Konva Stage — desktop */}
        {!isMobileView && containerWidth > 0 && containerHeight > 0 && (
          <Stage width={stageWidth} height={containerHeight} scaleX={scale} scaleY={scale}>
            <Layer>
              {mesas.map((mesa) => {
                const pos = editMode
                  ? (draftPos[mesa.id] ?? { x: mesa.posX, y: mesa.posY })
                  : { x: mesa.posX, y: mesa.posY };
                return (
                  <TableShape
                    key={mesa.id}
                    mesa={mesa}
                    posX={pos.x}
                    posY={pos.y}
                    scale={scale}
                    containerHeight={containerHeight}
                    editMode={editMode}
                    onDragEnd={handleDragEnd}
                    onStatusClick={setPendingStatus}
                    onEdit={setFormTarget}
                    onArchive={setArchiveTarget}
                  />
                );
              })}
            </Layer>
          </Stage>
        )}

        {/* Mobile grid */}
        {isMobileView && (
          <div className="pt-20 px-4 pb-4">
            <MobileTableGrid mesas={mesas} onStatusClick={setPendingStatus} />
          </div>
        )}

        {/* Header overlay */}
        <div
          className={`${isMobileView ? 'fixed' : 'absolute top-0 left-0 right-0'} z-10 flex items-center justify-between px-6 h-16`}
          style={{
            ...(isMobileView ? { top: 0, left: '14rem', right: 0 } : {}),
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderBottom: '1px solid #e5e7eb',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div>
            <h1 className="text-lg font-bold text-gray-800">Mesas</h1>
            <p className="text-xs text-gray-500">
              {libre} libres · {ocupada} ocupadas · {reservada} reservadas
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => setFormTarget('new')}
                    className="px-3 py-1.5 text-sm rounded font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    + Agregar mesa
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleArchived()}
                    className="px-3 py-1.5 text-sm rounded font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Archivadas
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSavePositions()}
                    disabled={savingPositions}
                    className="px-3 py-1.5 text-sm rounded font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
                  >
                    {savingPositions ? 'Guardando...' : 'Guardar plano'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-sm rounded font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={isMobileView ? () => showToast('El editor de plano solo está disponible en la versión de escritorio', 'error') : handleEnterEditMode}
                  className="px-3 py-1.5 text-sm rounded font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Editar plano
                </button>
              )}
            </div>
          )}
        </div>

        {/* Banner modo edición */}
        {editMode && (
          <div
            className="absolute left-0 right-0 z-10 text-sm px-6 py-2"
            style={{ top: '64px', backgroundColor: '#fef9c3', borderBottom: '1px solid #fde047', color: '#854d0e' }}
          >
            Modo edición activo — arrastra las mesas para reposicionarlas. Los cambios no se guardan hasta hacer clic en "Guardar plano".
          </div>
        )}

        {/* Leyenda — esquina inferior izquierda, solo en desktop */}
        {!isMobileView && (
          <div className="absolute bottom-4 left-6 z-10 flex gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />{"Libre"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />{"Ocupada"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />{"Reservada"}
            </span>
          </div>
        )}
      </div>

      {/* Modales — fuera del canvas, posición fixed propia */}
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
    </>
  );
}
