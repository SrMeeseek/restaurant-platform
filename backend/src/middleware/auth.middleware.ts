import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extiende el tipo Request para incluir el usuario decodificado del token
export interface AuthRequest extends Request {
  user?: { id: number; role: string };
}

// Verifica que el token JWT sea valido antes de procesar la peticion
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no está definida en las variables de entorno');
    const decoded = jwt.verify(token, secret) as { id: number; role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado' });
  }
};

// Permite el acceso solo a usuarios con rol ADMIN
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Acceso restringido a administradores' });
    return;
  }
  next();
};
