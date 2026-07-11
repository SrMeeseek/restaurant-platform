import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { TableStatus, MesaShape } from '@prisma/client';

export const getMesas = async (req: AuthRequest, res: Response) => {
  const { active } = req.query;
  const where = active !== undefined ? { active: active === 'true' } : {};
  try {
    const mesas = await prisma.mesa.findMany({
      where,
      orderBy: { numero: 'asc' },
    });
    res.json(mesas);
  } catch {
    res.status(500).json({ error: 'Error al obtener mesas' });
  }
};

export const createMesa = async (req: AuthRequest, res: Response) => {
  const { numero, capacidad, posX, posY, shape } = req.body as {
    numero?: string;
    capacidad?: number;
    posX?: number;
    posY?: number;
    shape?: string;
  };

  if (!numero?.trim()) {
    res.status(400).json({ error: 'El número de mesa es requerido' });
    return;
  }
  if (!capacidad || capacidad < 1) {
    res.status(400).json({ error: 'La capacidad debe ser al menos 1' });
    return;
  }

  try {
    const mesa = await prisma.mesa.create({
      data: {
        numero: numero.trim(),
        capacidad,
        posX: posX ?? 0,
        posY: posY ?? 0,
        shape: Object.values(MesaShape).includes(shape as MesaShape) ? (shape as MesaShape) : MesaShape.CUADRADA,
      },
    });
    res.status(201).json(mesa);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una mesa con ese número' });
      return;
    }
    res.status(500).json({ error: 'Error al crear mesa' });
  }
};

export const updateMesa = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const { numero, capacidad, shape } = req.body as { numero?: string; capacidad?: number; shape?: string };

  if (!numero?.trim()) {
    res.status(400).json({ error: 'El número de mesa es requerido' });
    return;
  }
  if (!capacidad || capacidad < 1) {
    res.status(400).json({ error: 'La capacidad debe ser al menos 1' });
    return;
  }

  try {
    const updated = await prisma.mesa.update({
      where: { id },
      data: {
        numero: numero.trim(),
        capacidad,
        ...(Object.values(MesaShape).includes(shape as MesaShape) && { shape: shape as MesaShape }),
      },
    });
    res.json(updated);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una mesa con ese número' });
      return;
    }
    res.status(500).json({ error: 'Error al actualizar mesa' });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status?: string };

  if (!status || !Object.values(TableStatus).includes(status as TableStatus)) {
    res.status(400).json({ error: 'Estado inválido. Debe ser LIBRE, OCUPADA o RESERVADA' });
    return;
  }

  try {
    const updated = await prisma.mesa.update({
      where: { id },
      data: { status: status as TableStatus },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
};

export const updatePositions = async (req: AuthRequest, res: Response) => {
  const { positions } = req.body as {
    positions?: { id: number; posX: number; posY: number }[];
  };

  if (!Array.isArray(positions)) {
    res.status(400).json({ error: 'Se requiere un array de posiciones' });
    return;
  }

  try {
    await prisma.$transaction(
      positions.map((p) =>
        prisma.mesa.update({
          where: { id: p.id },
          data: { posX: p.posX, posY: p.posY },
        })
      )
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al guardar posiciones' });
  }
};

export const archiveMesa = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const updated = await prisma.mesa.update({
      where: { id },
      data: { active: false },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al archivar mesa' });
  }
};

export const unarchiveMesa = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const updated = await prisma.mesa.update({
      where: { id },
      data: { active: true },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al desarchivar mesa' });
  }
};
