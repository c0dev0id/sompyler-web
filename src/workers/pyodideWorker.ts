/**
 * Pyodide Web Worker — runs the Python sompyler engine in a browser context.
 *
 * Protocol (all messages are structured-clone transfers):
 *   Main → Worker: { type: 'init', pythonCoreUrl: string }
 *   Main → Worker: { type: 'render', id: string, spliYaml: string,
 *                    freqHz: number, durationS: number, stress: number }
 *   Worker → Main: { type: 'ready' }
 *   Worker → Main: { type: 'init_error', error: string }
 *   Worker → Main: { type: 'result', id: string, pcm: Float32Array, sampleRate: number }
 *   Worker → Main: { type: 'error', id: string, error: string }
 */

const PYODIDE_VERSION = '0.27.5'
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`
const SAMPLING_RATE = 44100

interface PyodideInterface {
  loadPackage(pkgs: string[]): Promise<void>
  runPythonAsync(code: string): Promise<unknown>
  globals: { set(key: string, value: unknown): void }
  FS: {
    mkdir(path: string): void
    writeFile(path: string, data: string, opts: { encoding: string }): void
  }
}

// Loaded once, reused for every render job.
let pyodide: PyodideInterface | null = null
let renderNoteCode = ''

async function initPyodide(pythonCoreUrl: string): Promise<void> {
  const { loadPyodide } = await import(/* @vite-ignore */ `${PYODIDE_CDN}pyodide.mjs`) as {
    loadPyodide: (opts: { indexURL: string }) => Promise<PyodideInterface>
  }
  pyodide = await loadPyodide({ indexURL: PYODIDE_CDN })
  await pyodide!.loadPackage(['numpy', 'pyyaml'])

  // Fetch the manifest listing all Python source files to mount.
  const manifestRes = await fetch(`${pythonCoreUrl}manifest.json`)
  if (!manifestRes.ok) throw new Error(`manifest.json fetch failed: ${manifestRes.status}`)
  const { files } = (await manifestRes.json()) as { files: string[] }

  const pyFS = pyodide!.FS

  // Create root directory for the Python core.
  try { pyFS.mkdir('/python-core') } catch { /* already exists */ }

  // Write every file from the manifest into the Pyodide virtual FS.
  for (const relPath of files) {
    const res = await fetch(`${pythonCoreUrl}${relPath}`)
    if (!res.ok) throw new Error(`Failed to fetch python-core/${relPath}: ${res.status}`)
    const text = await res.text()
    const fullPath = `/python-core/${relPath}`

    // Ensure all parent directories exist.
    let dir = '/python-core'
    for (const segment of relPath.split('/').slice(0, -1)) {
      dir += `/${segment}`
      try { pyFS.mkdir(dir) } catch { /* already exists */ }
    }

    pyFS.writeFile(fullPath, text, { encoding: 'utf8' })
  }

  // Prepend /python-core to sys.path so `import Sompyler` resolves.
  await pyodide!.runPythonAsync(`
import sys
sys.path.insert(0, '/python-core')
`)

  // Load render_note.py once; reused for every note.
  const rnRes = await fetch(`${pythonCoreUrl}render_note.py`)
  if (!rnRes.ok) throw new Error(`render_note.py fetch failed: ${rnRes.status}`)
  renderNoteCode = await rnRes.text()
}

self.addEventListener('message', async (ev: MessageEvent) => {
  const msg = ev.data as
    | { type: 'init'; pythonCoreUrl: string }
    | { type: 'render'; id: string; spliYaml: string; freqHz: number; durationS: number; stress: number }

  if (msg.type === 'init') {
    try {
      await initPyodide(msg.pythonCoreUrl)
      self.postMessage({ type: 'ready' })
    } catch (e) {
      self.postMessage({ type: 'init_error', error: (e as Error).message })
    }
    return
  }

  if (msg.type === 'render') {
    if (!pyodide) {
      self.postMessage({ type: 'error', id: msg.id, error: 'Pyodide not initialised' })
      return
    }
    try {
      pyodide.globals.set('_spli_yaml', msg.spliYaml)
      pyodide.globals.set('_freq_hz', msg.freqHz)
      pyodide.globals.set('_duration_s', msg.durationS)
      pyodide.globals.set('_stress', msg.stress)
      const result = await pyodide.runPythonAsync(renderNoteCode) as number[]
      const pcm = new Float32Array(result)
      self.postMessage({ type: 'result', id: msg.id, pcm, sampleRate: SAMPLING_RATE }, [pcm.buffer])
    } catch (e) {
      self.postMessage({ type: 'error', id: msg.id, error: (e as Error).message })
    }
  }
})
