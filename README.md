# iFuel – iRacing Fuel Overlay (React + Electron)

iFuel is a **fuel and strategy overlay** for iRacing, designed to be lightweight, clear, and easy to reuse in other projects.  
It consists of a telemetry server (WebSocket) and a desktop app built with **React + Vite + Electron**.

> Note: this repository contains the client (overlay). The iFuel telemetry server must be running at `ws://localhost:7071/ifuel`.

***

## Features

### Fuel & strategy

- Compact fuel widget with dark UI and monospace typography.
- Main data:
  - Current fuel, fuel time, and estimated laps remaining.
  - Fuel per lap: `FUEL LAST`, `FUEL AVG`, 2/5/10‑lap rolling averages.
  - Estimated **refuel needed** (`EST REFUEL`) for lap‑ or time‑based sessions.
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
  - Widgets can be dragged to custom positions and locked in place.
  - All user settings are persisted via `localStorage`.
- Performance‑oriented:
  - UI update throttling (~20 Hz).
  - Uses `React.memo`, `useMemo`, and `useCallback` to reduce re‑renders.
  - Fuel/strategy calculations kept outside the render tree where possible.

### Multiclass Relative & Standing Battle

iFuel includes a **multiclass‑relative overlay** focused on class battles and on‑track traffic.

#### Standing Battle

The *Standing Battle* widget shows:

- Your current position **within class** (e.g. P4 in GT3).
- The car directly ahead and behind in your class.
- Time gap to each car, last lap, best lap, and lap‑time delta vs your last lap.
- Class position badge next to each car number (e.g. `P2`, `P5`), color‑coded by class.
- A compact, fuel‑style layout with aligned columns for BEHIND / YOU / AHEAD and their lap times.

Class colors are assigned and reused across sessions: iFuel inspects the car classes on the grid, maps each `classId` to a color index, and persists this mapping so categories keep a consistent color over time.

#### On‑Track Relative

Below the standing battle, the overlay adds an *On‑Track Relative* row:

- Shows the physically closest car ahead and behind on track, regardless of class.
- Displays the time gap in seconds and the lap difference (same lap, lapped, or lapping you).
- Uses the same class color badges as the standing battle, so you can immediately see which category each car belongs to.

This widget is driven by the same WebSocket telemetry server as the fuel calculator, so it updates smoothly in real time while keeping CPU usage low.

### Yellow Flag widget

iFuel provides a dedicated **Yellow Flag widget** which is always visible:

- Shows a **green flag** when the track is clear.
- Shows a **solid yellow flag** for standard cautions.
- Shows a **yellow flag with red stripes** for debris / surface warnings.
- When a clear incident car can be identified:
  - Displays approximate **distance (m)** and **time (s)** to the incident.
  - Shows the incident car number and its class position, with class color badge.

### Pit Clear Air widget (experimental)

An experimental **Pit Clear Air** widget helps you choose cleaner pit windows:

- Uses your current stint pace, your pit delta and a configurable pit window.
- Simulates where you would rejoin the track for each candidate lap.
- Scores traffic density around the projected pit exit and suggests:
  - One **recommended lap**.
  - A small list of alternative laps with their relative “traffic score”.

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
    - Applies state throttling so React doesn’t re‑render at every telemetry tick.
  - Widget containers:
    - Read/save options in `localStorage`.
    - Manage overlay drag and lock state.
    - Wire telemetry state into the individual widgets (Fuel, Relative, Yellow, Pit Clear Air).

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
Install dependencies:

bash
npm install
# or
yarn install
Run in development mode:

bash
npm run dev
Run the Electron wrapper (if configured):

bash
npm run electron
Make sure the telemetry server is running and sending data to ws://localhost:7071/ifuel.
Otherwise, the overlay will display “Waiting for iRacing data…”.

Basic Usage
Launch the iFuel app.

Start iRacing and go on track.

Configure the settings panel in the fuel widget:

Set Min lap time according to the track (e.g. 20–30 s for short ovals, 60–120 s for road courses).

Adjust Min fuel / lap and Safety laps to your preference.

Unlock widget movement, drag the widgets to your preferred positions, then lock them again once they are in place.

Development
Common scripts:

bash
# Start dev server
npm run dev

# Lint / build (depending on your setup)
npm run lint
npm run build
Key files:

src/useIfuelWebSocket.ts – telemetry reading, averages, strategy and throttling.

src/components/FuelWidget.tsx – fuel overlay UI.

src/components/FuelWidgetContainer.tsx – WebSocket, settings, drag, lock and prop wiring.

src/components/RelativeWidget.tsx / container – multiclass relative and on‑track view.

src/components/YellowFlagWidget.tsx / container – global yellow / debris status.

src/components/PitClearAirWidget.tsx / container – pit clear air suggestions.

Roadmap / Future ideas
Move widget visibility and lock/unlock controls into the Electron window menu and remove in‑widget toggles.

Add a dedicated time delta overlay (ahead/behind) similar to a relative timing bar.

Support multiple settings profiles per car/track.

Export the telemetry hook as a small standalone library.

Better Electron integration (always‑on‑top, optional click‑through, etc.).

License
TBD.
For now, consider it for personal / non‑commercial use.
