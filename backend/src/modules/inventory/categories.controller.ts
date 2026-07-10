import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { Tipo } from '@prisma/client';

export const getTipos = (_req: AuthRequest, res: Response) => {
  res.json(Object.values(Tipo));
};

export const getCategories = async (req: AuthRequest, res: Response) => {
  const { active } = req.query;
  const where = active !== undefined ? { active: active === 'true' } : {};
  try {
    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ tipo: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: true } },
      },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Error al obtener categorias' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  const { name, tipo } = req.body as { name?: string; tipo?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: 'El nombre es requerido' });
    return;
  }
  if (!tipo || !Object.values(Tipo).includes(tipo as Tipo)) {
    res.status(400).json({ error: 'El tipo debe ser BIEN, SERVICIO o COMBO' });
    return;
  }

  try {
    const category = await prisma.category.create({
      data: { name: name.trim(), tipo: tipo as Tipo },
    });
    res.status(201).json(category);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una categoria con ese nombre' });
      return;
    }
    res.status(500).json({ error: 'Error al crear categoria' });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const { name, tipo } = req.body as { name?: string; tipo?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: 'El nombre es requerido' });
    return;
  }
  if (!tipo || !Object.values(Tipo).includes(tipo as Tipo)) {
    res.status(400).json({ error: 'El tipo debe ser BIEN, SERVICIO o COMBO' });
    return;
  }

  try {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      res.status(404).json({ error: 'Categoria no encontrada' });
      return;
    }

    if (existing.tipo !== tipo && existing._count.products > 0) {
      res.status(400).json({
        error: 'No se puede cambiar el tipo de una categoria que tiene productos',
      });
      return;
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name: name.trim(), tipo: tipo as Tipo },
    });
    res.json(updated);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una categoria con ese nombre' });
      return;
    }
    res.status(500).json({ error: 'Error al actualizar categoria' });
  }
};

// Archiva la categoria; falla si tiene productos activos asociados
export const archiveCategory = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);

  try {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      res.status(404).json({ error: 'Categoria no encontrada' });
      return;
    }
    if (existing._count.products > 0) {
      res.status(400).json({
        error: 'No se puede archivar una categoria que tiene productos',
      });
      return;
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { active: false },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al archivar categoria' });
  }
};

export const unarchiveCategory = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { active: true },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al desarchivar categoria' });
  }
};
