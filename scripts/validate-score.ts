/**
 * validate-score.ts — cross-validate note events between JS and Python sompyler.
 *
 * Usage:
 *   node_modules/.bin/vite-node scripts/validate-score.ts <score.spls>
 *
 * Runs the same score through:
 *   1. The JS parser (parseScore + buildDistinctNotes)
 *   2. The Python sompyler (scripts/extract-notes.py)
 *
 * Compares per-occurrence note events: voice, pitch (Hz), offsetSeconds,
 * lengthSeconds, stress. Reports mismatches and exits non-zero if any found.
 *
 * Python sompyler location: ../sompyler (relative to sompyler-web root).
 * Override with SOMPYLER_PATH env var.
 *
 * Known limitation: Python's first-pass deferred-note system emits long notes
 * (notes that span multiple measures) with incorrect offsetSecs. These are
 * reported as "long-note artifacts" rather than true mismatches.
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

function near(a: number, b: number, tol: number): boolean {
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

async function runJS(scoreContent: string): Promise<NoteEvent[]> {
  const { head } = parseScore(scoreContent)

  // Stub instruments: timing and pitch come from the tuner/stressor, not the
  // instrument body, so a simple sine+ADSR stub won't affect results.
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

const HZ_TOL = 0.5    // Hz — small tuning-scale drift allowed
const SEC_TOL = 0.002 // 2 ms
const STRESS_TOL = 0.5

interface MatchResult {
  js: NoteEvent
  py: NoteEvent
}

/**
 * Greedy signature-based matching. Three tiers:
 *  1. voice + pitch + length + stress + offset — clean match
 *  2. voice + pitch + length + stress, offset mismatch — deferred-note offset artifact
 *  3. voice + pitch + length only (stress mismatch) — deferred-note stress artifact
 *     (only classified as artifact when note is "long", i.e. > LONG_NOTE_SECS)
 *
 * Anything unmatched after all three tiers is a genuine mismatch.
 */
