/* A tiny check that the page can use before it loads the 3D code: can this browser draw 3D at all? */
export function supportsWebGL(): boolean {
  try {
    if (typeof window === 'undefined' || typeof (window as unknown as { WebGLRenderingContext?: unknown }).WebGLRenderingContext === 'undefined') return false;
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

/** A stand-in for the graphics card that a test can install (the real game never sets it). */
type RendererFactory = (canvas: HTMLCanvasElement) => never;
let testFactory: RendererFactory | null = null;
export const setTestRendererFactory = (f: RendererFactory | null): void => { testFactory = f; };
export const getTestRendererFactory = (): RendererFactory | null => testFactory;
