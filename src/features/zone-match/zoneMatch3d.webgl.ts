import { useSyncExternalStore } from 'react';

let webglSupport: boolean | null = null;

/**
 * One throwaway context, released at once: can this browser run the 3D views? The bundled Three.js renderer needs
 * WebGL 2, so a WebGL 1-only browser gets the 2D fallbacks instead of a canvas that fails to start.
 */
function detectWebGL(): boolean {
  if (webglSupport === null) {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      webglSupport = gl !== null;
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

const noSubscribe = () => () => {};

/** null while server-rendering / hydrating, then whether this browser can do WebGL. */
export const useWebGL = () => useSyncExternalStore(noSubscribe, detectWebGL, () => null);
