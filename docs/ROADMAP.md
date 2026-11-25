# iFuel — hoja de ruta

Actualizada: 2026-10-29 (informe beta.10 aplicado) · Versión de referencia: 0.1.0-beta.11 · Rama de trabajo: `claude/fase-5-grafico`

Fuentes: análisis de competencia (RaceLab, iOverlay, irDashies, Track Impulse, Edge, Kapps, iRon; octubre 2026), pruebas reales de Kike con las betas 1 a 8 y sus ideas propias.

## 1. Visión

**Diferenciador del proyecto: "pit window clear air".** Cuando se abre la ventana de parada y la lucha en pista dificulta decidir, iFuel debe decir **cuándo entrar a boxes para salir con aire limpio** (sin tráfico o con el menos posible) y seguir rodando rápido. Ninguna de las apps comparadas anuncia algo equivalente. Todo lo demás (combustible, relative, standings, banderas) es la base que lo sostiene.

Principios:
- Lo importante se ve de un vistazo y no roba la atención del simulador.
- Cada cálculo se valida con datos reales grabados antes de darlo por bueno.
- Nada se presenta como probado si no se ha probado (Windows e iRacing reales los prueba Kike).
- iRacing es el único simulador objetivo. Las carreras multiclase forman parte del alcance (ver P3b).

## 2. Estado actual (beta.8)

Hecho y probado con tests automáticos (38 + 67): combustible y plan de repostaje (carreras por vueltas y por tiempo), relative con `CarIdxEstTime`, standings con huecos al líder, paradas y stints, bandera amarilla/debris con distancia y tiempo, pit clear air con pérdida de parada medida, vista replay, informe beta (grabación + diagnóstico + zip al cerrar), layout libre con posiciones acotadas.

Pendiente de validar en iRacing real (lo prueba Kike): standings y relative visibles tras la beta.8, banderas con trompo/debris delante, pit clear air con tráfico y una parada, cierre con informe tras cerrar iRacing.

## 3. Prioridades

Esfuerzo: S = menos de un día, M = unos días, L = más de una semana. Cada punto tiene su criterio de "hecho".

### P0 — Validar lo entregado (siempre primero)
| Id | Qué | Hecho cuando |
| --- | --- | --- |
| V1 | Revisar el informe de la prueba de la beta.8: posiciones de widgets, banderas, pit clear air | Kike confirma que se ven y el informe no muestra errores |
| V2 | Examinar `relativeOnTrack` con `lapsDiff -5` y huecos de -41,6 s / 21,4 s frente a `CarIdxEstTime` | Explicado o corregido con test |
| V3 | Comparar el consumo por vuelta grabado con el que calcula la app | Diferencia dentro de tolerancia o corregida |
| V5 | Conseguir una grabación de una carrera **multiclase** real (la del 28-10 tenía una sola clase) para validar todo lo de P3b | Informe de Kike con 2 o más clases en pista |
| V4 | Tabla de estados de bandera: verificar con grabaciones qué bits activa iRacing en práctica, carrera y safety car | Documentado en `docs/` con ejemplos |

### Resultado de la prueba beta.9 (Le Mans, multiclase, 30-10)
Hecho en beta.10: leyenda de clases y nombre de categoría en insignias (M4 parcial), relative de ancho fijo, tipografía mayor, standings sin barra de desplazamiento y fila propia destacada, aviso de debris/amarilla que se apaga al pasar el incidente y que compara con la velocidad típica de cada zona (antes una horquilla lenta contaba como incidente), pérdida de parada solo en paradas reales (antes medía el reaparecer en boxes: 13 s falsos). El informe graba ahora los coches en pista (`cars`), lo que permite validar los avisos y es la base de K1.
Pendiente de validar: metros y segundos del aviso de debris con un coche parado real; pérdida de parada y ventana en una parada real de carrera.

### Resultado de la prueba beta.10 (Le Mans, 30-10)
Hecho en beta.11: icono y datos de versión del .exe (parcheados con `resedit` en afterPack, sin wine), plan de combustible único en el servidor (`fuelPlan`: litros, paradas, ventana; el widget de combustible y el pit clear air usan la misma cifra), consumo medido rodando para cuando aún no hay vueltas válidas, reloj de sesión grande, standings recortado (10 primeros por clase + 3 delante y 3 detrás).
Pendiente de validar: litros y ventana en una parada de carrera por tiempo y por vueltas; regla de la serie (paradas obligatorias) sigue pendiente en C2.

### P1 — El diferenciador: pit clear air v2
| Id | Qué | Esfuerzo | Hecho cuando |
| --- | --- | --- | --- |
| C1 | Modelar rivales que paran en la misma ventana (quién lleva más vueltas de stint y combustible aproximado) | M | Test con escenario de varios rivales que entran |
| C2 | Ventana de parada derivada del combustible real y, en carreras, de la regla de la serie (no ±5 vueltas fijas) | M | **Hecho en beta.9 (servidor, `pitWindow.mjs`)**; falta validar en iRacing. Pendiente la regla de la serie |
| C3 | Distinguir rivales más rápidos y más lentos que tú, y si tendrías que adelantarlos; en multiclase, ver M2 | M | **Hecho en beta.16 (`pitClearAir.mjs`: más rápidos que te alcanzan y más lentos que adelantarás pesan 0,5)**; falta validar en iRacing |
| C4 | Tiempo de repostaje: pérdida de parada según litros a poner (no solo la última parada) | S | **Hecho en beta.9 (`pitLoss.lossFor`)**; falta validar con dos paradas reales |
| C5 | Instrucción única y grande: "BOX AHORA: aire limpio" / "ESPERA N vueltas: pasas de X coches a Y" | S | **Hecho en beta.16 (nuevo widget: frase grande + barra de salida + barras de vueltas)**; falta probar en carrera real |
| C6 | Umbrales configurables (segundos de aire limpio, margen de combustible) | S | **Parcial en beta.16: margen de combustible ajustable (±0,5 vueltas) en el panel de ajustes**; **completo en beta.38: segundos de aire limpio ajustables (1-10 s)** |
| C7 | Validar el modelo contra grabaciones con paradas y tráfico real | M | Informe de aciertos del modelo |

