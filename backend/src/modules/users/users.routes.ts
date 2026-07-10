import { Router } from 'express';
import { getUsers, createUser, updateUser, updateUserPassword, activateUser, deleteUser } from './users.controller';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';

const router = Router();

// Solo el admin puede gestionar usuarios
router.get('/', authenticate, requireAdmin, getUsers);
router.post('/', authenticate, requireAdmin, createUser);
router.put('/:id', authenticate, requireAdmin, updateUser);
router.put('/:id/password', authenticate, requireAdmin, updateUserPassword);
router.put('/:id/activate', authenticate, requireAdmin, activateUser);
router.delete('/:id', authenticate, requireAdmin, deleteUser);

export default router;
