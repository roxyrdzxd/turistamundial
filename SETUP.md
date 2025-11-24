# 🚀 Guía de Configuración - Turista Mundial

## ✅ Pasos Completados

### 1. Proyecto Inicializado
- ✅ Next.js 14 con TypeScript
- ✅ Tailwind CSS configurado
- ✅ Estructura de carpetas creada
- ✅ Archivos de configuración listos

### 2. Supabase Configurado
- ✅ Clientes de Supabase (browser y server)
- ✅ Middleware de autenticación
- ✅ Variables de entorno configuradas

### 3. Base de Datos
- ✅ Migraciones SQL creadas:
  - `001_initial_schema.sql` - Tablas y políticas
  - `002_seed_countries.sql` - Países del tablero
  - `003_seed_chance_cards.sql` - Cartas de Suerte/Destino

### 4. Autenticación
- ✅ Página de login (`/login`)
- ✅ Página de registro (`/register`)
- ✅ Dashboard protegido (`/dashboard`)
- ✅ Botón de logout
- ✅ Middleware de protección de rutas

## 📋 Próximos Pasos

### Paso 1: Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Espera a que se complete la configuración (2-3 minutos)
4. Ve a **Settings > API** y copia:
   - **Project URL**
   - **anon public key**

### Paso 2: Crear archivo .env.local

En la raíz del proyecto, crea `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Paso 3: Ejecutar Migraciones

En el dashboard de Supabase:

1. Ve a **SQL Editor**
2. Ejecuta cada migración en orden:
   - Copia y pega el contenido de `supabase/migrations/001_initial_schema.sql`
   - Haz clic en **Run**
   - Repite con `002_seed_countries.sql`
   - Repite con `003_seed_chance_cards.sql`

### Paso 4: Instalar Dependencias

```bash
npm install
```

### Paso 5: Iniciar Servidor

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 🧪 Probar la Aplicación

1. Ve a la página principal
2. Haz clic en "Registrarse"
3. Crea una cuenta
4. Serás redirigido al dashboard
5. Prueba el botón "Cerrar Sesión"

## 📝 Notas Importantes

- Las migraciones deben ejecutarse en orden
- Asegúrate de que las variables de entorno estén correctas
- El middleware protege las rutas automáticamente
- Los perfiles se crean automáticamente al registrarse

## 🐛 Solución de Problemas

### Error: "Invalid API key"
- Verifica que las variables de entorno estén correctas
- Asegúrate de usar la **anon key**, no la service_role key

### Error: "relation does not exist"
- Ejecuta las migraciones en Supabase
- Verifica que se ejecutaron en orden

### Error: "Cannot find module"
- Ejecuta `npm install` de nuevo
- Verifica que todas las dependencias estén instaladas

## 🎯 Siguiente Fase

Una vez que todo funcione:

1. **Sistema de Lobby** - Crear y unirse a partidas
2. **Motor del Juego** - Lógica del juego
3. **Tablero Visual** - Interfaz del juego
4. **Realtime** - Sincronización en tiempo real

---

¿Listo para continuar? 🚀