### P2 — Experiencia y distribución (lo que impide competir hoy)
| Id | Qué | Esfuerzo |
| --- | --- | --- |
| E1 | Ventana de ajustes única (visibilidad, escala, opacidad, unidades, columnas) | M |
| E2 | Perfiles automáticos por tipo de sesión (práctica, clasificación, carrera) y por coche, con layout guardado | M |
| E3 | Instalador, actualización automática y firma de código (SmartScreen) | L |
| E4 | Licencia del proyecto y CI (comprobaciones automáticas en cada cambio) | S |
| E5 | Exportar e importar layouts | S |

### P3 — Vistas nuevas (ideas de Kike)
| Id | Qué | Esfuerzo | Notas |
| --- | --- | --- | --- |
| K1 | **Widget circular de pista con sectores y coches** | M | Ver detalle abajo |
| K2 | **Vista pitboard compacta** | M | Ver detalle abajo |

**K1 — Widget circular de pista**
- Anillo que representa la vuelta: el jugador, los demás coches como puntos coloreados por clase (el tuyo resaltado), y los coches en boxes en el interior.
- Segmentación por sectores usando `SplitTimeInfo.Sectors` (`SectorStartPct`) del YAML de sesión; resaltar el sector con bandera amarilla o incidente, y el sector donde se abre la ventana de parada.
- Datos: el servidor ya lee `CarIdxLapDistPct`, `CarIdxClass` y `CarIdxTrackSurface`; hay que añadir una lista compacta de coches al mensaje (número, %, clase, en box).
- Usos que lo conectan con el diferenciador: ver de un vistazo el tráfico antes de tu salida de boxes y dónde queda tu punto de salida.
- Versión posterior: trazado real aprendido de tus coordenadas en una vuelta (Lat/Lon del jugador); sin eso, el anillo no representa la forma de la pista.
- Hecho cuando: escena de preview, test de la proyección de % a ángulo y prueba real de Kike con 20 coches.

**K2 — Pitboard compacto**
- Pensado para un segundo monitor pequeño (el de Kike es 1280×800) y para ver todo sin mover los ojos.
- Rejilla más densa: combustible y plan de repostaje, instrucción de pit clear air, standings acotados (tu posición ± N coches), relative, banderas y el widget circular.
- Tamaños de texto legibles a ese tamaño y modo "mínimo" con lo esencial.
- Hecho cuando: capturas a 1280×800 sin solapes y prueba real.

### P3b — Carreras multiclase
Hoy ya hay colores e insignias por clase y posición de clase en relative y standings. Falta lo que más cambia la carrera de un multiclase: el tráfico de otras clases.

| Id | Qué | Esfuerzo | Hecho cuando |
| --- | --- | --- | --- |
| M1 | **Aviso de tráfico más rápido por detrás**: clase superior que se acerca, con distancia, tiempo estimado de alcance y color de su clase. Lo calculan `CarIdxClass`, tiempos de vuelta por clase y el ritmo de cierre; con umbral configurable | M | Test con un escenario de alcance y prueba real |
| M2 | **Pit clear air consciente de clases**: los coches de clases más rápidas te alcanzarán tras salir de boxes y los de clases más lentas son tráfico que tendrás que adelantar; la puntuación los pondera distinto | M | **Hecho en beta.16 con test de 2 clases (junto a C3)**; falta validar con grabación multiclase |
| M3 | **Standings por clase**: vista agrupada o filtrada por clase, posición y hueco al líder de tu clase, vueltas perdidas respecto al líder general | M | Escena de preview y prueba real |
| M4 | **Relative multiclase**: tintar las filas por clase (más rápida o más lenta), mostrar vueltas de diferencia fiables (depende de V2) | S | Test del cálculo de vueltas |
| M5 | **Fin de carrera y combustible en multiclase**: vueltas hasta meta por clase (cada clase termina al cruzar la meta tras el líder general); revisar el plan de repostaje por tiempo | M | Test con escenarios de carrera por tiempo |
| M6 | Widget circular (K1) con los coches coloreados por clase y los de clase más rápida marcados cuando se acercan | S | Parte de K1 |
| M7 | Banderas azules y avisos de vuelta doblada (N7) | S | V4 |

### P4 — Catálogo nuevo, por impacto/esfuerzo
| Id | Qué | Esfuerzo | Dependencia |
| --- | --- | --- | --- |
| N1 | Delta contra tu mejor vuelta (canales `LapDeltaTo…` de iRacing) | S | — |
| N2 | Ayuda de pit: límite de velocidad y entrada, con los datos de la sesión | S/M | — |
| N3 | Fuentes de navegador (cada widget con URL para OBS, tablet o segundo monitor) | S/M | Servidor WebSocket existente |
| N4 | Inputs: traza de acelerador, freno y volante | M | Muestreo más rápido (T1) |
| N5 | Radar de proximidad | L | T1, T2 |
| N6 | Mapa de pista real | L | K1 versión posterior |
| N7 | Banderas roja, azul, blanca y de cuadros en el widget | S | V4 |
| N8 | Standings en carrera: cambio de posiciones desde la parrilla, iRating/licencia opcionales, ocultar coches parados en boxes | S/M | — |
| N9 | Nombre del equipo y piloto que conduce de verdad en carreras por equipos | S | — |

### P5 — Más adelante / solo si hace falta
Reparto de combustible entre compañeros, layouts compartidos en comunidad, VR, otros simuladores, bot de Twitch.

## 4. Deuda técnica

| Id | Qué |
| --- | --- |
| T1 | Muestreo más rápido (60 Hz) solo para los widgets que lo necesiten (inputs, radar), manteniendo el resto en 4 Hz |
| T2 | Servidor de telemetría en un proceso aparte del overlay (`utilityProcess`) |
| T3 | Tests de extremo a extremo con grabaciones reales como entrada (reproducir una sesión grabada y comprobar la salida) |
| T4 | Eliminar `console.log` ruidosos y centralizar el registro |
| T5 | Documentar el protocolo WebSocket (formato de los mensajes) |

