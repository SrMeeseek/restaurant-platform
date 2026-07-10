import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { AuditType } from '@prisma/client';

export const getProducts = async (req: AuthRequest, res: Response) => {
  const { active } = req.query;
  const where = active !== undefined ? { active: active === 'true' } : {};
  try {
    const products = await prisma.product.findMany({
      where,
      orderBy: [{ category: { tipo: 'asc' } }, { name: 'asc' }],
      include: {
        category: true,
        comboItems: {
          include: { product: { include: { category: true } } },
        },
      },
    });
    res.json(products);
  } catch {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

export const getProduct = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        comboItems: {
          include: { product: { include: { category: true } } },
        },
      },
    });
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json(product);
  } catch {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  const {
    name,
    categoryId,
    purchasePrice,
    salePrice,
    hasIva,
    ivaPercentage,
    initialStock,
    comboItems,
  } = req.body as {
    name?: string;
    categoryId?: number;
    purchasePrice?: number;
    salePrice?: number;
    hasIva?: boolean;
    ivaPercentage?: number;
    initialStock?: number;
    comboItems?: Array<{ productId: number; quantity: number }>;
  };

  if (!name?.trim()) {
    res.status(400).json({ error: 'El nombre es requerido' });
    return;
  }
  if (!categoryId) {
    res.status(400).json({ error: 'La categoria es requerida' });
    return;
  }
  if (salePrice === undefined || salePrice === null) {
    res.status(400).json({ error: 'El precio de venta es requerido' });
    return;
  }

  try {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      res.status(404).json({ error: 'Categoria no encontrada' });
      return;
    }

    const tipo = category.tipo;

    if (tipo === 'COMBO' && hasIva) {
      res.status(400).json({ error: 'Los combos no pueden tener IVA' });
      return;
    }
    if (tipo === 'COMBO' && (!comboItems || comboItems.length === 0)) {
      res.status(400).json({ error: 'El combo debe tener al menos un producto componente' });
      return;
    }

    const product = await prisma.$transaction(async (tx) => {
      const stockInicial = tipo === 'BIEN' ? (initialStock ?? 0) : null;

      const created = await tx.product.create({
        data: {
          name: name.trim(),
          categoryId,
          purchasePrice: purchasePrice ?? null,
          salePrice,
          hasIva: tipo === 'COMBO' ? false : (hasIva ?? false),
          ivaPercentage: tipo !== 'COMBO' && hasIva && ivaPercentage ? ivaPercentage : null,
          stock: stockInicial,
          comboItems:
            tipo === 'COMBO' && comboItems
              ? { create: comboItems.map((ci) => ({ productId: ci.productId, quantity: ci.quantity })) }
              : undefined,
        },
        include: {
          category: true,
          comboItems: { include: { product: true } },
        },
      });

      if (tipo === 'BIEN' && (stockInicial ?? 0) > 0) {
        await tx.productAudit.create({
          data: {
            productId: created.id,
            userId: req.user!.id,
            type: AuditType.STOCK_ADD,
            stockBefore: 0,
            stockAfter: stockInicial ?? 0,
            note: 'Stock inicial',
          },
        });
      }

      return created;
    });

    res.status(201).json(product);
  } catch {
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const {
    name,
    categoryId,
    purchasePrice,
    salePrice,
    hasIva,
    ivaPercentage,
    comboItems,
  } = req.body as {
    name?: string;
    categoryId?: number;
    purchasePrice?: number | null;
    salePrice?: number;
    hasIva?: boolean;
    ivaPercentage?: number | null;
    comboItems?: Array<{ productId: number; quantity: number }>;
  };

  if (!name?.trim()) {
    res.status(400).json({ error: 'El nombre es requerido' });
    return;
  }
  if (!categoryId) {
    res.status(400).json({ error: 'La categoria es requerida' });
    return;
  }
  if (salePrice === undefined || salePrice === null) {
    res.status(400).json({ error: 'El precio de venta es requerido' });
    return;
  }

  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      res.status(404).json({ error: 'Categoria no encontrada' });
      return;
    }

    const tipo = category.tipo;

    if (tipo === 'COMBO' && hasIva) {
      res.status(400).json({ error: 'Los combos no pueden tener IVA' });
      return;
    }
    if (tipo === 'COMBO' && (!comboItems || comboItems.length === 0)) {
      res.status(400).json({ error: 'El combo debe tener al menos un producto componente' });
      return;
    }

    // Valores anteriores para detectar cambios de precio
    const oldPurchase = existing.purchasePrice === null ? null : Number(existing.purchasePrice);
    const newPurchase = purchasePrice !== undefined && purchasePrice !== null ? Number(purchasePrice) : null;
    const oldSale = Number(existing.salePrice);
    const newSale = Number(salePrice);

    const updated = await prisma.$transaction(async (tx) => {
      if (tipo === 'COMBO') {
        await tx.comboItem.deleteMany({ where: { comboId: id } });
      }

      const result = await tx.product.update({
        where: { id },
        data: {
          name: name.trim(),
          categoryId,
          purchasePrice: newPurchase ?? null,
          salePrice,
          hasIva: tipo === 'COMBO' ? false : (hasIva ?? false),
          ivaPercentage: tipo !== 'COMBO' && hasIva && ivaPercentage ? ivaPercentage : null,
          comboItems:
            tipo === 'COMBO' && comboItems
              ? { create: comboItems.map((ci) => ({ productId: ci.productId, quantity: ci.quantity })) }
              : undefined,
        },
        include: {
          category: true,
          comboItems: { include: { product: true } },
        },
      });

      // Registra cambios de precio si los hubo
      if (oldPurchase !== newPurchase) {
        await tx.productAudit.create({
          data: {
            productId: id,
            userId: req.user!.id,
            type: AuditType.PRICE_PURCHASE,
            oldValue: oldPurchase ?? null,
            newValue: newPurchase ?? null,
          },
        });
      }
      if (oldSale !== newSale) {
        await tx.productAudit.create({
          data: {
            productId: id,
            userId: req.user!.id,
            type: AuditType.PRICE_SALE,
            oldValue: oldSale,
            newValue: newSale,
          },
        });
      }

      return result;
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

// Agrega o corrige stock segun el modo indicado
export const addStock = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const { mode, quantity, note } = req.body as {
    mode?: 'add' | 'correct';
    quantity?: number;
    note?: string;
  };

  if (!mode || !['add', 'correct'].includes(mode)) {
    res.status(400).json({ error: 'El modo debe ser "add" o "correct"' });
    return;
  }
  if (quantity === undefined || quantity === null || quantity < 0) {
    res.status(400).json({ error: 'La cantidad no puede ser negativa' });
    return;
  }
  if (mode === 'add' && quantity === 0) {
    res.status(400).json({ error: 'La cantidad a agregar debe ser mayor a 0' });
    return;
  }
  if (!note?.trim()) {
    res.status(400).json({ error: 'La nota es obligatoria' });
    return;
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    if (product.category.tipo !== 'BIEN') {
      res.status(400).json({ error: 'Solo los bienes tienen control de stock' });
      return;
    }

    const currentStock = product.stock ?? 0;
    const newStock = mode === 'add' ? currentStock + quantity : quantity;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.productAudit.create({
        data: {
          productId: id,
          userId: req.user!.id,
          type: mode === 'add' ? AuditType.STOCK_ADD : AuditType.STOCK_CORRECT,
          stockBefore: currentStock,
          stockAfter: newStock,
          note: note.trim(),
        },
      });
      return tx.product.update({
        where: { id },
        data: { stock: newStock },
        include: { category: true },
      });
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al actualizar stock' });
  }
};

export const archiveProduct = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const updated = await prisma.product.update({
      where: { id },
      data: { active: false },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al archivar producto' });
  }
};

export const unarchiveProduct = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const updated = await prisma.product.update({
      where: { id },
      data: { active: true },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al desarchivar producto' });
  }
};

// Retorna el historial de cambios de un producto especifico
export const getStockHistory = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const entries = await prisma.productAudit.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.json(entries);
  } catch {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

// Retorna el historial de cambios de todos los productos
export const getAllStockHistory = async (_req: AuthRequest, res: Response) => {
  try {
    const entries = await prisma.productAudit.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: { select: { name: true } },
          },
        },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.json(entries);
  } catch {
    res.status(500).json({ error: 'Error al obtener historial de inventario' });
  }
};
