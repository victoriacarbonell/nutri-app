# NutriApp 🥗

> 🚧 **Proyecto en curso.** La app funciona en el entorno de desarrollo de Replit, pero todavía no está publicada. Sigo usando este código como base para mejorarla.

Aplicación móvil progresiva (PWA) para el seguimiento de calorías y nutrición, diseñada para iPhone y Android. Interfaz completamente en español con paleta de colores pastel y navegación optimizada para pantallas táctiles.

Desarrollada con ayuda del agente de IA de Replit: yo definí las funcionalidades, revisé el resultado y fui iterando sobre él.

## Características

- **Registro diario** — 6 franjas horarias de comida (desayuno, almuerzo, comida, merienda, cena, snacks)
- **Base de datos de alimentos** — búsqueda, filtrado por categoría con emojis y vista agrupada
- **Escáner de código de barras** — identifica alimentos al instante con la cámara
- **Análisis IA de fotos** — fotografía un plato y la IA estima las calorías y macros (powered by OpenAI GPT)
- **Recetas personalizadas** — crea tus propias recetas con ingredientes de la base de datos
- **Calculadora Harris-Benedict** — calcula tu objetivo calórico según tus datos físicos y nivel de actividad
- **Calendario mensual** — visualiza tu adherencia diaria con código de colores (verde/ámbar/rojo)
- **Seguimiento de ejercicio** — registra actividad física y calorías quemadas
- **Seguimiento de peso y medidas** — historial de peso corporal y medidas
- **Resúmenes IA** — análisis semanal y mensual con puntuación, observaciones y recomendaciones personalizadas
- **Estadísticas** — gráficos de progreso de calorías, macros y peso

## Tecnología

| Capa | Stack |
|------|-------|
| Frontend | React + Vite + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Backend | Express 5 + Node.js |
| Base de datos | PostgreSQL + Drizzle ORM |
| IA | OpenAI GPT (análisis de imagen y resúmenes) |
| API | OpenAPI 3 + React Query (Orval codegen) |
| Monorepo | pnpm workspaces |

## Estructura del proyecto

```
├── artifacts/
│   ├── calorie-tracker/     # Frontend React (PWA)
│   └── api-server/          # Backend Express API
├── lib/
│   ├── api-client-react/    # Hooks generados (React Query)
│   ├── api-spec/            # Especificación OpenAPI + Orval config
│   ├── api-zod/             # Schemas Zod generados
│   ├── db/                  # Schema Drizzle + cliente PostgreSQL
│   └── integrations-openai-ai-server/  # Cliente OpenAI
└── scripts/                 # Scripts de utilidad
```

## Desarrollo local

Requiere Node.js 20+ y pnpm 9+.

```bash
# Instalar dependencias
pnpm install

# Iniciar frontend (puerto asignado por Replit)
pnpm --filter @workspace/calorie-tracker run dev

# Iniciar backend
pnpm --filter @workspace/api-server run dev

# Regenerar cliente API tras cambios en OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `SESSION_SECRET` | Secreto para sesiones Express |
| `OPENAI_API_KEY` | Clave API de OpenAI (gestionada por Replit) |

## Estado y despliegue

La app se ejecuta en el entorno de desarrollo de Replit, con la base de datos PostgreSQL alojada también en Replit. Todavía no tiene una versión publicada.

## Próximos pasos

- [ ] Publicar la app como PWA
- [ ] Limitar el uso del análisis con IA para controlar el coste de la API de OpenAI
<!-- Añade aquí las mejoras que tengas pensadas -->

## Rutas de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/foods` | Listado de alimentos (con filtros) |
| POST | `/api/foods` | Crear alimento |
| GET | `/api/logs/:date` | Registro del día |
| POST | `/api/logs/:date` | Añadir entrada al registro |
| GET | `/api/dashboard/today` | Resumen del día actual |
| GET | `/api/dashboard/calendar/:year/:month` | Vista mensual |
| GET | `/api/profile` | Perfil del usuario |
| PUT | `/api/profile` | Actualizar perfil |
| GET/POST | `/api/weight` | Registros de peso |
| GET/POST | `/api/exercises` | Ejercicios |
| GET/POST | `/api/recipes` | Recetas |
| POST | `/api/ai/analyze-image` | Análisis de foto con IA |
| GET | `/api/ai/weekly-summary` | Resumen semanal IA |
| GET | `/api/ai/monthly-summary` | Resumen mensual IA |
