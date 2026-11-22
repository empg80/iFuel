// Hilo aparte: analizar un .ibt grande no debe bloquear el servidor de telemetría (que vive en el mismo proceso).
import { parentPort, workerData } from "node:worker_threads";
import { analyzeIbt } from "./ibtAnalyzer.mjs";

try {
  parentPort.postMessage({ ok: true, result: analyzeIbt(workerData.path) });
} catch (err) {
  parentPort.postMessage({ ok: false, error: String(err?.message ?? err) });
}
