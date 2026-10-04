/**
 * Real on-device LLM inference via llama.rn (llama.cpp).
 *
 * This is the genuine offline engine: it loads a GGUF model file selected by
 * the user from device storage and runs token generation natively.
 * CPU inference is used for maximum device compatibility.
 */
import { initLlama, releaseAllLlama, type LlamaContext } from 'llama.rn';

let llamaContext: LlamaContext | null = null;
let loadedModelPath: string | null = null;
let loadPromise: Promise<void> | null = null;
// H16: per-path load locks — a second loadLlamaModel(X) while the first is in
// flight waits for the same promise instead of racing it.
const loadLocks = new Map<string, Promise<void>>();

export function isLlamaModelReady(): boolean {
  return llamaContext !== null;
}

export function getLoadedModelPath(): string | null {
  return loadedModelPath;
}

export async function loadLlamaModel(
  modelPath: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Returns the path that is actually loaded when this call resolves — callers
  // that raced with a different-path load MUST compare the result.
  if (llamaContext && loadedModelPath === modelPath) return modelPath;
  // H16: concurrent loads for the same path share one promise; a different
  // path waits for the in-flight load to settle first (serialized).
  const inFlight = loadLocks.get(modelPath);
  if (inFlight) {
    await inFlight;
    return loadedModelPath || modelPath;
  }
  if (loadPromise) {
    await loadPromise;
    if (llamaContext && loadedModelPath === modelPath) return;
  }
  const run = (async () => {
    await unloadLlamaModel();
    const ctx = await initLlama(
      {
        model: modelPath,
        n_ctx: 2048,
        n_gpu_layers: 0, // CPU-only: works on every device, no GPU driver surprises
        use_mlock: false,
      },
      onProgress
    );
    llamaContext = ctx;
    loadedModelPath = modelPath;
  })();
  loadPromise = run;
  loadLocks.set(modelPath, run);
  try {
    await run;
  } finally {
    loadPromise = null;
    loadLocks.delete(modelPath);
  }
  return loadedModelPath || modelPath;
}

export async function unloadLlamaModel(): Promise<void> {
  if (llamaContext) {
    try {
      await llamaContext.release();
    } catch {
      /* already released */
    }
    llamaContext = null;
    loadedModelPath = null;
  }
  try {
    await releaseAllLlama();
  } catch {
    /* nothing to release */
  }
}

/**
 * Generate a reply with the loaded model. Tokens stream via onToken.
 * Returns the full generated text.
 */
export async function llamaGenerate(
  prompt: string,
  onToken?: (token: string) => void,
  timeoutMs: number = 60000
): Promise<string> {
  if (!llamaContext) {
    throw new Error('No offline model is loaded. Select a GGUF model file first.');
  }
  // H15: a hung inference must not hang the caller forever.
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Offline model timed out. Try a shorter prompt.')), timeoutMs)
  );
  const result = await Promise.race([
    llamaContext.completion(
      {
        messages: [
          {
            role: 'system',
            content:
              'You are NIA, a helpful student assistant inside the NEXA college app. Answer clearly and concisely. Keep answers short unless the user asks for detail.',
          },
          { role: 'user', content: prompt },
        ],
        n_predict: 256,
        temperature: 0.7,
      },
      (data) => {
        if (data && typeof data.token === 'string' && data.token) {
          onToken?.(data.token);
        }
      }
    ),
    timeout,
  ]);
  return (result?.text || '').trim();
}
