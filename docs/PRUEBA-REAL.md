# Prueba real con iRacing (desde el código)

> ¿Solo quieres probar la beta ya compilada? Usa `docs/PRUEBA-BETA.txt` (viene dentro del zip de la release): sin Node ni npm, y el informe se genera solo al cerrar.

Guía para probar iFuel con el simulador y recoger los datos que hacen falta para revisarlo.
Tiempo total: ~45 min (A: 5 · B: 25 · C: 15).

## 0. Preparación (una vez)

```powershell
git fetch
git checkout claude/fase-4-overlay
npm install
npm install --prefix iFuel-telemetry-node
npm test            # debe terminar sin fallos
```

- Si `npm install` falla compilando `irsdk-node`, guarda el error completo (hace falta Visual Studio Build Tools).
- **iRacing debe ir en modo Ventana o Ventana sin bordes.** Un overlay no puede dibujarse sobre el modo
  de pantalla completa exclusiva (limitación de Windows, no de iFuel).

## Atajos y bandeja (el overlay no tiene barra de título ni menú)

| Acción | Cómo |
|---|---|
| Bloquear / desbloquear widgets (click-through / modo edición) | **Ctrl+Shift+L** |
| Ocultar / mostrar el overlay | **Ctrl+Shift+H** |
| Menú completo (layout, tamaños, monitor, diagnóstico, salir) | clic derecho en el icono de iFuel de la bandeja |
| Salida de emergencia (ventana normal) | `npx cross-env IFUEL_WINDOWED=1 npm run dev` |

En modo edición se ve un marco rojo y el cartel **EDIT MODE**: ahí la ventana captura el ratón.

## A. Overlay sin simulador (5 min)

`npm run dev`, y abre el Bloc de notas o el navegador:

1. Se ve el cartel de estado del servidor encima de todo, sin marco de ventana.
2. Con widgets **bloqueados** puedes escribir y hacer clic en el Bloc de notas "a través" de iFuel,
   y el Bloc de notas **no pierde el foco**.
3. **Ctrl+Shift+L**: marco rojo; arrastra un widget; **Ctrl+Shift+L** otra vez y vuelve el click-through.
4. **Ctrl+Shift+H** oculta y muestra. Cambia de monitor desde la bandeja si tienes varios.

## B. Sesión con iRacing (25 min)

Práctica o Test Drive, con `npm run dev` abierto **antes o después** de iRacing (da igual).

1. Bandeja → **Diagnostics → Start recording session**.
2. Con el coche en boxes: **Diagnostics → Save SDK snapshot** (nº 1). Anota la capacidad del depósito
   que muestra iRacing en el garaje (L) y el límite de combustible de la serie, si lo hay.
3. Sal a pista y da **5 vueltas limpias**. Anota el consumo por vuelta que indique iRacing o tu dash.
4. Entra a boxes, **repostando**, y sal. Mira si cuenta 1 parada y si el stint empieza de cero.
5. Da 2–3 vueltas más. Con el overlay encima comprueba: se ve sobre el sim, los clics y el teclado
   siguen llegando al sim, y el sim no parpadea ni pierde el foco.
6. Abre un **replay** 1–2 minutos con iFuel en marcha: no debe medir vueltas.
7. **Cierra iRacing y vuelve a abrirlo sin cerrar iFuel**: debe recuperar los datos solo.
   (Opcional: si ves una **bandera amarilla con un coche parado**, anota qué muestra el aviso.)
8. **Diagnostics → Save SDK snapshot** (nº 2, con sesión en marcha) y **Stop recording session**.
9. Sal de iFuel desde la bandeja (**Quit iFuel**).

## C. Instalador (15 min)

`npm run dist` e instala el `.exe` de `dist/electron`. Comprueba que **no sale en blanco**, que aparece el
icono en la bandeja y que el overlay se comporta como en A. Si sale en blanco, arráncalo con
`--windowed` y guarda el log.

## Qué enviar

Bandeja → **Diagnostics → Open data folder**. De ahí:

| Archivo | Para qué |
|---|---|
| `logs\ifuel.log` (y `ifuel.log.old` si existe) | errores, reconexiones, arranque |
| `diagnostics\ifuel-*.jsonl.gz` | la sesión grabada (~4 mensajes/s); permite reproducir los cálculos offline |
| `diagnostics\ifuel-sdk-snapshot-*.json` (los dos) | datos crudos del SDK: capacidad, unidades, EstTime... |
| `overlay-state.json` | tu configuración |

Más: una **captura del overlay sobre iRacing** (bloqueado y en modo edición) y tus **notas** (coche, pista,
tipo de sesión, hora/vuelta de cada evento, consumo por vuelta de iRacing, y lo que hayas visto raro).

Privacidad: el volcado del SDK no incluye nombres de pilotos; la grabación sí lleva los nombres y números
de los coches de la sesión (datos que ya ve cualquiera en iRacing). Revísala si prefieres no compartirla.
