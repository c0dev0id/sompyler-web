/**
 * validate-score.ts — cross-validate note events between JS and Python sompyler.
 *
 * Usage:
 *   node_modules/.bin/vite-node scripts/validate-score.ts <score.spls>
 *
 * Runs the same score through:
 *   1. The JS parser (parseScore + buildDistinctNotes)
 *   2. The Python sompyler (scripts/sompyle --emit-premidi-notes-to)
 *
 * Compares per-occurrence note events: voice, pitch (Hz), offsetSeconds,
 * lengthSeconds, stress. Reports mismatches and exits non-zero if any found.
 *
 * Python sompyler location: ../sompyler (relative to sompyler-web root).
 * Override with SOMPYLER_PATH env var.
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync } from 'node:child_process'
import { buildDistinctNotes } from '../src/render/distinct'
import { loadInstrument } from '../src/parse/instrument'
import { Tuner } from '../src/parse/tuning'
import { parseScore } from '../src/parse/score'

// ── helpers ──────────────────────────────────────────────────────────────────

interface NoteEvent {
  voice: string
  pitchHz: number
  offsetSecs: number
  lengthSecs: number
  stress: number // 0–100 range
}

function fmt(e: NoteEvent): string {
  return `${e.voice} ${e.pitchHz.toFixed(2)} Hz @ ${e.offsetSecs.toFixed(4)}s len=${e.lengthSecs.toFixed(4)}s stress=${e.stress.toFixed(1)}`
}

function near(a: number, b: number, tol = 0.002): boolean {
  return Math.abs(a - b) <= tol
}

// ── Python side ───────────────────────────────────────────────────────────────

function runPython(scoreContent: string): NoteEvent[] {
  const sompylerPath = process.env.SOMPYLER_PATH ?? path.resolve(import.meta.dirname!, '../../sompyler')
  const extractorScript = path.resolve(import.meta.dirname!, 'extract-notes.py')

  // Python sompyler rejects `author:` (not in RFC); RFC uses `composer:`.
  const normalized = scoreContent.replace(/^author:/m, 'composer:')
  // Python sompyler doesn't know about sompyler-web's `tuning_config:` key.
  // Strip it so the parser doesn't choke; tuning is validated separately.
  const stripped = normalized.replace(/^tuning_config:.*$/m, '')

  const tmpScore = path.join(os.tmpdir(), `validate_score_${process.pid}.spls`)
  try {
    fs.writeFileSync(tmpScore, stripped)
    const out = execSync(`python3 ${extractorScript} ${sompylerPath} ${tmpScore}`, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return JSON.parse(out.toString()) as NoteEvent[]
  } finally {
    fs.rmSync(tmpScore, { force: true })
  }
}

// ── JS side ───────────────────────────────────────────────────────────────────

async function runJS(scoreContent: string, scorePath: string): Promise<NoteEvent[]> {
  const { head } = parseScore(scoreContent)

  // Build a stub instrument for every voice. Note timing and pitch come from
  // the tuner/stressor, not the instrument body — the stub won't affect results.
  const stubBody = 'character:\n  O: sine\n  A: "0.01:1,100"\n  S: "1:100;1,100"\n  R: "0.1:100;1,0"\n'
  const instruments = new Map<string, Awaited<ReturnType<typeof loadInstrument>>>()
  for (const [, vs] of Object.entries(head.stage)) {
    if (!instruments.has(vs.instrument)) {
      instruments.set(vs.instrument, await loadInstrument(vs.instrument, stubBody))
    }
  }

  const tuner = new Tuner()
  const plan = await buildDistinctNotes(scoreContent, { tuner, instruments })

  const events: NoteEvent[] = []
  for (const note of plan.notes) {
    for (const occ of note.occurrences) {
      events.push({
        voice: occ.voice,
        pitchHz: note.frequencyHz,
        offsetSecs: occ.offsetSeconds,
        lengthSecs: note.lengthSeconds,
        stress: note.stress * 100,
      })
    }
  }
  return events
}

// ── comparison ────────────────────────────────────────────────────────────────

function sortKey(e: NoteEvent): string {
  return `${e.offsetSecs.toFixed(4)}|${e.pitchHz.toFixed(2)}|${e.voice}`
}

function compare(jsEvents: NoteEvent[], pyEvents: NoteEvent[]): boolean {
  const jsSort = [...jsEvents].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  const pySort = [...pyEvents].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))

  let ok = true
  const maxLen = Math.max(jsSort.length, pySort.length)

  if (jsSort.length !== pySort.length) {
    console.error(`\n✗ Note count mismatch: JS=${jsSort.length} Python=${pySort.length}`)
    ok = false
  }

  const HZ_TOL = 0.5   // Hz — tuning scale differences may cause small drift
  const SEC_TOL = 0.002 // 2 ms
  const STRESS_TOL = 0.5

  const mismatches: string[] = []
  for (let i = 0; i < Math.min(jsSort.length, pySort.length); i++) {
    const js = jsSort[i]!
    const py = pySort[i]!
    const pitchOk = near(js.pitchHz, py.pitchHz, HZ_TOL)
    const offsetOk = near(js.offsetSecs, py.offsetSecs, SEC_TOL)
    const lengthOk = near(js.lengthSecs, py.lengthSecs, SEC_TOL)
    const stressOk = near(js.stress, py.stress, STRESS_TOL)
    if (!pitchOk || !offsetOk || !lengthOk || !stressOk) {
      mismatches.push(
        `  [${i}] JS : ${fmt(js)}\n       PY : ${fmt(py)}` +
        `\n       diff: Hz=${(js.pitchHz - py.pitchHz).toFixed(3)} off=${(js.offsetSecs - py.offsetSecs).toFixed(4)}s len=${(js.lengthSecs - py.lengthSecs).toFixed(4)}s stress=${(js.stress - py.stress).toFixed(1)}`,
      )
      ok = false
    }
  }
  for (let i = Math.min(jsSort.length, pySort.length); i < maxLen; i++) {
    if (i < jsSort.length) mismatches.push(`  [${i}] JS only: ${fmt(jsSort[i]!)}`)
    else mismatches.push(`  [${i}] PY only: ${fmt(pySort[i]!)}`)
    ok = false
  }

  if (ok) {
    console.log(`✓  ${jsSort.length} notes match (Hz ±${HZ_TOL}, timing ±${SEC_TOL * 1000}ms, stress ±${STRESS_TOL})`)
  } else {
    if (mismatches.length > 0) console.error('\nMismatches:\n' + mismatches.join('\n\n'))
  }
  return ok
}

// ── main ──────────────────────────────────────────────────────────────────────

const scorePath = process.argv[2]
if (!scorePath) {
  console.error('Usage: vite-node scripts/validate-score.ts <score.spls>')
  process.exit(1)
}

const scoreContent = fs.readFileSync(scorePath, 'utf8')
console.log(`Validating: ${scorePath}`)

const [jsEvents, pyEvents] = await Promise.all([
  runJS(scoreContent, scorePath),
  Promise.resolve().then(() => runPython(scoreContent)),
])

console.log(`JS: ${jsEvents.length} note events`)
console.log(`PY: ${pyEvents.length} note events`)

if (!compare(jsEvents, pyEvents)) process.exit(1)
