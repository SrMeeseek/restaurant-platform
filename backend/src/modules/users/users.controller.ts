import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

// Campos publicos que se devuelven al frontend (nunca la contraseña)
const PUBLIC_FIELDS = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
};

// Valida que el email tenga formato correcto
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Retorna todos los usuarios (activos e inactivos)
export const getUsers = async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: PUBLIC_FIELDS,
    orderBy: [{ active: 'desc' }, { firstName: 'asc' }],
  });
  res.json(users);
};

// Crea un nuevo usuario con contraseña encriptada
export const createUser = async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, role } = req.body;

  if (!firstName || !lastName || !email || !password) {
    res.status(400).json({ error: 'Todos los campos son obligatorios' });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Formato de email invalido' });
    return;
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    res.status(400).json({ error: 'El email ya esta registrado' });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { firstName, lastName, email, password: hashed, role },
    select: PUBLIC_FIELDS,
  });

  res.status(201).json(user);
};

// Actualiza datos de cualquier usuario (solo admin)
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, email, role } = req.body;

  if (email && !isValidEmail(email)) {
    res.status(400).json({ error: 'Formato de email invalido' });
    return;
  }

  if (email) {
    const exists = await prisma.user.findFirst({
      where: { email, NOT: { id: Number(id) } },
    });
    if (exists) {
      res.status(400).json({ error: 'El email ya esta en uso por otro usuario' });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data: { firstName, lastName, email, role },
    select: PUBLIC_FIELDS,
  });

  res.json(user);
};

// Actualiza la contraseña de cualquier usuario (solo admin)
export const updateUserPassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: Number(id) },
    data: { password: hashed },
  });

  res.json({ message: 'Contraseña actualizada correctamente' });
};

// Reactiva un usuario previamente desactivado
export const activateUser = async (_req: Request, res: Response) => {
  const targetId = Number(_req.params.id);

  await prisma.user.update({ where: { id: targetId }, data: { active: true } });
  res.json({ message: 'Usuario activado correctamente' });
};

// Desactiva el usuario en lugar de borrarlo (borrado logico)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  const targetId = Number(req.params.id);

  if (req.user?.id === targetId) {
    res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (target?.role === 'ADMIN') {
    const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
    if (activeAdmins <= 1) {
      res.status(400).json({ error: 'Debe haber al menos un administrador activo' });
      return;
    }
  }

  await prisma.user.update({ where: { id: targetId }, data: { active: false } });
  res.json({ message: 'Usuario desactivado correctamente' });
};
