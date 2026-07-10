import { useState, FormEvent, useEffect } from 'react';
import api from '../../lib/api';
import { useToast } from '../../components/ToastContext';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'WAITER';
}

interface Props {
  readonly user: User | null;
  readonly onSaved: () => void;
  readonly onCancel: () => void;
}

export default function UserForm({ user, onSaved, onCancel }: Props) {
  const showToast = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'WAITER'>('WAITER');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      setRole(user.role);
    }
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (newPassword && newPassword.length < 6) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    try {
      if (user) {
        await api.put(`/users/${user.id}`, { firstName, lastName, email, role });
        if (newPassword) {
          await api.put(`/users/${user.id}/password`, { newPassword });
        }
      } else {
        await api.post('/users', { firstName, lastName, email, password, role });
      }
      showToast(user ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente', 'success');
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showToast(msg ?? 'Error al guardar el usuario', 'error');
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="font-semibold text-gray-800 mb-4">
        {user ? 'Editar usuario' : 'Nuevo usuario'}
      </h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
          <input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'ADMIN' | 'WAITER')}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="WAITER">Mesero</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>

        {!user && (
          <div className="md:col-span-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {user && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña{' '}
              <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="md:col-span-2 flex gap-3">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            {user ? 'Guardar cambios' : 'Crear usuario'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border border-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
