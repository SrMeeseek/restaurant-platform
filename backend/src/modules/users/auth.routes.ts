import { Router } from 'express';
import { login, updateOwnPassword } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Ruta publica
router.post('/login', login);

// Cualquier usuario autenticado puede cambiar su propia contraseña
router.put('/password', authenticate, updateOwnPassword);

export default router;
