// engine/runtime/engine.mjs — ES Module wrapper
// engine.js (regular script) sets window.OpenSee → re-export from here

const OE = () => window.OpenSee;

export const init       = (...a) => OE().init(...a);
export const sha256Hex  = (...a) => OE().sha256Hex(...a);
export const xorshift32 = (...a) => OE().xorshift32(...a);
export const hexToUint32 = (...a) => OE().hexToUint32(...a);
export const randomYao  = (...a) => OE().randomYao(...a);
export const yaosToHexagramId = (...a) => OE().yaosToHexagramId(...a);
export const generateHexagramResult = (...a) => OE().generateHexagramResult(...a);
export const loadHexagram  = (...a) => OE().loadHexagram(...a);
export const buildSalt     = (...a) => OE().buildSalt(...a);
export const buildSeed     = (...a) => OE().buildSeed(...a);
export const selectVersion = (...a) => OE().selectVersion(...a);
export const getVersionOrder = (...a) => OE().getVersionOrder(...a);
