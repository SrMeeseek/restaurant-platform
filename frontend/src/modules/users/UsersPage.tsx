import { useState, useEffect } from 'react';
import api from '../../lib/api';
import UserForm from './UserForm';
import { useToast } from '../../components/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'WAITER';
  active: boolean;
  createdAt: string;
}

type PendingAction = { user: User; type: 'activate' | 'deactivate' };

export default function UsersPage() {
  const showToast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const sessionUserId = (JSON.parse(localStorage.getItem('user') ?? '{}') as { id?: number }).id;

  async function loadUsers() {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {
      showToast('Error al cargar los usuarios', 'error');
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleConfirm() {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await api.delete(`/users/${pendingAction.user.id}`);
        showToast('Usuario desactivado', 'success');
      } else {
        await api.put(`/users/${pendingAction.user.id}/activate`);
        showToast('Usuario activado', 'success');
      }
      loadUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showToast(msg ?? 'Error al cambiar estado del usuario', 'error');
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  }

  function handleEdit(user: User) {
    setEditing(user);
    setShowForm(true);
  }

  function handleClose() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Usuarios</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          Nuevo usuario
        </button>
      </div>

      {showForm && (
        <UserForm
          user={editing}
          onSaved={() => { loadUsers(); handleClose(); }}
          onCancel={handleClose}
        />
      )}

      {pendingAction && (
        <ConfirmModal
          title={pendingAction.type === 'deactivate' ? 'Desactivar usuario' : 'Activar usuario'}
          message={
            pendingAction.type === 'deactivate'
              ? `¿Deseas desactivar a ${pendingAction.user.firstName} ${pendingAction.user.lastName}? No podrá iniciar sesión.`
              : `¿Deseas activar a ${pendingAction.user.firstName} ${pendingAction.user.lastName}?`
          }
          confirmLabel={pendingAction.type === 'deactivate' ? 'Desactivar' : 'Activar'}
          danger={pendingAction.type === 'deactivate'}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
          loading={actionLoading}
        />
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className={`border-b last:border-0 ${user.active ? 'hover:bg-gray-50' : 'bg-gray-50 opacity-60'}`}
              >
                <td className="px-4 py-3">{user.firstName} {user.lastName}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {user.role === 'ADMIN' ? 'Administrador' : 'Mesero'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    user.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  {user.active && (
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Editar
                    </button>
                  )}
                  {user.active && user.id !== sessionUserId && (
                    <button
                      onClick={() => setPendingAction({ user, type: 'deactivate' })}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Desactivar
                    </button>
                  )}
                  {!user.active && (
                    <button
                      onClick={() => setPendingAction({ user, type: 'activate' })}
                      className="text-green-600 hover:underline text-xs"
                    >
                      Activar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
