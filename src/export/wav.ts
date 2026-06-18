/**
 * Hand-rolled 16-bit PCM WAV writer. Matches Sompyler's output container
 * (PCM/LE, 16 bit). Mono or stereo, any sample rate.
 *
 * Format reference: http://soundfile.sapp.org/doc/WaveFormat/
 *
 * No deps — `Float32Array` in, `ArrayBuffer` out. Wrap in a `Blob` and an
 * object URL to trigger a browser download.
 */

export interface WavInput {
  sampleRate: number
  channels: Float32Array[]
}

const HEADER_SIZE = 44
const BYTES_PER_SAMPLE = 2

export function writeWav(input: WavInput): ArrayBuffer {
  const numChannels = input.channels.length
  if (numChannels < 1 || numChannels > 2) {
    throw new Error(`writeWav: 1 or 2 channels supported, got ${numChannels}`)
  }
  const numSamples = input.channels[0]!.length
  for (const ch of input.channels) {
    if (ch.length !== numSamples) {
      throw new Error(`writeWav: channel lengths must match`)
    }
  }

  const byteRate = input.sampleRate * numChannels * BYTES_PER_SAMPLE
  const blockAlign = numChannels * BYTES_PER_SAMPLE
  const dataSize = numSamples * blockAlign
  const buf = new ArrayBuffer(HEADER_SIZE + dataSize)
  const view = new DataView(buf)

  // RIFF header
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')

  // fmt chunk
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, input.sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, BYTES_PER_SAMPLE * 8, true)

  // data chunk
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Interleaved samples, clipped + scaled to signed 16-bit.
  let offset = HEADER_SIZE
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = input.channels[c]![i]!
      if (sample > 1) sample = 1
      else if (sample < -1) sample = -1
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, intSample | 0, true)
      offset += 2
    }
  }

  return buf
}

function writeAscii(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

/** Trigger a browser download for a WAV blob. */
export function downloadWav(input: WavInput, filename: string): void {
  const buf = writeWav(input)
  const blob = new Blob([buf], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.wav') ? filename : `${filename}.wav`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
