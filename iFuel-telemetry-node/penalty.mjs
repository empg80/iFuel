// Sanciones visibles por coche a partir de CarIdxSessionFlags (irsdk_Flags).
// black 0x10000 (bandera negra: drive-through / stop&go), disqualify 0x20000,
// furled 0x80000 (negra y blanca: aviso/ir más lento), repair 0x100000 (bandera naranja/meatball: reparar).
export function penaltyFromFlags(bits) {
  const b = Number(bits) || 0;
  if (b & 0x20000) return "dq";
  if (b & 0x10000) return "black";
  if (b & 0x100000) return "repair";
  if (b & 0x80000) return "warn";
  return null;
}
