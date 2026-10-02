// Framework-free autosave controller for the copy note (READ-04): one debounce timer, one in-flight save and one
// "pending text" slot. A newer text is only saved after the in-flight save settles (single-flight with a trailing
// save), so an older write can never land after a newer one. No React or Supabase here by design.
export type NoteSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export type NoteAutosaveOptions = {
  save: (text: string | null) => Promise<void>
  delayMs?: number
  onState: (state: NoteSaveState) => void
  /** Called when the last save fails after dispose(): onState is silent by then, but the text is lost. */
  onFinalError?: () => void
}

export type NoteAutosave = {
  change: (text: string) => void
  flush: () => void
  dispose: () => void
}

// A blank note is stored as NULL; the textarea itself keeps whatever was typed.
function normalize(text: string): string | null {
  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

export function createNoteAutosave({
  save,
  delayMs = 800,
  onState,
  onFinalError,
}: NoteAutosaveOptions): NoteAutosave {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending = '' // latest text not yet handed to save()
  let hasPending = false
  let due = false // the debounce elapsed (or flush ran) while a save was in flight
  let inFlight = false
  let disposed = false

  const report = (state: NoteSaveState) => {
    if (!disposed) onState(state)
  }

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  const start = () => {
    const text = pending
    pending = ''
    hasPending = false
    due = false
    inFlight = true
    report('saving')
    void save(normalize(text)).then(
      () => settle(true),
      () => settle(false),
    )
  }

  const settle = (ok: boolean) => {
    inFlight = false
    if (hasPending) {
      // Newer text arrived while saving: it supersedes this result, so neither "saved" nor "error" is reported.
      if (due) start()
      else report('dirty')
      return
    }
    // After dispose the component is gone, so a failed last save would otherwise lose the text without a sign.
    if (!ok && disposed) onFinalError?.()
    report(ok ? 'saved' : 'error')
  }

  const run = () => {
    clearTimer()
    if (!hasPending) return
    if (inFlight) due = true
    else start()
  }

  return {
    change(text) {
      if (disposed) return
      pending = text
      hasPending = true
      due = false
      report('dirty')
      clearTimer()
      timer = setTimeout(() => {
        timer = null
        run()
      }, delayMs)
    },
    flush() {
      if (disposed) return
      run()
    },
    dispose() {
      clearTimer()
      // A text that was already flushed behind an in-flight save still goes out; an unflushed one is dropped.
      if (!due) {
        pending = ''
        hasPending = false
      }
      disposed = true
    },
  }
}