## 5. Proceso para cada funcionalidad

1. Test automático de la lógica en módulo puro.
2. Validación con grabación real cuando exista (script de reproducción en el scratchpad o en `docs/`).
3. Escena de preview y captura para revisar el diseño.
4. Versión beta con guía de prueba actualizada (`docs/PRUEBA-BETA.txt`).
5. Prueba real de Kike → informe → corrección.
6. Anotar el resultado aquí (marcar hecho / pendiente).

Restricciones conocidas: la sesión de trabajo no puede crear tags ni releases en GitHub (los crea Kike a mano), no se puede probar en Windows ni con iRacing, y el instalador NSIS necesita Windows o wine.

## 6. Seguridad y cuentas

El token de GitHub compartido en la conversación debe revocarse cuando termine el trabajo. No se escribe en ficheros ni en la configuración de git.


## Resultado de la prueba beta.11 (entregado en beta.12)
- Reloj de sesión movido a Standings; jugador siempre presente en standings (playerCarNumber); fallback de vuelta con DriverCarEstLapTime; MIN_LAPS 0.25; widget de banderas rediseñado.
- Pendiente de validar: ausencia en standings tras incidente (no reproducible desde la grabación).


## Resultado de la prueba beta.14 (entregado en beta.15/16)
- Tras llegar el reloj a 0, iRacing devolvía un valor raro y el plan pedía parada: corregido (beta.15). Sin plan en replay.
- El margen de combustible no era configurable (panel vacío, fijo 1 vuelta): selector añadido (beta.16).
- Standings en práctica/qualy muestra tiempo y vueltas restantes (beta.16).
- Pit Clear Air con el diseño aprobado (beta.16) y puntuación multiclase (C3+M2).
- Siguiente: C1 (rivales que paran en la misma ventana), M1 (aviso de clase más rápida por detrás), regla de la serie en C2.


## beta.18
- M3 (standings por clase) hecho: separadores de clase con color, POS y CLS; falta validar con una sesión multiclase real.
- Debris con memoria del punto de incidente y límite de 3 km; Pit Clear Air sin desbordes; vueltas de qualy en grande.


## Resultado de la prueba beta.18 (entregado en beta.19)
- Hungaroring (Porsche Cup, 15 vueltas, sin parada) correcto. Monza (BMW M8 GTE, carrera por tiempo): parada vuelta 15->16 (+24,9 L, plan 24,5 L).
- Fallo: ritmo de referencia = última vuelta (138,9 s con boxes vs ~110 s reales) -> ~2 vueltas de menos; corregido con mediana de vueltas limpias.
- Fallo: al agotarse el reloj faltaba la vuelta extra si el líder cruza después; corregido (`timedLaps`).
- Pit clear air: pasos filtrados por hueco en el depósito (`pitPasses.mjs`).


## Estado a beta.28 (2026-11-09)
Hecho desde beta.19 y validado por Kike en iRacing: K1 (anillo de pista con sectores y coches), K2 (pitboard DNR 1280x800), N1 (delta), N4 (traza acelerador/freno), neumáticos (último dato de boxes), ajustes del coche (BIAS/TC/ABS), M3 (standings por clase con GAP al de delante), fix de arranque (variables del SDK ausentes en el coche), fix de fin de carrera por tiempo y por vueltas (beta.24, 26, 27).
Hecho en beta.28, pendiente de validar en carrera multiclase: **M1** aviso de clase más rápida que te alcanza por detrás (`fastTraffic.mjs`, banner con color de clase, en free y pitboard).
Siguiente propuesto: C1 (rivales que paran en tu ventana), regla de la serie en C2, C6 (segundos de aire limpio), M4 (relative tintado por clase), M5 (final por clase), N3 (widgets como fuente de navegador para OBS), E3 (instalador y firma).

> beta.33: spotter con voces naturales pregrabadas (Claude MX / Dave ES) + fallback a voz del sistema.

> Tras beta.36: pitboard v2 (franja de avisos, plan de parada, radar grande) y fuente Barlow en el pitboard. En el árbol (sin beta aún): el battle nuevo también en el layout libre. Pendiente: aplicar lo que salga del report de la 36; C1, regla de la serie (C2), C6, M4, M5, N3, E3.

> Beta.38: layout libre con los datos del pitboard (widgets Driver, Weather, Tyres/car), clic en Fuel alterna compacto/completo, C6 completo. Pendiente: C1, regla de la serie (C2), M4, M5, N3, E3.

## Hecho en beta.39 (anotado tras beta.38)
- Botón o widget en el layout libre para pasar al pitboard (desde el pitboard ya es fácil volver al libre; al revés hoy hay que ir por el menú).
- Recordar posición, tamaño y monitor de la ventana del pitboard entre aperturas (ahora hay que moverla cada vez al monitor de arriba).
- Beta.39 incluye ademas un boton para bloquear/desbloquear los widgets del layout libre.

## Anotado tras beta.43 (para mañana)
- **Clima con pronóstico**: la blackbox "Weather" de iRacing muestra una previsión cada 15 min (cielo, temperatura, % lluvia, humedad, viento con dirección). Investigar si el SDK/sesión (YAML WeekendInfo, telemetría) expone esa previsión; si sí, usarla en el widget del clima (tira de iconos por franja) y en el spotter (aviso de lluvia anticipado). Si no, valorar leerla de la blackbox o seguir con tendencia medida.
- **Repaso de optimización y de funciones de los widgets**: medir consumo de CPU/RAM del overlay (renderizados a 4 Hz, grabación de diagnóstico, voces precargadas), revisar qué widgets aportan y cuáles sobran, y limpiar código sin uso (TrackInfo, DriverFocus, WeatherStrip si queda sin usar).
- Plan: beta de mañana con lo que entre; Kike la prueba el fin de semana y manda reportes.
- **Replay → libre**: al pasar al layout replay y volver al libre aparecen todos los widgets y movidos de sitio. Revisar al entrar en el layout replay (posiblemente visibilidad/posiciones que se pisan o se reinician al recrear la ventana; las posiciones están en localStorage `ifuel-pos-*` y la visibilidad en overlay-state.json).
- **Release**: si las pruebas del fin de semana van bien, lanzar la release (versión estable, sin "beta") y actualizar el README antes: funciones actuales (layouts libre/pitboard/replay, widgets nuevos, spotter con voces, banderas, clima, historial por circuito), instalación/uso, capturas y requisitos. Revisar también el changelog y las notas de la release.