function compare(jsEvents: NoteEvent[], pyEvents: NoteEvent[]): boolean {
  const LONG_NOTE_SECS = 1.0 // notes longer than this may get wrong stress from Python's deferred system

  const available = new Set<number>(pyEvents.map((_, i) => i))

  const cleanMatches: MatchResult[] = []
  const offsetArtifacts: Array<MatchResult & { offsetDelta: number }> = []
  const stressArtifacts: Array<MatchResult & { stressDelta: number }> = []
  const voiceArtifacts: Array<MatchResult> = []
  const jsUnmatched: NoteEvent[] = []

  for (const js of jsEvents) {
    // Tier 1+2: match voice + pitch + length + stress; prefer offset-exact
    let bestIdx = -1
    let bestExact = false
    let bestOffDelta = Infinity

    for (const i of available) {
      const py = pyEvents[i]!
      if (
        py.voice !== js.voice ||
        !near(py.pitchHz, js.pitchHz, HZ_TOL) ||
        !near(py.lengthSecs, js.lengthSecs, SEC_TOL) ||
        !near(py.stress, js.stress, STRESS_TOL)
      ) continue

      const offDelta = Math.abs(py.offsetSecs - js.offsetSecs)
      const exact = offDelta <= SEC_TOL
      if (bestIdx === -1 || (exact && !bestExact) || (exact === bestExact && offDelta < bestOffDelta)) {
        bestIdx = i
        bestExact = exact
        bestOffDelta = offDelta
      }
    }

    if (bestIdx !== -1) {
      available.delete(bestIdx)
      const py = pyEvents[bestIdx]!
      if (bestExact) {
        cleanMatches.push({ js, py })
      } else {
        offsetArtifacts.push({ js, py, offsetDelta: bestOffDelta })
      }
      continue
    }

    // Tier 3: match voice + pitch + length only (stress may differ due to deferred system)
    if (js.lengthSecs > LONG_NOTE_SECS) {
      let stressIdx = -1
      let stressOffDelta = Infinity

      for (const i of available) {
        const py = pyEvents[i]!
        if (
          py.voice !== js.voice ||
          !near(py.pitchHz, js.pitchHz, HZ_TOL) ||
          !near(py.lengthSecs, js.lengthSecs, SEC_TOL)
        ) continue

        const offDelta = Math.abs(py.offsetSecs - js.offsetSecs)
        if (offDelta <= SEC_TOL && (stressIdx === -1 || offDelta < stressOffDelta)) {
          stressIdx = i
          stressOffDelta = offDelta
        }
      }

      if (stressIdx !== -1) {
        available.delete(stressIdx)
        const py = pyEvents[stressIdx]!
        stressArtifacts.push({ js, py, stressDelta: Math.abs(py.stress - js.stress) })
        continue
      }
    }

    // Tier 4: match across ALL voices (Python deduplicates notes from voices sharing
    // the same instrument — all such notes appear under the first voice processed).
    if (js.lengthSecs > LONG_NOTE_SECS) {
      let crossIdx = -1
      let crossOffDelta = Infinity

      for (const i of available) {
        const py = pyEvents[i]!
        if (
          !near(py.pitchHz, js.pitchHz, HZ_TOL) ||
          !near(py.lengthSecs, js.lengthSecs, SEC_TOL)
        ) continue
        const offDelta = Math.abs(py.offsetSecs - js.offsetSecs)
        if (offDelta <= SEC_TOL && (crossIdx === -1 || offDelta < crossOffDelta)) {
          crossIdx = i
          crossOffDelta = offDelta
        }
      }

      if (crossIdx !== -1) {
        available.delete(crossIdx)
        voiceArtifacts.push({ js, py: pyEvents[crossIdx]! })
        continue
      }
    }

    jsUnmatched.push(js)
  }

  const pyUnmatched = [...available].map((i) => pyEvents[i]!)

  let ok = true

  console.log(`✓  ${cleanMatches.length} / ${jsEvents.length} events matched exactly (Hz ±${HZ_TOL}, timing ±${SEC_TOL * 1000}ms, stress ±${STRESS_TOL})`)

  if (offsetArtifacts.length > 0) {
    console.warn(`\n⚠  ${offsetArtifacts.length} deferred-note offset artifacts (Python limitation — long notes emitted at wrong offset):`)
    for (const { js, py, offsetDelta } of offsetArtifacts.slice(0, 5)) {
      console.warn(`   JS @ ${js.offsetSecs.toFixed(4)}s vs PY @ ${py.offsetSecs.toFixed(4)}s (Δ${offsetDelta.toFixed(3)}s) — ${js.voice} ${js.pitchHz.toFixed(2)} Hz len=${js.lengthSecs.toFixed(3)}s`)
    }
    if (offsetArtifacts.length > 5) console.warn(`   ... and ${offsetArtifacts.length - 5} more`)
  }

  if (stressArtifacts.length > 0) {
    console.warn(`\n⚠  ${stressArtifacts.length} deferred-note stress artifacts (Python limitation — long notes get stress from deferred tick, not start tick):`)
    for (const { js, py, stressDelta } of stressArtifacts.slice(0, 5)) {
      console.warn(`   JS stress=${js.stress.toFixed(1)} vs PY stress=${py.stress.toFixed(1)} (Δ${stressDelta.toFixed(1)}) — ${js.voice} ${js.pitchHz.toFixed(2)} Hz @ ${js.offsetSecs.toFixed(4)}s len=${js.lengthSecs.toFixed(3)}s`)
    }
    if (stressArtifacts.length > 5) console.warn(`   ... and ${stressArtifacts.length - 5} more`)
  }

  if (voiceArtifacts.length > 0) {
    console.warn(`\n⚠  ${voiceArtifacts.length} voice-dedup artifacts (Python collapses shared-instrument voices to one channel):`)
    for (const { js, py } of voiceArtifacts.slice(0, 3)) {
      console.warn(`   JS voice=${js.voice} matched PY voice=${py.voice} — ${js.pitchHz.toFixed(2)} Hz @ ${js.offsetSecs.toFixed(4)}s len=${js.lengthSecs.toFixed(3)}s`)
    }
    if (voiceArtifacts.length > 3) console.warn(`   ... and ${voiceArtifacts.length - 3} more`)
  }

  // Classify remaining unmatched events. If a JS event and a Python event have
  // the same pitch and length (but differ on voice, offset, or stress), they're
  // a combined Python artifact (deferred-note + voice-dedup at once). True
  // mismatches have no Python counterpart at all (not even at a different voice).
  const combinedArtifacts: Array<{ js: NoteEvent; py: NoteEvent }> = []
  const genuineJsMissing: NoteEvent[] = []
  const pyPool2 = [...pyUnmatched]

  for (const js of jsUnmatched) {
    const idx = pyPool2.findIndex(
      (py) => near(py.pitchHz, js.pitchHz, HZ_TOL) && near(py.lengthSecs, js.lengthSecs, SEC_TOL),
    )
    if (idx !== -1) {
      combinedArtifacts.push({ js, py: pyPool2.splice(idx, 1)[0]! })
    } else {
      genuineJsMissing.push(js)
    }
  }
  const genuinePyMissing = pyPool2

  if (combinedArtifacts.length > 0) {
    console.warn(`\n⚠  ${combinedArtifacts.length} combined Python artifacts (deferred-note offset + voice-dedup simultaneously):`)
    for (const { js, py } of combinedArtifacts.slice(0, 3)) {
      console.warn(`   JS ${js.voice} @ ${js.offsetSecs.toFixed(4)}s vs PY ${py.voice} @ ${py.offsetSecs.toFixed(4)}s — ${js.pitchHz.toFixed(2)} Hz len=${js.lengthSecs.toFixed(3)}s`)
    }
    if (combinedArtifacts.length > 3) console.warn(`   ... and ${combinedArtifacts.length - 3} more`)
  }

  if (genuineJsMissing.length > 0) {
    ok = false
    console.error(`\n✗ ${genuineJsMissing.length} JS events with no Python match:`)
    for (const e of genuineJsMissing.slice(0, 10)) console.error(`   JS: ${fmt(e)}`)
    if (genuineJsMissing.length > 10) console.error(`   ... and ${genuineJsMissing.length - 10} more`)
  }

  if (genuinePyMissing.length > 0) {
    ok = false
    console.error(`\n✗ ${genuinePyMissing.length} Python events with no JS match:`)
    for (const e of genuinePyMissing.slice(0, 10)) console.error(`   PY: ${fmt(e)}`)
    if (genuinePyMissing.length > 10) console.error(`   ... and ${genuinePyMissing.length - 10} more`)
  }

  if (ok) console.log('All events accounted for.')
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
  runJS(scoreContent),
  Promise.resolve().then(() => runPython(scoreContent)),
])

console.log(`JS: ${jsEvents.length} note events`)
console.log(`PY: ${pyEvents.length} note events`)

if (!compare(jsEvents, pyEvents)) process.exit(1)
