import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import {
  getTipos,
  getCategories,
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveCategory,
} from './categories.controller';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/tipos', getTipos);
router.get('/', getCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.put('/:id/archive', archiveCategory);
router.put('/:id/unarchive', unarchiveCategory);

export default router;
