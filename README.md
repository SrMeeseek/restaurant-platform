# Restaurant Platform

Sistema de gestión para restaurantes. Permite administrar usuarios, inventario de productos y categorías, movimientos de stock y combos. Diseñado con roles diferenciados (administrador y mesero) y una interfaz moderna orientada a operación diaria.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Frontend | React + Vite + TypeScript + Tailwind CSS v4 |
| Base de datos | PostgreSQL 18 |
| ORM | Prisma v5 |
| Autenticación | JWT (8h de expiración) |

---

## Módulos implementados

### Autenticación
- Login con JWT
- Roles: `ADMIN` y `WAITER`
- Cambio de contraseña propia
- Rutas protegidas por rol

### Usuarios
- Listado de usuarios activos e inactivos
- Creación y edición de usuarios (solo ADMIN)
- Activar / desactivar usuarios (soft delete)

### Inventario — Categorías
- Listado con filtro activas/inactivas
- Creación y edición de categorías
- Archivar / desarchivar (soft delete)

### Inventario — Productos
- Listado con filtro activos/archivados
- Tipos: `SIMPLE` y `COMBO`
- Precio de compra y precio de venta
- Archivar / desarchivar (soft delete)
- Historial de auditoría por producto

### Inventario — Combos
- Composición de productos simples con cantidad
- Resumen de costos: precio de compra y venta por componente
- Cálculo automático de descuento respecto al precio de venta individual

### Inventario — Stock
- Agregar stock con nota
- Corregir stock con nota (ajuste absoluto)
- Historial completo de movimientos por producto
- Tabla de auditoría unificada (`ProductAudit`)

---

## Roadmap

- [ ] Módulo de mesas (estados: LIBRE / OCUPADA / RESERVADA)
- [ ] Módulo de pedidos
- [ ] Módulo de caja / ventas
- [ ] Reportes y estadísticas
- [ ] Dashboard con métricas en tiempo real

---

## Estructura del repositorio

```
restaurant-platform/
├── backend/          # API REST en Express + TypeScript
│   ├── prisma/       # Schema, migraciones y seed
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   └── modules/
│   │       ├── inventory/
│   │       └── users/
│   └── .env.example
└── frontend/         # SPA en React + Vite
    ├── public/
    ├── src/
    │   ├── components/
    │   ├── lib/
    │   └── modules/
    │       ├── dashboard/
    │       ├── inventory/
    │       └── users/
    └── .env.example
```

---

## Requisitos previos

- Node.js 20+
- PostgreSQL 18
- npm

---

## Configuración y ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/SrMeeseek/restaurant-platform.git
cd restaurant-platform
```

### 2. Configurar variables de entorno

**Backend:**
```bash
cd backend
cp .env.example .env
```
Edita `backend/.env` con tus credenciales de PostgreSQL y un JWT_SECRET seguro.

**Frontend:**
```bash
cd frontend
cp .env.example .env.local
```
Edita `frontend/.env.local` si el backend corre en una URL distinta a `http://localhost:3000/api`.

### 3. Instalar dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 4. Crear la base de datos y correr migraciones

```bash
cd backend
npx prisma migrate deploy
```

### 5. Cargar datos iniciales (seed)

```bash
cd backend
npx prisma db seed
```

> **Importante:** el seed crea un usuario administrador con credenciales por defecto. Cámbialas inmediatamente después del primer login.
>
> - Email: `admin@restaurante.com`
> - Contraseña: `admin123`

### 6. Iniciar los servidores

**Backend** (puerto 3000):
```bash
cd backend
npm run dev
```

**Frontend** (puerto 5173):
```bash
cd frontend
npm run dev
```

---

## Variables de entorno

### backend/.env

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT (usa una cadena larga y aleatoria) |

### frontend/.env.local

| Variable | Descripción | Default |
|---|---|---|
| `VITE_API_URL` | URL base del backend | `http://localhost:3000/api` |

---

## Licencia

Proyecto privado — todos los derechos reservados.
