import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Crea el usuario administrador inicial si no existe
async function seed() {
  try {
    const existing = await prisma.user.findUnique({ where: { email: 'admin@restaurante.com' } });
    if (existing) {
      console.log('El usuario admin ya existe, no se crea de nuevo.');
      return;
    }

    const hashed = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        firstName: 'Administrador',
        lastName: 'Principal',
        email: 'admin@restaurante.com',
        password: hashed,
        role: 'ADMIN',
      },
    });

    console.log('Admin creado:', admin.email);
  } finally {
    await prisma.$disconnect();
  }
}

// top-level await no es compatible con CommonJS; se usa llamada directa
seed(); // NOSONAR
