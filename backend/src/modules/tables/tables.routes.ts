import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import {
  getMesas,
  createMesa,
  updateMesa,
  updateStatus,
  updatePositions,
  archiveMesa,
  unarchiveMesa,
} from './tables.controller';

const router = Router();

router.use(authenticate);

// /positions debe registrarse antes de /:id para evitar que Express lo trate como un id
router.put('/positions', requireAdmin, updatePositions);

router.get('/', getMesas);
router.post('/', requireAdmin, createMesa);
router.put('/:id', requireAdmin, updateMesa);
router.put('/:id/status', updateStatus);
router.put('/:id/archive', requireAdmin, archiveMesa);
router.put('/:id/unarchive', requireAdmin, unarchiveMesa);

export default router;
