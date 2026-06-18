/**
 * Default sampling rate for offline synthesis. The mix step in Phase 5
 * accepts any AudioContext sample rate; per-note PCM cached at this rate
 * gets resampled into the final mix when the destination rate differs.
 * Matches Sompyler's `Sompyler/synthesizer/__init__.py:SAMPLING_RATE`.
 */
export const DEFAULT_SAMPLE_RATE = 44100

export const TAU = Math.PI * 2
