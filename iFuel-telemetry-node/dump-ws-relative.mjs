import WebSocket from "ws";

const WS_URL = "ws://127.0.0.1:7071/ifuel";

const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("Conectado a iFuel WS");
});

const seenClasses = new Map();

ws.on("message", (data) => {
  try {
    const msg = JSON.parse(data.toString());

    const rel = msg.relative ?? null;
    const rt = msg.relativeOnTrack ?? null;

    // NUEVO: bloques de debug de cámara que envíe el servidor
    const debugCamera = msg.debugCamera ?? null;
    const cameraCarNumber = msg.cameraCarNumber ?? null;

    // 1) dump normal
    console.log("---- TICK ----");
    console.log("myPosition:", rel?.myPosition);
    console.log("ahead:", rel?.ahead);
    console.log("behind:", rel?.behind);
    console.log("onTrackAhead:", rt?.ahead);
    console.log("onTrackBehind:", rt?.behind);

    // 1.b) dump de cámara (para comparar con telemetry-debug)
    if (debugCamera) {
      console.log("debugCamera:", debugCamera);
      // esperado: { camCarIdx, cameraCarNumber, camPos, camDistPct }
    }
    if (cameraCarNumber != null) {
      console.log("cameraCarNumber (overlay):", cameraCarNumber);
    }

    // 2) recopilar clases vistas en ahead/behind + onTrack
    const candidates = [
      rel?.ahead,
      rel?.behind,
      rt?.ahead,
      rt?.behind,
    ].filter(Boolean);

    for (const c of candidates) {
      const classId = c.classId ?? null;
      const classPos = c.classPosition ?? null;
      const carNum = c.carNum ?? null;
      if (classId == null) continue;

      if (!seenClasses.has(classId)) {
        seenClasses.set(classId, { cars: new Set(), positions: new Set() });
      }
      const info = seenClasses.get(classId);
      if (carNum != null) info.cars.add(String(carNum));
      if (classPos != null) info.positions.add(classPos);
    }

    // 3) tras unos ticks, imprimir y salir (para no spamear)
    if (seenClasses.size >= 2) {
      console.log("=== CLASS MAP (WS) ===");
      for (const [classId, info] of seenClasses.entries()) {
        console.log(
          `classId=${classId} cars=[${[...info.cars].join(
            ", ",
          )}] positions=[${[...info.positions].join(", ")}]`,
        );
      }
      console.log("=== END CLASS MAP ===");
      // opcional: cerrar una vez tenemos el mapa
      // ws.close();
    }
  } catch (e) {
    console.error("Error parseando WS:", e);
  }
});
