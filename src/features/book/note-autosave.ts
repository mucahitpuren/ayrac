// Framework-free autosave controller for the copy note (READ-04). RED stub: the behaviour is specified by
// tests/unit/note-autosave.test.ts and implemented in the next commit.
export type NoteSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export type NoteAutosaveOptions = {
  save: (text: string | null) => Promise<void>
  delayMs?: number
  onState: (state: NoteSaveState) => void
}

export type NoteAutosave = {
  change: (text: string) => void
  flush: () => void
  dispose: () => void
}

export function createNoteAutosave(options: NoteAutosaveOptions): NoteAutosave {
  void options
  return { change: () => undefined, flush: () => undefined, dispose: () => undefined }
}
