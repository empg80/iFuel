"""Genera los audios del spotter (voces neuronales Piper) en public/voices/<voz>/ + manifest.json.

Uso: python3 tools/gen_voices.py <id> <ruta/modelo.onnx> [speaker_id]
  p. ej.  python3 tools/gen_voices.py claude /tmp/v/claude/.../es_MX-claude-high.onnx
Necesita: pip install piper-tts soundfile numpy num2words
Si cambias las frases por defecto (src/spotter/phrases.ts), actualiza CHUNKS y vuelve a generar.
"""
import json, sys, os, wave, io, re
import numpy as np, soundfile as sf
from num2words import num2words
from piper import PiperVoice, SynthesisConfig

# Trozos fijos de las frases por defecto (sin huecos {clase} {numero} {metros}), ya normalizados
# (minúsculas, sin signos de puntuación). La clave es lo que se busca en el texto que hay que decir.
CHUNKS = [
    "izquierda", "derecha", "tres en línea", "dos a la izquierda", "dos a la derecha", "libre",
    "por detrás número", "clase rápida por detrás número",
    "debris", "coche parado", "amarilla", "bandera amarilla", "a", "metros",
    "combustible crítico", "ventana de parada abierta", "entra a boxes esta vuelta", "box", "box esta vuelta",
    "última vuelta", "bandera a cuadros", "spotter activo", "por detrás", "detrás", "número", "clase rápida",
]
# Nombre de clase (normalizado: mayúsculas, sin espacios) -> cómo se pronuncia
CLASSES = {
    "LMP2": "ele eme pe dos", "LMP3": "ele eme pe tres", "GT3": "ye te tres", "GT4": "ye te cuatro",
    "GTE": "ye te e", "GTP": "ye te pe", "GTD": "ye te de", "TCR": "te ce erre", "HYPERCAR": "jáipercar",
    "LMDH": "ele eme de hache", "GTE": "ye te e", "P217": "pe dos diecisiete", "DPI": "de pe i",
    "MX5": "eme equis cinco", "GR86": "ye erre ochenta y seis", "BMWM2": "be eme uve eme dos",
}
NUMS = list(range(0, 200)) + list(range(200, 3001, 50))

voice_id, model = sys.argv[1], sys.argv[2]
sid = int(sys.argv[3]) if len(sys.argv) > 3 else None
v = PiperVoice.load(model)
cfg = SynthesisConfig(speaker_id=sid, length_scale=0.9)
out = os.path.join(os.path.dirname(__file__), "..", "public", "voices", voice_id)
os.makedirs(out, exist_ok=True)

def synth(text):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        v.synthesize_wav(text, w, syn_config=cfg)
    buf.seek(0)
    data, sr = sf.read(buf, dtype="float32")
    # recorta silencios de los extremos (menos latencia) y deja 20 ms de margen
    idx = np.where(np.abs(data) > 0.012)[0]
    if len(idx):
        pad = int(sr * 0.02)
        data = data[max(0, idx[0] - pad): idx[-1] + pad]
    return data, sr

def write(name, text):
    data, sr = synth(text)
    sf.write(os.path.join(out, name + ".ogg"), data, sr, format="OGG", subtype="VORBIS")

manifest = {"voice": voice_id, "chunks": {}, "classes": {}, "nums": {}}
for i, c in enumerate(CHUNKS):
    write(f"c{i}", c); manifest["chunks"][c] = f"c{i}.ogg"
for k, spoken in CLASSES.items():
    name = "k_" + re.sub(r"\W", "", k.lower()); write(name, spoken); manifest["classes"][k] = name + ".ogg"
for n in NUMS:
    write(f"n{n}", num2words(n, lang="es")); manifest["nums"][str(n)] = f"n{n}.ogg"
mdir = os.path.join(os.path.dirname(__file__), "..", "src", "spotter", "voices")
os.makedirs(mdir, exist_ok=True)
json.dump(manifest, open(os.path.join(mdir, voice_id + ".json"), "w"), ensure_ascii=False, indent=0)
print(voice_id, "listo:", len(CHUNKS) + len(CLASSES) + len(NUMS), "clips")
