# Sistema de Tours Interactivos

Turix utiliza **driver.js** para proporcionar guías interactivas que ayudan a los usuarios a familiarizarse con la plataforma.

## Características

- ✅ Tours automáticos en primera visita
- ✅ Botones para reiniciar tours
- ✅ Progreso guardado en localStorage
- ✅ Estilos personalizados con branding Turix
- ✅ Responsive y compatible con móvil

## Componentes

### `TourManager`
Clase principal que gestiona los tours:
- `start()`: Inicia el tour
- `destroy()`: Destruye el tour
- `isTourCompleted(tourId)`: Verifica si un tour fue completado
- `resetTour(tourId)`: Reinicia un tour específico
- `resetAllTours()`: Reinicia todos los tours

### `DashboardTour`
Componente que inicia automáticamente el tour del dashboard en la primera visita.

### `TourButton`
Componente reutilizable para crear botones que inicien tours manualmente.

## Uso

### Crear un nuevo tour

1. **Agregar atributos `data-tour` a los elementos:**

```tsx
<div data-tour="mi-elemento">
  Contenido
</div>
```

2. **Crear el componente del tour:**

```tsx
'use client'

import { TourManager } from '@/lib/tours/tourManager'

const steps = [
  {
    element: '[data-tour="mi-elemento"]',
    popover: {
      title: 'Título del paso',
      description: 'Descripción detallada',
      side: 'bottom', // 'top' | 'bottom' | 'left' | 'right'
      align: 'start', // 'start' | 'center' | 'end'
    },
  },
]

const tour = new TourManager('mi-tour-id', steps)
tour.start()
```

3. **O usar el componente `TourButton`:**

```tsx
<TourButton
  tourId="mi-tour-id"
  steps={steps}
  className="mi-clase-css"
>
  Iniciar Tour
</TourButton>
```

## Tours Implementados

### Dashboard Tour (`dashboard`)
- Bienvenida
- Crear Partida
- Buscar Partidas
- Wallet
- Perfil

## Personalización de Estilos

Los estilos se encuentran en `app/globals.css` bajo la clase `.turix-tour-popover`. Puedes personalizar:
- Colores de fondo
- Bordes y sombras
- Tipografía
- Botones
- Overlay

## Próximos Tours

- [ ] Tour de la página del juego
- [ ] Tour de crear partida
- [ ] Tour de la tienda
- [ ] Tour de misiones

