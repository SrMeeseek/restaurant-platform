import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';

interface AuthRequest extends Request {
  user?: { id: number; role: string };
}

// Valida credenciales y retorna un token JWT si son correctas
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.active) {
    res.status(401).json({ error: 'Credenciales invalidas' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Credenciales invalidas' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no está definida en las variables de entorno');
  const token = jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: '8h' });

  res.json({
    token,
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role },
  });
};

// Permite al usuario autenticado actualizar su propia contraseña
export const updateOwnPassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Contraseña actual y nueva son obligatorias' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  res.json({ message: 'Contraseña actualizada correctamente' });
};
