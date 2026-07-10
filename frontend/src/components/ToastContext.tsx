import { createContext, useCallback, useContext, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  error:   'bg-red-600 text-white',
  info:    'bg-blue-600 text-white',
};

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '⚠',
  info:    'i',
};

export function ToastProvider({ children }: { readonly children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none w-80">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg text-sm pointer-events-auto ${STYLES[toast.type]}`}
          >
            <span className="shrink-0 font-bold mt-0.5">{ICONS[toast.type]}</span>
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity text-base leading-none mt-0.5"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx.showToast;
}
