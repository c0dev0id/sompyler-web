import type { Component } from 'solid-js'

interface StagingHelpDialogProps {
  ref: (el: HTMLDialogElement) => void
}

export const StagingHelpDialog: Component<StagingHelpDialogProps> = (props) => {
  let dialog: HTMLDialogElement | undefined

  return (
    <dialog
      class="help-dialog"
      ref={(el) => { dialog = el; props.ref(el) }}
      onClick={(e) => { if (e.target === dialog) dialog?.close() }}
    >
      <div class="help-header">
        <span>Files</span>
        <button onClick={() => dialog?.close()}>✕</button>
      </div>

      <div class="help-body">
        <p class="help-intro">
          All files live in IndexedDB. The staging rail shows everything; only the
          <em> active project</em> subset is open in the editors.
        </p>

        <section>
          <h4>Staging vs. project</h4>
          <p class="help-text">
            Importing or creating a file adds it to <strong>staging</strong> — persistent
            browser storage. It is not visible in the editors until it is part of the active
            project. Files stay in staging across sessions and page reloads.
          </p>
          <p class="help-text">
            The <strong>active project</strong> is the set of files currently open in the
            editors. It always centres on one score file. Loading a score (pressing <strong>+</strong>
            next to a <code>.spls</code>) replaces the entire project: the previous score and all
            its files are unloaded, and the new score plus all its referenced files are loaded
            automatically.
          </p>
        </section>

        <section>
          <h4>File tree</h4>
          <p class="help-text">
            Each score is a collapsible group. Expand it (▶) to see the instruments, room, and
            tuning file it references. The tree is derived live from the score text — edit the
            score and the dependency list updates immediately.
          </p>
          <dl class="help-params">
            <dt>highlighted row</dt>
            <dd>File is in the active project and open in an editor.</dd>
            <dt>dim row</dt>
            <dd>File is in staging but not in the active project.</dd>
            <dt>missing entry</dt>
            <dd>Referenced by the score but not yet in staging. Shows a <strong>Create</strong> button to make an empty file with the right name and extension.</dd>
            <dt>unreferenced</dt>
            <dd>Files not referenced by any score. Grouped at the bottom. They cannot be in the active project — add a reference in your score first.</dd>
          </dl>
        </section>

        <section>
          <h4>Row actions</h4>
          <dl class="help-params">
            <dt>+</dt>
            <dd>Load this score as the active project (scores only). For non-score files: manually add to the active project — usually not needed since loading a score does this automatically.</dd>
            <dt>−</dt>
            <dd>Remove from the active project without deleting the file from staging.</dd>
            <dt>✎</dt>
            <dd>Rename the file. If the score references it by the old name, update the score text too.</dd>
            <dt>✕</dt>
            <dd>Delete from staging permanently. Confirms first if the file is in the active project.</dd>
          </dl>
        </section>

        <section>
          <h4>Footer actions</h4>
          <dl class="help-params">
            <dt>New…</dt>
            <dd>Create a new empty file. Choose a name and extension, then press Create or Enter. The file starts in staging only — load a score to bring it into the project, or it will be picked up automatically if the score references it.</dd>
            <dt>Import…</dt>
            <dd>Load files from disk. Accepts individual <code>.spls</code>, <code>.spli</code>, <code>.splt</code>, <code>.splr</code> files, or a <code>.zip</code> archive of any mix. All imported files land in staging only.</dd>
            <dt>Export…</dt>
            <dd>Download every staged file (not just the active project) as a <code>.zip</code> archive.</dd>
            <dt>Reset Database</dt>
            <dd>Delete all files and preferences from IndexedDB and reload. Irreversible — export first if you want to keep your work.</dd>
          </dl>
        </section>
      </div>
    </dialog>
  )
}