## Proyecto aparte: analizador de vueltas desde .ibt (decidido: opción 1)
- iRacing graba la telemetría a 60 Hz en `Documentos\iRacing\telemetry\*.ibt` (hay que activar la grabación en iRacing). iFuel no graba nada extra: lee esos archivos después.
- Leer .ibt (cabecera + canales: Speed, Throttle, Brake, SteeringWheelAngle, Gear, RPM, LapDistPct, LatAccel, LongAccel, Lat/Lon) y separar por vueltas.
- Informe: pérdida por sectores/mini-sectores, frenada (punto, presión, longitud), velocidad mínima y salida de curva, trazada, acelerador y volante, consistencia entre vueltas, y las 3-5 curvas donde más tiempo se pierde.
- Comparar la mejor vuelta contra la media (o contra una vuelta de referencia) y proponer qué cambiar; sin pretender un modelo físico del coche.
- Decidir después de la release: ¿pestaña dentro de iFuel o herramienta separada? Avisar en la UI de que el .ibt hay que activarlo en iRacing.
- Hecho en beta.47: `trackHistory.json` incluido en el informe beta.

## Standings: neumático, parada y stint por piloto (pedido 14-nov) — HECHO en beta.47, pendiente validar en iRacing
- Mostrar en la tabla (pitboard y libre) el neumático que lleva cada piloto: iRacing lo expone por coche en `CarIdxTireCompound` (comprobar que lo entrega el SDK/irsdk-node y añadirlo a TELEMETRY_VARS y a las filas de standings).
- Parada en boxes: duración de la última parada y número de paradas (ya llegan `lastPitDurationSeconds` y `pitStops`; el libre ya enseña pit y stint, revisar que sea visible y claro también en el pitboard).
- Vueltas de stint (`stintLapCount`): ya está en los datos; mostrarlo con claridad.
- Diseño: icono/inicial del compuesto con color, y valores compactos para no apretar el nombre del piloto.

## Neumáticos: colores por compuesto y cobertura (pedido 16-nov)
- Dar un color a cada tipo de neumático en la columna TYRE (p. ej. Wet azul, Hard blanco, Medium amarillo, Soft rojo, Inter verde).
- Revisar si todos los coches muestran el dato: Kike cree que algún coche no lo mostraba (el 15-nov). Comprobar en el informe de esta noche qué valor trae `CarIdxTireCompound` por coche (-1 / sin dato) y mostrar un fallback claro.

## Widget "Dashboard de volante" (pedido 16-nov)
- Widget tipo dash de volante para los coches que lo llevan integrado (LMP2, GTP, etc.): barra de LEDs de RPM, marcha y velocidad grandes, posición/vuelta, combustible, delta, última/mejor vuelta, temperatura de neumáticos y ajustes (BIAS, TC1, TC2, ABS, mapa).
- Mockup v3 (muy compacto 680x262, celdas sin huecos, marcha central, franja inferior con ajustes, híbrido y pedales) en el artefacto "iFuel · Widget Dashboard de volante" (copia en docs/mockups/dashboard-volante-v3.dc.html). Aprobado por Kike el 16-nov. Pendiente: elegir qué datos del SDK usar (Gear, Speed, RPM, shift LEDs) y si va en layout libre, pitboard o ambos.

## Widgets en el layout pitboard (pedido 16-nov)
- Viable: el pitboard es una rejilla fija de 1280x800, así que se puede (a) permitir sustituir/añadir paneles de la rejilla (p. ej. el dashboard en el hueco de abajo) o (b) abrir widgets flotantes encima, reutilizando FloatingWidget del layout libre (posición y escala guardadas).
- Decidir: panel sustituible (más limpio, rejilla fija) o flotante (más flexible, puede tapar datos). Recomendación inicial: flotantes opcionales, desactivados por defecto, con el botón de bloqueo ya existente.

## RUTA A LA RELEASE (acordada 16-nov)
Todo el roadmap entra antes de la release y no se añade nada nuevo hasta terminarlo. Orden propuesto (lo que depende de las pruebas de Kike primero):
1. Beta.48: informe de esta noche (spotter, multiclase, cobertura de neumáticos), colores por compuesto y fallback sin dato.
2. Validar en iRacing: standings con neumático/stint/parada, M1 (clase rápida), M2 (pit clear air multiclase), huecos multiclase.
3. Clima con pronóstico (investigar si el SDK lo expone).
4. (El bug replay → libre pasa al final, antes del repaso de optimización: decisión de Kike 21-nov.)
5. Widget Dashboard de volante (mockup v3 aprobado) y widgets flotantes en el pitboard.
6. Funciones propuestas pendientes: C1 (rivales que paran en tu ventana), C2 (regla de la serie), M4 (relative tintado por clase), M5 (final por clase), N3 (widgets como fuente de navegador para OBS), E3 (instalador y firma).
7. Analizador de vueltas desde .ibt.
8. Repaso de optimización (CPU/RAM) y limpieza de código sin uso, con todo ya dentro.
9. README (funciones, layouts, instalación, capturas, requisitos), changelog y notas de la release.
10. Release estable `v0.1.0` (sin beta).

