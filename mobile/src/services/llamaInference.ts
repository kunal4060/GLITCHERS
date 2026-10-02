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

export function isLlamaModelReady(): boolean {
  return llamaContext !== null;
}

export function getLoadedModelPath(): string | null {
  return loadedModelPath;
}

export async function loadLlamaModel(
  modelPath: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (llamaContext && loadedModelPath === modelPath) return;
  if (loadPromise) {
    await loadPromise;
    if (llamaContext && loadedModelPath === modelPath) return;
  }
  loadPromise = (async () => {
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
  try {
    await loadPromise;
  } finally {
    loadPromise = null;
  }
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
  onToken?: (token: string) => void
): Promise<string> {
  if (!llamaContext) {
    throw new Error('No offline model is loaded. Select a GGUF model file first.');
  }
  const result = await llamaContext.completion(
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
  );
  return (result?.text || '').trim();
}
