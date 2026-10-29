# iFuel — hoja de ruta

Actualizada: 2026-10-29 · Versión de referencia: 0.1.0-beta.8 · Rama de trabajo: `claude/fase-5-grafico`

Fuentes: análisis de competencia (RaceLab, iOverlay, irDashies, Track Impulse, Edge, Kapps, iRon; octubre 2026), pruebas reales de Kike con las betas 1 a 8 y sus ideas propias.

## 1. Visión

**Diferenciador del proyecto: "pit window clear air".** Cuando se abre la ventana de parada y la lucha en pista dificulta decidir, iFuel debe decir **cuándo entrar a boxes para salir con aire limpio** (sin tráfico o con el menos posible) y seguir rodando rápido. Ninguna de las apps comparadas anuncia algo equivalente. Todo lo demás (combustible, relative, standings, banderas) es la base que lo sostiene.

Principios:
- Lo importante se ve de un vistazo y no roba la atención del simulador.
- Cada cálculo se valida con datos reales grabados antes de darlo por bueno.
- Nada se presenta como probado si no se ha probado (Windows e iRacing reales los prueba Kike).
- iRacing es el único simulador objetivo; sin carreras mixtas por ahora.

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
| V4 | Tabla de estados de bandera: verificar con grabaciones qué bits activa iRacing en práctica, carrera y safety car | Documentado en `docs/` con ejemplos |

### P1 — El diferenciador: pit clear air v2
| Id | Qué | Esfuerzo | Hecho cuando |
| --- | --- | --- | --- |
| C1 | Modelar rivales que paran en la misma ventana (quién lleva más vueltas de stint y combustible aproximado) | M | Test con escenario de varios rivales que entran |
| C2 | Ventana de parada derivada del combustible real y, en carreras, de la regla de la serie (no ±5 vueltas fijas) | M | La ventana coincide con la autonomía calculada |
| C3 | Distinguir rivales más rápidos y más lentos que tú, y si tendrías que adelantarlos | M | La puntuación pondera el ritmo, con test |
| C4 | Tiempo de repostaje: pérdida de parada según litros a poner (no solo la última parada) | S | La pérdida cambia con los litros previstos |
| C5 | Instrucción única y grande: "BOX AHORA: aire limpio" / "ESPERA N vueltas: pasas de X coches a Y" | S | Probado en carrera real por Kike |
| C6 | Umbrales configurables (segundos de aire limpio, margen de combustible) | S | Se ajustan en ajustes |
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
Reparto de combustible entre compañeros, layouts compartidos en comunidad, VR, tráfico multiclase (Kike no corre carreras mixtas), otros simuladores, bot de Twitch.

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
