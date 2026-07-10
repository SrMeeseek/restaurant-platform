import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './modules/users/users.routes';
import authRoutes from './modules/users/auth.routes';
import categoriesRoutes from './modules/inventory/categories.routes';
import productsRoutes from './modules/inventory/products.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Oculta la cabecera X-Powered-By para no exponer que el servidor usa Express
app.disable('x-powered-by');

app.use(express.json());

// En desarrollo permite cualquier origen; en produccion se restringe al dominio del frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Servidor corriendo' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
