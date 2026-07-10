import { PrismaClient } from '@prisma/client';

// Instancia global de Prisma para reutilizar la conexion en todos los modulos
const prisma = new PrismaClient();

export default prisma;
