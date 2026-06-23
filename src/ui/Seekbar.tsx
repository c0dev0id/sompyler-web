import { onMount, onCleanup, type Component } from 'solid-js'

export interface SeekbarProps {
  getPosition: () => number
  getDuration: () => number
  getLoopPoints: () => { start: number; end: number }
  isLooping: () => boolean
  onSeek: (t: number) => void
  onSetLoopPoints: (start: number, end: number) => void
  onLoopPointsCommit: () => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export const Seekbar: Component<SeekbarProps> = (props) => {
  let track: HTMLDivElement | undefined
  let playhead: HTMLDivElement | undefined
  let loopRegion: HTMLDivElement | undefined
  let startMarker: HTMLDivElement | undefined
  let endMarker: HTMLDivElement | undefined
  let timeLabel: HTMLSpanElement | undefined
  let rafId = 0

  function pointerFraction(e: PointerEvent): number {
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  }

  function updateDisplay(): void {
    if (!playhead || !loopRegion || !startMarker || !endMarker || !timeLabel) return
    const dur = props.getDuration()
    const looping = props.isLooping()

    if (dur <= 0) {
      playhead.style.display = 'none'
      loopRegion.style.display = 'none'
      startMarker.style.display = 'none'
      endMarker.style.display = 'none'
      timeLabel.textContent = ''
      return
    }

    const pos = Math.min(Math.max(props.getPosition(), 0), dur)
    const { start, end } = props.getLoopPoints()
    const startFrac = Math.max(0, start / dur)
    const endFrac = end > 0 ? Math.min(1, end / dur) : 1

    playhead.style.display = ''
    playhead.style.left = `${(pos / dur) * 100}%`
    timeLabel.textContent = `${formatTime(pos)} / ${formatTime(dur)}`

    const hasRegion = start > 0 || end > 0
    loopRegion.style.display = looping && hasRegion ? '' : 'none'
    loopRegion.style.left = `${startFrac * 100}%`
    loopRegion.style.width = `${(endFrac - startFrac) * 100}%`
    startMarker.style.display = ''
    startMarker.style.left = `${startFrac * 100}%`
    endMarker.style.display = ''
    endMarker.style.left = `${endFrac * 100}%`
  }

  function rafLoop(): void {
    rafId = requestAnimationFrame(rafLoop)
    updateDisplay()
  }

  onMount(() => { rafId = requestAnimationFrame(rafLoop) })
  onCleanup(() => cancelAnimationFrame(rafId))

  // Seek on track click/drag
  function onTrackDown(e: PointerEvent): void {
    if (props.getDuration() <= 0) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    props.onSeek(pointerFraction(e) * props.getDuration())
  }

  function onTrackMove(e: PointerEvent): void {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return
    e.preventDefault()
    props.onSeek(pointerFraction(e) * props.getDuration())
  }

  // Start marker drag
  function onStartDown(e: PointerEvent): void {
    e.stopPropagation()
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onStartMove(e: PointerEvent): void {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return
    e.preventDefault()
    const dur = props.getDuration()
    if (dur <= 0) return
    const t = pointerFraction(e) * dur
    const { end } = props.getLoopPoints()
    const effEnd = end > 0 ? end : dur
    props.onSetLoopPoints(Math.max(0, Math.min(t, effEnd - 0.1)), end)
  }

  function onStartUp(e: PointerEvent): void {
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      props.onLoopPointsCommit()
    }
  }

  // End marker drag
  function onEndDown(e: PointerEvent): void {
    e.stopPropagation()
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onEndMove(e: PointerEvent): void {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return
    e.preventDefault()
    const dur = props.getDuration()
    if (dur <= 0) return
    const t = pointerFraction(e) * dur
    const { start } = props.getLoopPoints()
    // Snap to full-buffer end when within 0.1 s
    const newEnd = t >= dur - 0.1 ? 0 : Math.max(t, start + 0.1)
    props.onSetLoopPoints(start, newEnd)
  }

  function onEndUp(e: PointerEvent): void {
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      props.onLoopPointsCommit()
    }
  }

  return (
    <div class="seekbar">
      <div
        class="seekbar-track"
        ref={(el) => { track = el }}
        onPointerDown={onTrackDown}
        onPointerMove={onTrackMove}
      >
        <div class="seekbar-loop-region" ref={(el) => { loopRegion = el }} />
        <div class="seekbar-playhead" ref={(el) => { playhead = el }} />
        <div
          class="seekbar-marker seekbar-marker-start"
          ref={(el) => { startMarker = el }}
          onPointerDown={onStartDown}
          onPointerMove={onStartMove}
          onPointerUp={onStartUp}
        />
        <div
          class="seekbar-marker seekbar-marker-end"
          ref={(el) => { endMarker = el }}
          onPointerDown={onEndDown}
          onPointerMove={onEndMove}
          onPointerUp={onEndUp}
        />
      </div>
      <span class="seekbar-time" ref={(el) => { timeLabel = el }} />
    </div>
  )
}
