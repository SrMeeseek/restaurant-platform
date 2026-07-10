import { useEffect, useRef, useState } from 'react';
import api from '../../lib/api';
import type { Category, Product } from './ProductsPage';
import { useToast } from '../../components/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Props {
  readonly initial: Product | null;
  readonly categories: Category[];
  readonly allProducts: Product[];
  readonly onSaved: () => void;
  readonly onCancel: () => void;
  readonly onStockChange?: () => void;
}

interface ComboItemInput {
  id: number;
  productId: number;
  quantity: number;
}

interface ComboSummaryRow {
  name: string;
  quantity: number;
  purchaseTotal: number | null;
  saleTotal: number;
}

// ─── Helpers puros ───────────────────────────────────────────────────────────

function buildComboSummary(items: ComboItemInput[], products: Product[]): ComboSummaryRow[] {
  return items
    .filter((ci) => ci.productId !== 0)
    .map((ci) => {
      const prod = products.find((p) => p.id === ci.productId);
      if (!prod) return null;
      const purchaseUnit = prod.purchasePrice ? Number.parseFloat(prod.purchasePrice) : null;
      return {
        name: prod.name,
        quantity: ci.quantity,
        purchaseTotal: purchaseUnit !== null ? purchaseUnit * ci.quantity : null,
        saleTotal: Number.parseFloat(prod.salePrice) * ci.quantity,
      };
    })
    .filter((r): r is ComboSummaryRow => r !== null);
}

function fmt(val: number): string {
  return `$${val.toLocaleString('es-CO')}`;
}

function tipoLabel(tipo: string): string {
  if (tipo === 'BIEN') return 'Bien';
  if (tipo === 'SERVICIO') return 'Servicio';
  return 'Combo';
}

function validateStock(mode: 'add' | 'correct', qty: string, note: string): string | null {
  const parsed = Number.parseInt(qty);
  if (!qty || Number.isNaN(parsed) || parsed < 0) return 'Ingresa una cantidad válida (mayor o igual a 0)';
  if (mode === 'add' && parsed === 0) return 'La cantidad a agregar debe ser mayor a 0';
  if (!note.trim()) return 'La nota es obligatoria';
  return null;
}

