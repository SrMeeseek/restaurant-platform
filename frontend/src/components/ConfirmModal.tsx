interface Props {
  readonly title: string;
  readonly message: string;
  readonly onConfirm: () => void | Promise<void>;
  readonly onCancel: () => void;
  readonly confirmLabel?: string;
  readonly danger?: boolean;
  readonly loading?: boolean;
}

export default function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  danger = false,
  loading = false,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{message}</p>
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
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-50 ${
              danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
