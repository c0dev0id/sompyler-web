import type { Component } from 'solid-js'

interface PlayerHelpDialogProps {
  ref: (el: HTMLDialogElement) => void
}

export const PlayerHelpDialog: Component<PlayerHelpDialogProps> = (props) => {
  let dialog: HTMLDialogElement | undefined

  return (
    <dialog
      class="help-dialog"
      ref={(el) => { dialog = el; props.ref(el) }}
      onClick={(e) => { if (e.target === dialog) dialog?.close() }}
    >
      <div class="help-header">
        <span>Player</span>
        <button onClick={() => dialog?.close()}>✕</button>
      </div>

      <div class="help-body">
        <p class="help-intro">
          Renders your score to audio and plays it back. Use the seekbar markers to define
          a playback window for focused listening or looping.
        </p>

        <section>
          <h4>Transport</h4>
          <dl class="help-params">
            <dt>Render</dt>
            <dd>Compile and render the score to an audio buffer. Editors are locked while rendering. Required before playing. <strong>Ctrl+S</strong></dd>
            <dt>Play</dt>
            <dd>Start playback from the start marker (or the beginning if no window is set). <strong>Ctrl+P</strong></dd>
            <dt>Pause</dt>
            <dd>Pause at the current position. Resume with Play.</dd>
            <dt>Stop</dt>
            <dd>Stop and rewind to the start marker.</dd>
            <dt>Loop</dt>
            <dd>When checked, playback repeats indefinitely between start and end markers. The loop region is highlighted on the seekbar only when Loop is on.</dd>
            <dt>Download WAV</dt>
            <dd>Export the rendered buffer as a stereo WAV file.</dd>
          </dl>
        </section>

        <section>
          <h4>Seekbar</h4>
          <p class="help-text">
            Shows the playback position and the current window. Click anywhere on the
            track to seek. The start and end markers define the playback window.
          </p>
          <dl class="help-params">
            <dt>◁ start marker</dt>
            <dd>Drag to set where playback begins and where looping restarts.</dd>
            <dt>▷ end marker</dt>
            <dd>Drag to set where playback stops or loops back. Dragging within 0.1 s of the end snaps to the full buffer.</dd>
          </dl>
        </section>

        <section>
          <h4>Setting the window from the score</h4>
          <p class="help-text">
            Click a <strong>bar line number</strong> in the score editor to set a
            2-bar window (the clicked bar plus the next) and restart playback from there.
            Clicking the same bar again clears the window.
          </p>
          <p class="help-text">
            Dragging a seekbar marker manually clears any score-set window.
          </p>
          <dl class="help-params">
            <dt>Ctrl+X</dt>
            <dd>Clear the window and reset playback to the full render (works from anywhere outside the text editors).</dd>
          </dl>
        </section>
      </div>
    </dialog>
  )
}