## Clima con pronóstico: investigación inicial (16-nov)
- La nota original es la de "Anotado tras beta.43" (blackbox Weather con previsión cada 15 min). No hay más debate guardado de esa conversación.
- Foro SimHub (abr-2024): iRacing "no publica ese dato vía API/SDK" en sim; el SDK solo da el estado actual (pista mojada, etc.). Pendiente confirmar si cambió con las actualizaciones recientes.
- La Data API online de iRacing (OAuth, aparte del SDK en sim) sí tiene un pronóstico condensado por sesión (tiempo, temp. aire, % precipitación, cobertura de nubes, humedad, viento). Requiere login del usuario: valorar si compensa.
- Siguiente paso: grabar `WeekendInfo` y variables de clima en una sesión con lluvia prevista y comprobar qué llega; si no hay nada, opciones: (a) tendencia medida (lo actual), (b) Data API con login, (c) leer la blackbox por OCR (descartado salvo que no haya otra).

## Validación punto 2 con el informe de la carrera multiclase 2h40 (beta.43, 14-nov) — anotado 16-nov
- M1 (aviso de clase rápida): VALIDADO con datos. 43 episodios de la clase GTP acercándose (29 doblando, 14 no), ninguno >2 min; bit de bandera azul de iRacing en ~6,6 min; aviso a tiempo (p. ej. rápido a 4,8 s, alcance estimado 54 s). La sensación de uso (si molestó) la confirma Kike.
- M2 (pit clear air multiclase): VALIDADO con datos. Recomienda vuelta, alternativas con puntuación de tráfico, coche más cercano y pérdida (32 s); consumo 3,13 L/vuelta e historial coherentes. Falta saber si Kike siguió la recomendación en boxes.
- Huecos multiclase: arreglados en beta.46 (tests); pendiente verlos en pista (el informe es de la beta.43).
- Neumáticos: la beta.43 no registraba CarIdxTireCompound; comprobar cobertura con el informe de la beta.47.

## Dashboard de volante: diseño elegido v4 "Estratégico" (aprobado 16-nov, noche)
- Sustituye al v3 como diseño objetivo (640x300, sin huecos). Copia: docs/mockups/dashboard-volante-v4-estrategico.dc.html (el v3 queda como alternativa).
- Novedades: cinta de carrera (una celda por vuelta con tráfico al salir de boxes, ventana de parada, vuelta BOX recomendada y fin del combustible), anillo de marcha (RPM fuera, delta dentro), escalera de tráfico por clases con aviso del coche más rápido, modos RACE/QUALI/PIT (QUALI oculta el delta), neumáticos con compuesto en color, temperatura y desgaste.
- Datos que ya tenemos: pitClearAir (opciones por vuelta), fuelPlan, fastTraffic, standings/relative, CarIdxTireCompound. A comprobar en SDK: Gear, Speed, RPM, luces de cambio, SoC/híbrido, desgaste de neumático.

## Planificador de stints para carreras endurance (pedido 19-nov)
- Herramienta para planificar una carrera endurance antes de salir y recalcular durante ella: a partir del ritmo (tiempo por vuelta) y del consumo (litros/vuelta) calcula cuántas vueltas/minutos dura cada stint y cuántas paradas hacen falta.
- Entradas: duración de la carrera (tiempo o vueltas), capacidad del depósito, tiempo por vuelta (limpio y con tráfico), consumo L/vuelta (normal y ahorrando), pérdida en boxes (entrada + repostaje + salida), margen de seguridad (la hoja de ruta ya usa 1 vuelta en carreras por tiempo).
- Salida: tabla de stints (vuelta/hora de inicio y fin, litros a repostar, hora de parada), número mínimo de paradas, alternativas (parar antes/después, stint largo vs. corto) y tiempo total estimado.
- Extras a valorar: cambio de piloto (tiempos mínimos de parada, máximo de tiempo al volante por piloto), neumáticos/desgaste, amarillas (vueltas neutralizadas que alargan el stint) y reajuste en directo con el consumo y el ritmo reales.
- Reutilizar lo que ya existe: `fuelPlan`, `trackHistory.json` (consumo y mejor vuelta por circuito), `pitClearAir` (qué vuelta de parada deja aire limpio).
- Dónde vive: por decidir (pestaña/ventana propia en iFuel antes de la carrera, y vista resumida en el pitboard durante la carrera).
- Orden en la ruta a la release: junto al analizador de vueltas .ibt (apartado 7).

## Referencia: Pi Toolbox + ONE TIMING (Cosworth/PACETEQ, 19-nov-2026)
- Plugin de pago (£5/mes o £50/año sobre Pi Toolbox Plus) con cronometraje en vivo de toda la parrilla para iRacing, para analizar junto a la telemetría propia. Fuente: https://www.iracing.com/pi-toolbox-meets-one-timing-what-you-get-in-iracing-and-how-to-save-20-this-black-friday/
- Incluye: standings con posición general/clase, huecos, intervalos, tiempos por sector, velocidad punta, compuesto, stints y paradas; "Circle of Doom" (posición de cada coche en la vuelta medida en tiempo: aire limpio, quién se reincorpora tras parar); canales por coche, lap chart, Pi Math; sesiones guardadas.
- Diferencia con iFuel: iFuel es un overlay en directo y gratuito; esto es análisis con licencia. Ya cubrimos standings con neumático/stint/parada y clear air.
- Ideas a valorar (sin añadir al alcance de la release por ahora): tiempos por sector de rivales en los standings; vista tipo "Circle of Doom" (posiciones relativas en tiempo) que encajaría con el anillo de pista y la escalera de tráfico del dashboard v4; guardar el cronometraje en la grabación para el analizador .ibt.

