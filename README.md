Here’s the README rewritten in English:

***

# iFuel – iRacing Fuel Overlay (React + Electron)

iFuel is a **fuel and strategy overlay** for iRacing, designed to be lightweight, clear, and easy to reuse in other projects.  
It consists of a telemetry server (WebSocket) and a desktop app built with **React + Vite + Electron**.

> Note: this repository contains the client (overlay). The iFuel telemetry server must be running at `ws://localhost:7071/ifuel`.

***

## Features

- Compact fuel widget with dark UI and monospace typography.
- Main data:
  - Current fuel, fuel time, and estimated laps remaining.
  - Fuel per lap: `FUEL LAST`, `FUEL AVG`, 2/5/10-lap rolling averages.
  - Estimated **refuel needed** (`EST REFUEL`) for lap- or time-based sessions.
- Session info:
  - Laps remaining or time remaining (`SESSION`).
  - Air and track temperature.
- Lap info:
  - Lap number, lap time, and fuel used on the current lap.
  - Fuel delta vs. average (green/red).
- Strategy:
  - Earliest lap where you can pit and still reach the end (`EARLY PIT`).
  - Minimum number of fuel stops (`STOPS`).
  - Target laps for each stint (`STINTS`).
- Mini charts:
  - Fuel history for the last 5 laps.
  - Fuel histogram for the last 30 laps.
- Integrated settings panel:
  - `Min lap time (s)` – filter very slow laps (pit, spins, etc.).
  - `Min fuel / lap` – filter unrealistic fuel usage.
  - `Safety laps` – extra safety laps for refuel calculation.
  - Average selection (`AVG 2/5/10`).
- Movable overlay inside the window:
  - **Lock** button 🔒/🔓 to lock/unlock widget movement.
  - ⚙ settings panel with `localStorage` persistence.
- Performance-oriented:
  - UI update throttling (~20 Hz).
  - Uses `React.memo`, `useMemo`, and `useCallback` to reduce re-renders.
  - Fuel/strategy calculations kept outside the render tree where possible.

***

## Architecture

- **Frontend**: React + TypeScript + Vite.
- **Desktop wrapper**: Electron (transparent or normal window).
- **Communication**: WebSocket to `ws://localhost:7071/ifuel`.
- **Telemetry state**:
  - `useIfuelWebSocket` hook:
    - Connects to the WS server.
    - Accumulates lap history (`LapSample`).
    - Computes fuel averages, refuel estimates, strategy and chart data.
    - Applies state throttling so React doesn’t re-render at every telemetry tick.
  - `FuelWidgetContainer`:
    - Reads/saves options in `localStorage` (`ifuel-settings-v1`).
    - Manages overlay drag and lock state.
    - Builds labels like `sessionLabel`.
    - Renders `FuelWidget` and the settings panel.

***

## Requirements

- Node.js (LTS recommended).
- npm or yarn.
- iRacing running on the same machine.
- iFuel telemetry server listening at `ws://localhost:7071/ifuel` (not included in this repo).

***

## Installation & Running

1. Clone the repository:

```bash
git clone https://github.com/empg80/iFuel.git
cd iFuel
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Run in development mode:

```bash
npm run dev
```

4. Run the Electron wrapper (if configured):

```bash
npm run electron
```

Make sure the telemetry server is running and sending data to `ws://localhost:7071/ifuel`.  
Otherwise, the overlay will display “Waiting for iRacing data…”.

***

## Basic Usage

- Launch the iFuel app.
- Start iRacing and go on track.
- Tune the ⚙ settings panel:
  - Set `Min lap time` according to the track (e.g. 20–30 s for short ovals, 60–120 s for road courses).
  - Adjust `Min fuel / lap` and `Safety laps` to your preference.
- Unlock the 🔓 lock button to move the widget inside the window, then lock it 🔒 once it’s in place.

***

## Development

Common scripts:

```bash
# Start dev server
npm run dev

# Lint / build (depending on your setup)
npm run lint
npm run build
```

Key files:

- `src/useIfuelWebSocket.ts` – telemetry reading, averages, strategy and throttling.
- `src/components/FuelWidget.tsx` – fuel overlay UI.
- `src/components/FuelWidgetContainer.tsx` – WebSocket, settings, drag, lock and prop wiring.

***

## Roadmap / Future ideas

- Add a **time delta overlay** (ahead/behind) similar to a relative timing bar.
- Support multiple settings profiles per car/track.
- Export the telemetry hook as a small standalone library.
- Better Electron integration (always-on-top, optional click-through, etc.).

***

## License

TBD.  
For now, consider it for personal / non-commercial use.
