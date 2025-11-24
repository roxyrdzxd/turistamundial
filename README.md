# 🌍 Turista Mundial - Juego Virtual

Plataforma web multijugador del clásico juego de mesa Turista Mundial, desarrollada con Next.js 14, TypeScript, Tailwind CSS y Supabase.

## 🚀 Características

- ✅ Autenticación con Supabase
- ✅ Partidas multijugador (4-8 jugadores)
- ✅ Sistema de lobby para crear y unirse a partidas
- ✅ Motor de juego completo con todas las reglas
- ✅ Sincronización en tiempo real con Supabase Realtime
- ✅ Tablero interactivo
- ✅ Sistema de países, construcciones y cartas

## 📋 Requisitos Previos

- Node.js 18+ instalado
- Cuenta de Supabase (gratuita)
- npm o yarn

## 🛠️ Instalación

### 1. Clonar e instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a Settings > API y copia:
   - Project URL
   - anon/public key

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Ejecutar migraciones de base de datos

En el dashboard de Supabase, ve a SQL Editor y ejecuta las migraciones en orden:

1. `supabase/migrations/001_initial_schema.sql` - Crea todas las tablas y políticas
2. `supabase/migrations/002_seed_countries.sql` - Inserta los países del tablero
3. `supabase/migrations/003_seed_chance_cards.sql` - Inserta las cartas de Suerte/Destino

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
TuristaMundial/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas de autenticación
│   ├── (game)/            # Rutas del juego
│   ├── api/               # API Routes
│   └── dashboard/         # Dashboard del usuario
├── components/             # Componentes React
│   ├── game/              # Componentes del juego
│   └── ui/                # Componentes UI reutilizables
├── lib/                    # Utilidades y helpers
│   ├── supabase/          # Clientes de Supabase
│   └── game/              # Motor del juego
├── types/                  # Tipos TypeScript
├── supabase/               # Migraciones de base de datos
│   └── migrations/
└── public/                 # Archivos estáticos
```

## 🎮 Cómo Jugar

1. **Regístrate o inicia sesión** en la plataforma
2. **Crea una partida** o **únete a una existente** desde el dashboard
3. **Espera** a que se unan 4-8 jugadores
4. **Inicia la partida** cuando esté lista
5. **Juega** siguiendo las reglas del Turista Mundial

## 🗄️ Base de Datos

El proyecto usa Supabase PostgreSQL con las siguientes tablas principales:

- `profiles` - Perfiles de usuario
- `game_sessions` - Sesiones de juego
- `session_players` - Jugadores en cada sesión
- `countries` - Países del tablero
- `player_countries` - Propiedades de los jugadores
- `game_moves` - Historial de movimientos
- `chance_cards` - Cartas de Suerte/Destino

## 🔐 Seguridad

- Row Level Security (RLS) habilitado en todas las tablas
- Políticas de acceso configuradas
- Autenticación con Supabase Auth
- Validación de turnos en el servidor

## 🚢 Deploy en Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en Vercel
3. Deploy automático en cada push

## 📝 Próximos Pasos

- [ ] Implementar motor del juego completo
- [ ] Crear tablero visual interactivo
- [ ] Integrar Supabase Realtime
- [ ] Sistema de notificaciones
- [ ] Estadísticas de jugadores
- [ ] Sistema de monetización

## 📄 Licencia

Este proyecto es privado.

## 👥 Contribuir

Este es un proyecto personal, pero las sugerencias son bienvenidas.

---

Desarrollado con ❤️ usando Next.js y Supabase