## Informe beta.47 (Monza, GT4 multi-sesión, 147 min) — revisado 21-nov
- Sin errores en el log; arranque y cierre limpios, informe con trackHistory.json correcto (Monza/Mercedes AMG GT4: 2.78 L/vuelta, 57 muestras).
- Neumáticos: el dato llega por coche (CarIdxTireCompound + DriverTires, solo compuesto "Hard" en esta serie). Sin dato en ~9% de las filas de carrera, y son coches fuera de pista (desconectados/sin salir: sin mejor vuelta, stint 0, última posición), no un fallo del overlay. Beta.48: guion gris "–" cuando no hay dato. Colores por compuesto ya incluidos desde beta.47.
- Stint y duración de parada: llegan y se muestran (p. ej. paradas de ~62-64 s).
- Spotter: 98 cambios de carLeftRight en 147 min, 45 episodios de coche al lado, con 2 (izq.) y 3 (der.) dominantes, duraciones normales; ~8 de 45 duran <0,6 s (parpadeos). Los datos de entrada son limpios; si el "errático" persiste, mirar el filtrado de parpadeos y las frases, no la lectura del SDK.

## Confirmación de Kike sobre la beta.47 (21-nov)
- No vio nada raro durante la carrera de Monza (GT4); por eso las NOTAS.txt iban vacías. Con el informe sin errores, quedan VALIDADOS en pista: standings con neumático, stint y duración de parada, y el spotter sin fallos apreciables en esa sesión.
- Beta.48 (guion en neumático sin dato) pendiente de probar.

## Beta.49 (21-nov)
- Clima: `_weather` cada minuto en la grabación y `weather` en el volcado del SDK (WeekendInfo/WeekendOptions + variables de telemetría). Pendiente: revisar con un informe de una sesión con clima cambiante si hay previsión.
- Widgets flotantes en el pitboard (Driver, Weather, Tyres/car), opcionales y apagados por defecto; candado propio. Fuel y Relative flotantes quedan fuera de esta primera versión (tienen su propia posición en el layout libre).
- M4: tarjetas del relative con degradado del color de clase.

## Decisiones de Kike 21-nov (noche)
- E3 (instalador y firma): descartado el certificado de firma de pago. Se mantiene el zip portable; opcional más adelante un instalador sin firmar y avisar en el README del aviso de SmartScreen de Windows.
- M4 hecho en beta.49. Siguiente beta (beta.50): C1, M5 y N3 (widgets como fuente de navegador para OBS, pensados para el layout libre). C2 espera a que Kike diga qué regla de la serie quiere.

