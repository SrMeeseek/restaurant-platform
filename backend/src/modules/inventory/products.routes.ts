import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  addStock,
  archiveProduct,
  unarchiveProduct,
  getStockHistory,
  getAllStockHistory,
} from './products.controller';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getProducts);
router.get('/stock-history', getAllStockHistory); // debe ir antes de /:id
router.get('/:id', getProduct);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.put('/:id/stock', addStock);
router.put('/:id/archive', archiveProduct);
router.put('/:id/unarchive', unarchiveProduct);
router.get('/:id/stock-history', getStockHistory);

export default router;