function stockConfirmMessage(mode: 'add' | 'correct', qty: string, current: number): string {
  const parsed = Number.parseInt(qty);
  if (mode === 'add') return `¿Confirmas agregar ${parsed} unidad(es) al stock? El nuevo total será ${current + parsed} uds.`;
  return `¿Confirmas corregir el stock a ${parsed} unidad(es)? Stock actual: ${current} uds.`;
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function ComboDiscountRow({ discount }: { readonly discount: number }) {
  const isDiscount = discount >= 0;
  return (
    <div className={`flex justify-between font-semibold ${isDiscount ? 'text-green-700' : 'text-red-600'}`}>
      <span>{isDiscount ? 'Descuento al cliente' : 'Sobrecargo vs. precio individual'}</span>
      <span>{fmt(Math.abs(discount))}</span>
    </div>
  );
}

interface ComboSectionProps {
  readonly comboItems: ComboItemInput[];
  readonly comboOptions: Product[];
  readonly summaryRows: ComboSummaryRow[];
  readonly comboTotal: number;
  readonly comboPurchaseTotal: number | null;
  readonly comboPrice: number | null;
  readonly comboDiscount: number | null;
  readonly onAdd: () => void;
  readonly onUpdate: (index: number, field: 'productId' | 'quantity', value: number) => void;
  readonly onRemove: (index: number) => void;
}

function ComboSection({ comboItems, comboOptions, summaryRows, comboTotal, comboPurchaseTotal, comboPrice, comboDiscount, onAdd, onUpdate, onRemove }: ComboSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Componentes del combo</span>
        <button type="button" onClick={onAdd} className="text-blue-600 text-xs hover:underline">
          + Agregar componente
        </button>
      </div>

      {comboItems.length === 0 && (
        <p className="text-xs text-gray-400">No hay componentes. Agrega al menos uno.</p>
      )}

      <div className="space-y-2">
        {comboItems.map((ci, i) => (
          <div key={ci.id} className="flex items-center gap-2">
            <select
              value={ci.productId || ''}
              onChange={(e) => onUpdate(i, 'productId', Number.parseInt(e.target.value))}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar producto...</option>
              {comboOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.category.name})</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={ci.quantity}
              onChange={(e) => onUpdate(i, 'quantity', Number.parseInt(e.target.value))}
              className="w-20 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button type="button" onClick={() => onRemove(i)} className="text-red-500 text-xs hover:underline">
              Quitar
            </button>
          </div>
        ))}
      </div>

      {summaryRows.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Resumen de costos</p>

          <div className="w-full text-xs">
            <div className="grid grid-cols-4 gap-2 text-gray-500 font-medium pb-1 border-b border-blue-200">
              <span className="col-span-2">Producto</span>
              <span className="text-right">P. Compra</span>
              <span className="text-right">P. Venta</span>
            </div>

            <div className="divide-y divide-blue-100">
              {summaryRows.map((row) => (
                <div key={row.name} className="grid grid-cols-4 gap-2 py-1.5 text-gray-700">
                  <span className="col-span-2 truncate">
                    {row.name} <span className="text-gray-400">×{row.quantity}</span>
                  </span>
                  <span className="text-right text-gray-500">
                    {row.purchaseTotal !== null ? fmt(row.purchaseTotal) : '—'}
                  </span>
                  <span className="text-right">{fmt(row.saleTotal)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-blue-200 font-semibold text-gray-800">
              <span className="col-span-2">Total componentes</span>
              <span className="text-right text-gray-600">
                {comboPurchaseTotal !== null ? fmt(comboPurchaseTotal) : '—'}
              </span>
              <span className="text-right">{fmt(comboTotal)}</span>
            </div>
          </div>

          {comboPrice !== null && (
            <div className="border-t border-blue-200 pt-3 space-y-1 text-xs">
              <div className="flex justify-between text-gray-700">
                <span>Precio del combo (al público)</span>
                <span className="font-semibold">{fmt(comboPrice)}</span>
              </div>
              {comboDiscount !== null && <ComboDiscountRow discount={comboDiscount} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type StockView = 'buttons' | 'add' | 'correct';

interface StockSectionProps {
  readonly currentStock: number;
  readonly stockView: StockView;
  readonly stockQty: string;
  readonly stockNote: string;
  readonly stockSaving: boolean;
  readonly onSetView: (view: StockView) => void;
  readonly onQtyChange: (v: string) => void;
  readonly onNoteChange: (v: string) => void;
  readonly onAction: (mode: 'add' | 'correct') => void;
}

function StockSection({ currentStock, stockView, stockQty, stockNote, stockSaving, onSetView, onQtyChange, onNoteChange, onAction }: StockSectionProps) {
  const isAdd = stockView === 'add';
  let btnLabel = isAdd ? 'Agregar' : 'Corregir';
  if (stockSaving) btnLabel = 'Aplicando...';

  return (
    <div className="border-t pt-5 space-y-3">
      <p className="text-sm font-semibold text-gray-700">
        Stock actual: <span className="text-blue-600 text-base font-bold">{currentStock}</span>
      </p>

      {stockView === 'buttons' && (
        <div className="flex gap-2">
          <button type="button" onClick={() => onSetView('add')}
            className="px-4 py-2 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
            Agregar
          </button>
          <button type="button" onClick={() => onSetView('correct')}
            className="px-4 py-2 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
            Corregir inventario
          </button>
        </div>
      )}

      {(stockView === 'add' || stockView === 'correct') && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              {isAdd ? 'Agregar stock' : 'Corregir inventario'}
            </p>
            <button type="button" onClick={() => { onSetView('buttons'); onQtyChange(''); onNoteChange(''); }}
              className="text-xs text-gray-400 hover:text-gray-600">
              Cancelar
            </button>
          </div>

          <p className={`text-xs ${isAdd ? 'text-gray-500' : 'text-orange-600'}`}>
            {isAdd
              ? 'Registra una compra o entrada de mercancia. Se suma al stock actual.'
              : 'Corrección por conteo fisico. Ingresa la cantidad real que hay en inventario — el sistema calcula la diferencia.'}
          </p>

          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label htmlFor="stock-qty" className="block text-xs text-gray-600 mb-1">
                {isAdd ? 'Cantidad a agregar' : 'Cantidad real en inventario'}
              </label>
              <input id="stock-qty" type="number" min="0" value={stockQty}
                onChange={(e) => onQtyChange(e.target.value)}
                placeholder={isAdd ? 'ej. 10' : 'ej. 5'}
                className="w-28 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-40">
              <label htmlFor="stock-note" className="block text-xs text-gray-600 mb-1">Nota (obligatoria)</label>
              <input id="stock-note" type="text" value={stockNote}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder={isAdd ? 'ej. Compra proveedor X' : 'ej. Conteo fisico julio 2026'}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="button" onClick={() => onAction(stockView as 'add' | 'correct')} disabled={stockSaving}
              className={`px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-50 ${isAdd ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
              {btnLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ProductForm({ initial, categories, allProducts, onSaved, onCancel, onStockChange }: Props) {
  const showToast = useToast();
  const comboIdRef = useRef(0);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [hasIva, setHasIva] = useState(false);
  const [ivaPercentage, setIvaPercentage] = useState('');
  const [registerStock, setRegisterStock] = useState(false);
  const [initialStock, setInitialStock] = useState('');
  const [comboItems, setComboItems] = useState<ComboItemInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const [currentStock, setCurrentStock] = useState(0);
  const [stockView, setStockView] = useState<StockView>('buttons');
  const [stockQty, setStockQty] = useState('');
  const [stockNote, setStockNote] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [pendingStockMode, setPendingStockMode] = useState<'add' | 'correct' | null>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const tipo = selectedCategory?.tipo;

  const summaryRows = buildComboSummary(comboItems, allProducts);
  const comboTotal = summaryRows.reduce((acc, r) => acc + r.saleTotal, 0);
  const comboPurchaseTotal =
    summaryRows.length > 0 && summaryRows.every((r) => r.purchaseTotal !== null)
      ? summaryRows.reduce((acc, r) => acc + (r.purchaseTotal ?? 0), 0)
      : null;
  const comboPrice =
    salePrice && !Number.isNaN(Number.parseFloat(salePrice)) ? Number.parseFloat(salePrice) : null;
  const comboDiscount = comboPrice !== null && comboTotal > 0 ? comboTotal - comboPrice : null;
  const comboOptions = allProducts.filter((p) => p.category.tipo !== 'COMBO' && p.active && p.id !== initial?.id);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setCategoryId(initial.categoryId);
      setPurchasePrice(initial.purchasePrice ?? '');
      setSalePrice(initial.salePrice);
      setHasIva(initial.hasIva);
      setIvaPercentage(initial.ivaPercentage ?? '');
      setRegisterStock(false);
      setInitialStock('');
      setComboItems(initial.comboItems.map((ci, idx) => ({ id: idx + 1, productId: ci.productId, quantity: ci.quantity })));
      comboIdRef.current = initial.comboItems.length;
      if (initial.category.tipo === 'BIEN') setCurrentStock(initial.stock ?? 0);
    } else {
      setName(''); setCategoryId(''); setPurchasePrice(''); setSalePrice('');
      setHasIva(false); setIvaPercentage(''); setRegisterStock(false);
      setInitialStock(''); setComboItems([]); comboIdRef.current = 0; setCurrentStock(0);
    }
    setStockQty(''); setStockNote(''); setStockView('buttons');
  }, [initial]);

  useEffect(() => {
    if (tipo === 'COMBO') { setHasIva(false); setIvaPercentage(''); }
    if (tipo !== 'BIEN') { setRegisterStock(false); setInitialStock(''); }
  }, [tipo]);

  function addComboItem() {
    comboIdRef.current += 1;
    setComboItems((prev) => [...prev, { id: comboIdRef.current, productId: 0, quantity: 1 }]);
  }

  function updateComboItem(index: number, field: 'productId' | 'quantity', value: number) {
    setComboItems((prev) => prev.map((ci, i) => (i === index ? { ...ci, [field]: value } : ci)));
  }

  function removeComboItem(index: number) {
    setComboItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleStockClick(mode: 'add' | 'correct') {
    const error = validateStock(mode, stockQty, stockNote);
    if (error) { showToast(error, 'error'); return; }
    setPendingStockMode(mode);
  }

  async function executeStockMovement() {
    if (!pendingStockMode) return;
    const mode = pendingStockMode;
    const qty = Number.parseInt(stockQty);
    setStockSaving(true);
    try {
      const res = await api.put<{ stock: number }>(`/products/${initial!.id}/stock`, { mode, quantity: qty, note: stockNote.trim() });
      setCurrentStock(res.data.stock ?? (mode === 'add' ? currentStock + qty : qty));
      setStockQty(''); setStockNote(''); setStockView('buttons');
      showToast('Stock modificado exitosamente', 'success');
      onStockChange?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      showToast(msg ?? 'Error al actualizar stock', 'error');
    } finally {
      setStockSaving(false); setPendingStockMode(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (categoryId === '') { showToast('La categoria es requerida', 'error'); return; }
    if (initial) { setShowSaveConfirm(true); } else { void executeSave(); }
  }

  async function executeSave() {
    const payload: Record<string, unknown> = {
      name, categoryId,
      purchasePrice: purchasePrice !== '' ? Number.parseFloat(purchasePrice) : null,
      salePrice: Number.parseFloat(salePrice),
      hasIva,
      ivaPercentage: hasIva && ivaPercentage !== '' ? Number.parseFloat(ivaPercentage) : null,
    };
    if (tipo === 'BIEN' && !initial && registerStock && initialStock !== '') payload.initialStock = Number.parseInt(initialStock);
    if (tipo === 'COMBO') payload.comboItems = comboItems.map(({ productId, quantity }) => ({ productId, quantity }));
    setSaving(true);
    try {
      if (initial) { await api.put(`/products/${initial.id}`, payload); } else { await api.post('/products', payload); }
      showToast(initial ? 'Producto actualizado correctamente' : 'Producto creado correctamente', 'success');
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      showToast(msg ?? 'Error al guardar el producto', 'error');
    } finally {
      setSaving(false); setShowSaveConfirm(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded shadow p-6 space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">
        {initial ? 'Editar producto' : 'Nuevo producto'}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="prod-name" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input id="prod-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>

        <div>
          <label htmlFor="prod-category" className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select id="prod-category" value={categoryId}
            onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number.parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            <option value="">Seleccionar...</option>
            {categories.filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({tipoLabel(c.tipo)})</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="prod-purchase" className="block text-sm font-medium text-gray-700 mb-1">
            Precio de compra {tipo === 'COMBO' ? '(no aplica)' : '(opcional)'}
          </label>
          <input id="prod-purchase" type="number" min="0" step="0.01" value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)} disabled={tipo === 'COMBO'}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
        </div>

        <div>
          <label htmlFor="prod-sale" className="block text-sm font-medium text-gray-700 mb-1">Precio de venta</label>
          <input id="prod-sale" type="number" min="0" step="0.01" value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
      </div>

      {tipo !== 'COMBO' && (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={hasIva} className="w-4 h-4"
              onChange={(e) => { setHasIva(e.target.checked); if (!e.target.checked) setIvaPercentage(''); }} />
            <span>Aplica IVA</span>
          </label>
          {hasIva && (
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="100" step="0.01" value={ivaPercentage} placeholder="% IVA"
                onChange={(e) => setIvaPercentage(e.target.value)} required={hasIva}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-sm text-gray-500">%</span>
            </div>
          )}
        </div>
      )}

      {tipo === 'BIEN' && !initial && (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={registerStock} className="w-4 h-4"
              onChange={(e) => { setRegisterStock(e.target.checked); if (!e.target.checked) setInitialStock(''); }} />
            <span>Registrar stock inicial</span>
          </label>
          {registerStock && (
            <input type="number" min="1" value={initialStock} placeholder="Cantidad" required
              onChange={(e) => setInitialStock(e.target.value)}
              className="w-32 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          )}
        </div>
      )}

      {tipo === 'COMBO' && (
        <ComboSection
          comboItems={comboItems}
          comboOptions={comboOptions}
          summaryRows={summaryRows}
          comboTotal={comboTotal}
          comboPurchaseTotal={comboPurchaseTotal}
          comboPrice={comboPrice}
          comboDiscount={comboDiscount}
          onAdd={addComboItem}
          onUpdate={updateComboItem}
          onRemove={removeComboItem}
        />
      )}

      {tipo === 'BIEN' && initial && (
        <StockSection
          currentStock={currentStock}
          stockView={stockView}
          stockQty={stockQty}
          stockNote={stockNote}
          stockSaving={stockSaving}
          onSetView={(view) => { setStockView(view); setStockQty(''); }}
          onQtyChange={setStockQty}
          onNoteChange={setStockNote}
          onAction={handleStockClick}
        />
      )}

      <div className="flex gap-2 pt-2 border-t">
        <button type="submit" disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 text-sm">
          Cancelar
        </button>
      </div>

      {showSaveConfirm && (
        <ConfirmModal
          title="Guardar cambios"
          message={`¿Deseas guardar los cambios realizados en "${name}"?`}
          confirmLabel="Guardar"
          onConfirm={executeSave}
          onCancel={() => setShowSaveConfirm(false)}
          loading={saving}
        />
      )}

      {pendingStockMode && (
        <ConfirmModal
          title={pendingStockMode === 'add' ? 'Confirmar entrada de stock' : 'Confirmar corrección de inventario'}
          message={stockConfirmMessage(pendingStockMode, stockQty, currentStock)}
          confirmLabel={pendingStockMode === 'add' ? 'Agregar' : 'Corregir'}
          danger={pendingStockMode === 'correct'}
          onConfirm={executeStockMovement}
          onCancel={() => setPendingStockMode(null)}
          loading={stockSaving}
        />
      )}
    </form>
  );
}