## C2 · Regla de la serie: investigación (21-nov)
- Fuentes: iRacing "Team Driving" (https://support.iracing.com/support/solutions/articles/31000133594-team-driving), reglamentos IMSA (p. ej. parada cronometrada 2'30" en Endurance Challenge con cambio de piloto/repostaje, https://imsa.results.alkamelcloud.com/ ... AEC driver briefing) y reglas de ligas (paradas obligatorias, límite de stint, tiempo mínimo).
- iRacing, común a todas las sesiones por equipos: Fair Share (cada piloto debe hacer 1/4 de su parte igual de vueltas; casi siempre activa en oficiales) y cambio de piloto solo en el box con temporizador de 30 s desde que el coche se detiene. iRacing ya muestra n/r(R) por piloto en Entries y un indicador "DC" en el relative.
- Reglas propias de cada serie o liga (paradas obligatorias, tiempo mínimo de parada, máximo de tiempo al volante, juegos de neumáticos limitados): varían y no se ha confirmado que el SDK las exponga.
- Propuesta: panel "Reglas de la carrera" configurable por el usuario (pestaña/ventana de ajustes, guardado por serie): paradas obligatorias (nº) y su progreso, tiempo mínimo de parada con cuenta atrás en boxes, máximo de stint (min o vueltas) con aviso, vueltas mínimas por piloto (fair share) con aviso. Alimenta el planificador de stints y los avisos del pitboard/spotter.
- Automático desde iRacing donde se pueda: temporizador de 30 s del cambio de piloto y fair share (a comprobar en telemetría/YAML).

## C2 · Alcance decidido (21-nov, tras respuesta de Kike)
- Uso real: carreras por equipos de 3-4 pilotos y, sobre todo, endurances cortas en solitario. No hace falta un sistema complejo por series.
- Versión ligera: panel pequeño de "Reglas de la carrera" con paradas obligatorias (nº y progreso), tiempo mínimo de parada (cuenta atrás en boxes) y máximo de stint (aviso). Se guarda por última configuración usada.
- Solo en sesiones por equipos: mostrar el estado de Fair Share y el temporizador de 30 s del cambio de piloto si la telemetría los trae; si no, quedan como nota informativa (iRacing ya los muestra).
- Sin planificador por series ni lista de reglas preconfiguradas.

## Hecho en beta.50 (21-nov)
- C1: rivales que paran en tu ventana (`rivalStops.mjs`, línea en el plan de parada del pitboard). Estimación con su último stint o la mediana de su clase.
- M5: dato "Final" (líder general, clase, vuelta extra) a partir del cálculo existente (`finishInfo`).
- C2-light: panel "Reglas de la carrera" (paradas obligatorias, tiempo mínimo en boxes, stint máximo), configurable y guardado. Fair Share y temporizador de 30 s no se muestran (iRacing ya los enseña).
- N3: el servidor sirve la app en http://127.0.0.1:7071 y la ruta `#/obs/<widget>` pinta un solo widget con fondo transparente para fuentes de navegador de OBS.
- Pendiente de validar en carrera: ventana de rivales, vuelta extra en multiclase, contador de boxes y OBS real.

## Dashboard de volante: implementado (21-nov, sin beta todavía)
- Servidor: `carData.dash` con Gear, RPM, ShiftIndicatorPct, SoC (EnergyERSBatteryPct), MGU-K (modo, regen) y régimen de luces (idle/first/shift/last/blink/redline del YAML); `speedMs` ahora llega al cliente.
- Cliente: `DashboardWidget.tsx` (v4 640x300: marcha con arco de RPM y delta, combustible, neumáticos, escalera de tráfico, cinta de carrera, ajustes y SoC si hay híbrido). Modelo puro en `utils/dashModel.ts`.
- Dónde se activa: bandeja "Show Steering-wheel dashboard" (layout libre) y "Pitboard: show Steering-wheel dashboard"; tamaño en "Dashboard size"; fuente OBS `#/obs/dash`.
- Pendiente de validar en iRacing: marcha/RPM/luces en un coche con luces (GTP/LMP2) y SoC en híbridos; modo QUALI (no hay tipo de sesión en el payload) y MAP (muestra el modo MGU-K o el freno motor, según coche).

## Cambios del 21-nov (noche, sin beta)
- Pitboard: eliminados los tres "Pitboard: show..." (y el del dashboard) y el candado de widgets flotantes, porque no podían salir de la ventana. En su lugar, selector de vista abajo a la izquierda: Estrategia (la de siempre) / Dashboard (escalado al hueco) / Planificador. Se recuerda la vista.
- Planificador de stints (`utils/stintPlan.ts` + `StintPlannerCard`): duración, depósito, ritmo, consumo, pérdida en boxes y margen; valores automáticos desde telemetría y los que se tocan se recuerdan ("auto" los restaura). Pendiente: cambios de piloto, amarillas y vista resumida en carrera.
- Meteo (informe beta.50, Monza 105 min): sesión seca, precipitación 0, TrackWetness 0/1 y cielo 1; no hay previsión en el SDK. La lluvia sigue sin validar: hace falta una sesión con lluvia.

## Posiciones en vivo (22-nov, sin beta)
- Servidor: `livePositions.mjs` reordena la clasificación por progreso en pista (vuelta + %) solo en carrera en marcha; `position` pasa a ser la en vivo y `officialPosition` la oficial de iRacing. Histéresis de ~3 m para duelos rueda con rueda, tolerancia al desfase de 1 vuelta al cruzar meta, y coches sin dato conservan su puesto.
- Cliente: la posición de clase del relative sigue el orden en vivo; el standings anima los cambios de fila (deslizamiento) y destella verde/rojo al ganar/perder posición.
- Validar en carrera: que los adelantamientos se vean al momento y que no haya parpadeos en duelos ni saltos al cruzar meta o en boxes.

## Notas de pruebas de beta.52 (22-nov, Silverstone multiclase, GTP) - HECHO en beta.53 salvo el punto 5 (bajón a ~13 coches tras la salida) y validar en iRacing el bit del limitador; meteo: TrackWetness 0 ya se trata como seco (sin cambios)
1. Dashboard de volante: poca fluidez al subir RPM (datos a ~4 Hz). Interpolar en el cliente entre muestras (o subir la frecuencia de ese dato).
2. Dashboard: indicar si el limitador de pits está activo. `EngineWarnings` (bit del limitador) ya llega al servidor (`engineWarnings`), falta mandarlo al dashboard como aviso "LIM" y comprobar el bit en un coche real.
3. Spotter repite "ventana de parada abierta" tras repostar (vueltas 15-18 del informe): `windowStatus` oscila window/no-stop ~25 veces. Causa: en `timedLaps` (fuelPlan.mjs) la vuelta extra se decide con `tMine < tLeader - 0.01`, un filo con el líder de otra clase y el reloj casi agotado; `remainingLaps` alterna 8,1 y 9,1 y con 28,1 L y 3,21 L/v la necesidad salta de 0 a 1,8 L. Arreglo previsto: histéresis en la vuelta extra, que el spotter exija que la ventana se mantenga unos segundos y avise una sola vez por parada. También hace parpadear el plan en el pitboard.
4. Standings en vivo: ~10 % de los cambios de posición son rebotes A-B-A (268 de 2.700 en la sesión); afinar la histéresis.
5. Parrilla: CORREGIDO mi análisis inicial. El informe trae 3 subsesiones (práctica, Lone Qualify y carrera); los snapshots posteriores sí traen `QualifyResultsInfo` (34 resultados) y los de la carrera. La formación mostró los 34 coches (aparecen según cargan). Queda por validar que el orden coincide con la parrilla y NUEVO: al pasar de formación a salida, el standings baja de 34 a ~13 coches durante ~40 s hasta que iRacing rellena `CarIdxPosition`; mantener el orden de parrilla hasta que haya posiciones para todos. Aclaración de Kike: el standings se fue llenando según los coches pasaban a pista (esperado) y el coche que entra y sale (33-34) fue una desconexión al empezar la vuelta de formación (esperado). Sigue sin explicar el bajón a ~13 coches justo tras la salida: revisar si son coches aún en boxes/sin posición oficial.
6. `playerCarNumber` 99 → 29: NO es un fallo; el informe abarca 3 subsesiones distintas (otro coche/dorsal en las dos primeras). La carrera fue con el Dallara P217 (LMP2) dorsal 29, P18-19, en multiclase con GTP e IMSA23.
7. overlay-state.json conserva claves antiguas (`pbDriverVisible`, `pbWeatherVisible`, `pbCarVisible`): limpiar al cargar.

## Notas de pruebas de beta.56 (22-nov) - PENDIENTE (solo anotado)
1. Validado por Kike en iRacing: km/h del dashboard, aviso LIMITADOR y pit helper movible. Queda por validar la salida a OBS.
2. Opción de edición de widgets "solo visibles / mostrar todos": al desbloquear (Ctrl+Shift+L) poder elegir entre ver únicamente los widgets activos para moverlos, o mostrar todos los existentes (también los que solo aparecen por evento, como el banner de banderas o el pit helper) para colocarlos aunque no estén activos. Ahora cada widget gestiona su propio marcador; unificarlo en una opción del menú de bandeja.

## Notas de pruebas de beta.58 (22-nov, noche) - HECHO en beta.59 (pendiente validar)
1. Widgets de OBS sin el estilo del layout libre (Combustible/Clasificación): faltaba la clase `app-root--free` en la raíz de OBS.
2. Mostrar/ocultar overlay en libre no volvía a mostrar: ahora opacidad 0 en vez de hide()/show().
3. Plan de carrera: "V31.78… meta" con decimales; ahora entero.
4. Planificador: pérdida en boxes automática desde la medida de la sesión.

## Analizador .ibt: primera versión en beta.61 (23-nov) - pendiente validar
- Hecho: lector .ibt (`iFuel-telemetry-node/ibt/ibtReader.mjs`), análisis (`ibtAnalyzer.mjs`, en un worker para no bloquear el servidor) y pestaña Análisis en el pitboard. Probado con los .ibt de Monza (Ligier P320) y Silverstone (P217).
- Método: vueltas por cruce de línea (LapLastLapTime de iRacing llega con retraso y no se usa), rejilla de 5 m, curvas = mínimos de velocidad de la mejor vuelta (fusiona chicanes), pérdida por curva = tiempo acumulado en la zona desde su frenada hasta la siguiente.
- Pendiente: probar con sesiones largas (5+ vueltas limpias), ajustar detección de curvas rápidas sin frenada, comparar contra una vuelta de referencia elegida (otra sesión), y exportar el informe.

## Preparado para la beta.62 (23-nov) - sin empaquetar, pendiente de validar
- Edición de widgets: opción "Al desbloquear, mostrar también widgets de evento" (menú Pantalla y posición, activa por defecto). Pit helper y tráfico rápido son ahora arrastrables y con marcador discontinuo; posiciones guardadas.
- Planificador de stints, extras: nº de pilotos con rotación, tiempo extra por cambio de piloto, máximo al volante por stint y por piloto (con aviso), % de carrera bajo amarilla (menos consumo y ritmo más lento), vista "Ahora" en carrera (stint actual, vueltas hasta la parada, repostaje, piloto actual y siguiente). El servidor envía `raceRunning`.
- Pendiente de la lista: parrilla tras la salida (esperar otro informe con ese momento), bug replay → layout libre, optimización, README, release.
- Análisis .ibt (23-nov, tras el .ibt largo de Monza GT4: 317 MB, 287k registros, 37 vueltas limpias, análisis en 0,6 s): frenada con huecos tolerados (la T1 salía con 5 m), frenada de chicane hasta 250 m del vértice, vuelta ideal y potencial por curva, evolución de la sesión y consumo por vuelta.

## Layout de replay estilo TV (23-nov) - hecho en beta.62, pendiente validar con un replay
- Tres widgets (src/components/ReplayBroadcast.tsx, src/styles/replay-broadcast.css): torre con hueco de logo y tiempo/vueltas, circuito con hueco de trazado y hora del simulador, coche en pantalla. Tipografia Barlow Condensed, paleta tinta/cian/violeta.
- Servidor: `cameraDriver` ahora trae rpm, marcha, velocidad derivada (avance de LapDistPct / SessionTime, suavizada), neumatico y pit; payload con sessionTimeOfDay, sessionTimeTotal, sessionLapsTotal, sessionElapsed, sessionName, sessionType.
- Limites del SDK en replay: sin acelerador/freno de otros coches; km/h aproximada.
- Huecos transparentes (logo/trazado) para poner la imagen en OBS. Guias de huecos y nombre de serie: localStorage `ifuel-replay-guides`=1 y `ifuel-replay-series`; pendiente exponerlos en el menu de bandeja.

## Torre del replay por fases (23-nov noche) - hecho en beta.63, pendiente validar
- src/utils/towerPhases.ts (con test): fases General + una por categoria; hueco y posicion dentro de la clase; fase del coche en pantalla 1,5x. Clase unica: 20 coches; mas de 20: 3 fijos + scroll suave.

## Tarjeta del piloto en replay (24-nov) - beta.64
- Sin marcha/RPM; con mejor vuelta, ultima vuelta, neumatico y paradas en boxes (`cameraDriver.lastLapSeconds`, `pitStops` de standings).
- Bug (24-nov): la ventana de replay quedaba abierta al salir y al cambiar de layout; ahora se cierra (beta.64). Idea de Kike: mas disenos y paletas para el layout de replay (ver conversacion; pendiente de mockup).

## Replay: diseños, paletas e infografia (24-nov) - beta.65, pendiente validar
- 3 diseños (tv, ribbon, pylon) y 6 paletas; ajustes en overlayState (replayDesign/Palette/GapMode/Guides/PhaseS) enviados tambien a la ventana de replay; color propio en replay-colores.json; parametros por URL para OBS.
- Torre: cambios de posicion, neumatico, PIT, VR, intervalo; tarjeta: batalla con delante/detras. Tests: replayData.test.mjs, towerPhases.test.mjs (test/_tsLoad.mjs empaqueta TS con esbuild).

## Beta.66 - seguridad y optimizacion
- IPC solo desde la app (isTrustedSender), navegacion/ventanas bloqueadas, permisos denegados, Host + cabeceras en el servidor estatico, limites .ibt (tamano, worker 1.5 GB/10 min), fuses de Electron, npm audit fix (electron 40.10.6).
- Pendiente: Electron 40 tiene avisos que solo se cierran en >=42 (probar en beta aparte); vulnerabilidades restantes son de dependencias de desarrollo.
- Nota privacidad: el informe beta puede incluir rutas de Windows en los logs.
- Optimizacion: contrapresion WS (1 MB por cliente), retirados widgets antiguos del replay, medidas: bundle JS 374 KB, payload ~10 KB a 4 Hz.

## Beta.67 - layouts y monitores
- Hecho: aviso en la ventana principal en modo replay; persistPosition (no se guarda la posicion recortada al cargar); standings con ancho fijo; geometria de ventana por layout (window-bounds.json por layout, monitor por defecto distinto del overlay); capturas reales recortadas (docs/screenshots/real-*) y demo (docs/demo-payload.json).
- Pendiente README: redactarlo con las capturas de docs/screenshots.

## Hacia beta.68 (sin empaquetar)
- Nombres de piloto en formato "N. Apellido" en standings, relative, battle y replay (utils/driverName.ts; quita el sufijo numérico de iRacing).
- Docs: hero.png (mosaico Racing Day) y replay-designs.png en docs/screenshots.
