# iFuel – iRacing Fuel Overlay (React + Electron)

iFuel es un overlay de **fuel y estrategia** para iRacing, pensado para ser ligero, claro y fácil de reutilizar en otros proyectos.  
Consta de un servidor de telemetría (WebSocket) y una app de escritorio hecha con **React + Vite + Electron**.

> Nota: este repositorio contiene la parte de cliente (overlay). El servidor de telemetría iFuel debe estar ejecutándose en `ws://localhost:7071/ifuel`.

***

## Características

- Widget de fuel compacto, con diseño oscuro y tipografía monoespaciada.
- Datos principales:
  - Fuel actual, tiempo de fuel y vueltas estimadas restantes.
  - Consumo por vuelta: `FUEL LAST`, `FUEL AVG`, medias de `2/5/10` vueltas.
  - Estimación de **refuel necesario** (`EST REFUEL`) en vueltas o sesiones por tiempo.
- Información de sesión:
  - Vueltas restantes o tiempo restante (`SESSION`).
  - Temperatura ambiente y de pista.
- Información de vuelta:
  - Número de vuelta, tiempo de vuelta y consumo de fuel de la vuelta actual.
  - Diferencia de consumo frente a la media (verde/rojo).
- Estrategia:
  - Primera vuelta en la que puedes parar y llegar al final (`EARLY PIT`).
  - Número mínimo de paradas por fuel (`STOPS`).
  - Vueltas objetivo de cada stint (`STINTS`).
- Mini-gráficos:
  - Histórico de consumo de las últimas 5 vueltas.
  - Histograma de consumo de las últimas 30 vueltas.
- Panel de ajustes integrado:
  - `Min lap time (s)` – filtra vueltas demasiado lentas (pits, trompos, etc.).
  - `Min fuel / lap` – filtra consumos irreales.
  - `Safety laps` – vueltas extra de seguridad para el cálculo de refuel.
  - Selección de media (`AVG 2/5/10`).
- Overlay movible dentro de la ventana:
  - Botón de **candado** 🔒/🔓 para bloquear/desbloquear el movimiento.
  - Panel de ajustes ⚙ con persistencia en `localStorage`.
- Pensado para rendimiento:
  - Throttling de actualizaciones de UI (~20 Hz).
  - Uso de `React.memo`, `useMemo` y `useCallback` para reducir re-renders.
  - Cálculos de medias y estrategia fuera del árbol de render.

***

## Arquitectura

- **Frontend**: React + TypeScript + Vite.
- **Desktop wrapper**: Electron (ventana transparente/normal según se prefiera).
- **Comunicación**: WebSocket a `ws://localhost:7071/ifuel`.
- **Estado de telemetría**:
  - Hook `useIfuelWebSocket`:
    - Se conecta al servidor WS.
    - Acumula histórico de vueltas (`LapSample`).
    - Calcula medias de consumo, estimaciones de fuel, estrategia y datos para gráficos.
    - Aplica un throttling de estado para no re-renderizar al ritmo de cada tick de telemetría.
  - Contenedor `FuelWidgetContainer`:
    - Lee/guarda opciones en `localStorage` (`ifuel-settings-v1`).
    - Gestiona el drag del overlay y el estado del candado.
    - Construye labels como `sessionLabel`.
    - Renderiza `FuelWidget` y el panel de ajustes.

***

## Requisitos

- Node.js (versión recomendada: LTS).
- npm o yarn.
- iRacing corriendo en el equipo.
- Servidor de telemetría iFuel escuchando en `ws://localhost:7071/ifuel` (no incluido en este repo).

***

## Instalación y ejecución

1. Clonar el repositorio:

```bash
git clone https://github.com/empg80/iFuel.git
cd iFuel
```

2. Instalar dependencias:

```bash
npm install
# o
yarn install
```

3. Ejecutar en modo desarrollo:

```bash
npm run dev
```

4. Ejecutar el wrapper Electron (si está configurado):

```bash
npm run electron
```

Asegúrate de que el servidor de telemetría está activo y enviando datos a `ws://localhost:7071/ifuel`.  
En caso contrario, el overlay mostrará “Esperando datos de iRacing…”.

***

## Uso básico

- Abre la app iFuel.
- Conecta iRacing y ponte en pista.
- Ajusta los parámetros en el panel ⚙:
  - Pon un `Min lap time` acorde al circuito (por ejemplo, 20–30 s en óvalo corto, 60–120 s en circuito normal).
  - Configura `Min fuel / lap` y `Safety laps` a tu gusto.
- Desbloquea el candado 🔓 para mover el widget dentro de la ventana, vuelve a bloquear 🔒 cuando esté en su sitio.

***

## Desarrollo

Scripts habituales:

```bash
# Arrancar en desarrollo
npm run dev

# Lint/format (según configuración del proyecto)
npm run lint
npm run build
```

La lógica clave está en:

- `src/useIfuelWebSocket.ts` – lectura de telemetría, medias, estrategia y throttling.
- `src/components/FuelWidget.tsx` – presentación del overlay de fuel.
- `src/components/FuelWidgetContainer.tsx` – WebSocket, ajustes, drag, candado y wiring de props.

***

## Roadmap / Ideas futuras

- Añadir overlay de **deltas de tiempos** (ahead/behind) tipo “relative” con barras verde/rojo.
- Soporte para varios perfiles de ajustes por coche/pista.
- Exportar el hook de telemetría como pequeña librería independiente.
- Integración más estrecha con Electron (always-on-top, click-through opcional, etc.).

***

## Licencia

Pendiente de definir.  
Mientras tanto, se considera uso personal/no comercial.
