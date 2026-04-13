# Financial Management - Frontend

Frontend de la aplicación de gestión de finanzas personales construida con React, Bootstrap y Supabase.

## 🚀 Características

- ✅ Autenticación con Supabase Auth
- ✅ Dashboard con resumen financiero y gráficos
- ✅ Gestión completa de transacciones
- ✅ Administración de cuentas bancarias
- ✅ Categorías personal con colores e iconos
- ✅ Presupuestos con seguimiento de progreso
- ✅ Reportes y análisis con gráficos
- ✅ Diseño responsive

## 📋 Requisitos

- Node.js 16+
- npm o yarn
- Backend API corriendo (ver [backend README](../backend/README.md))
- Cuenta de Supabase

## ⚙️ Configuración

### 1. Instalar dependencias

```bash
cd frontend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Supabase:

```env
REACT_APP_SUPABASE_URL=https://tu-proyecto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Asegúrate de que el backend esté corriendo

El backend debe estar corriendo en `http://localhost:5000` (por defecto).

Si necesitas cambiar la URL del API, agrega en `.env`:

```env
REACT_APP_API_URL=http://localhost:5000
```

### 4. Ejecutar la aplicación

```bash
npm start
```

La aplicación estará disponible en: `http://localhost:3000`

## 📁 Estructura del Proyecto

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Navbar.js           # Barra de navegación
│   │   ├── ProtectedRoute.js   # Ruta protegida
│   │   ├── TransactionForm.js  # Formulario de transacción
│   │   ├── TransactionList.js  # Lista de transacciones
│   │   └── Chart.js            # Componente de gráficos
│   ├── context/
│   │   └── AuthContext.js      # Contexto de autenticación
│   ├── pages/
│   │   ├── Login.js            # Página de login
│   │   ├── Register.js         # Página de registro
│   │   ├── Dashboard.js        # Dashboard principal
│   │   ├── Transactions.js     # Gestión de transacciones
│   │   ├── Accounts.js         # Gestión de cuentas
│   │   ├── Categories.js       # Gestión de categorías
│   │   ├── Budgets.js          # Gestión de presupuestos
│   │   └── Reports.js          # Reportes y análisis
│   ├── services/
│   │   ├── api.js              # Cliente API (axios)
│   │   └── supabase.js         # Cliente Supabase
│   ├── App.js                  # Componente principal
│   ├── index.js                # Entry point
│   └── .env.example
└── package.json
```

## 🛠️ Tecnologías

- **React 18**: Framework UI
- **React Router v6**: Navegación
- **Bootstrap 5 + React Bootstrap**: Componentes UI
- **Axios**: Cliente HTTP
- **Supabase JS**: Autenticación
- **Chart.js + React-Chartjs-2**: Gráficos
- **React Icons**: Iconos

## 🎨 Páginas

### Login / Register
- Autenticación con Supabase Auth
- Registro con verificación por email
- Diseño limpio y centrado

### Dashboard
- Resumen de balance total
- Ingresos y gastos del mes
- Gráfico de ingresos vs gastos
- Estado de presupuestos con barras de progreso
- Transacciones recientes

### Transacciones
- Lista completa de transacciones
- Filtros por tipo y fecha
- Crear, editar y eliminar transacciones
- Actualización automática de balances

### Cuentas
- Tarjetas de cuentas bancarias
- Crear, editar y eliminar cuentas
- Soporte para múltiples monedas

### Categorías
- Categorías de ingresos y gastos
- Personalización con colores e iconos
- Filtrado por tipo

### Presupuestos
- Presupuestos mensuales o semanales
- Seguimiento de progreso con barras de progreso
- Indicadores visuales de uso

### Reportes
- Gráfico de gastos por categoría (Doughnut)
- Tendencia de ingresos vs gastos (Line)
- Desglose por categoría
- Filtros por fecha

## 📱 Responsive Design

La aplicación es completamente responsive y funciona en:
- Desktop
- Tablet
- Móvil

## 🔐 Autenticación

La autenticación se maneja con Supabase Auth:
- Los tokens JWT se almacenan en localStorage
- Las rutas protegidas verifican autenticación
- Auto-redirect a login si no hay sesión

## 🚀 Build para Producción

```bash
npm run build
```

Los archivos optimizados se generan en `build/`

## 📝 Notas

- El backend debe estar corriendo antes de iniciar el frontend
- Las variables de entorno de Supabase son obligatorias
- Se recomienda usar el proxy en desarrollo (configurado en package.json)

## 🐛 Solución de Problemas

### Error de conexión al backend
- Verifica que el backend esté corriendo en `http://localhost:5000`
- Configura `REACT_APP_API_URL` si usas otra URL

### Error de autenticación
- Verifica las credenciales de Supabase en `.env`
- Asegúrate de que Supabase Auth esté habilitado

### Error de CORS
- El backend ya está configurado para aceptar requests de `localhost:3000`
- Si cambias el puerto, actualiza `CORS_ORIGINS` en el backend

## 📄 Licencia

MIT
