import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNoteAutosave, type NoteSaveState } from '@/features/book/note-autosave'

type Deferred = { resolve: () => void; reject: (error: Error) => void }

// A save() whose promises the test settles by hand, so in-flight behaviour is deterministic.
function setup() {
  const calls: (string | null)[] = []
  const pending: Deferred[] = []
  const states: NoteSaveState[] = []
  const save = vi.fn((text: string | null) => {
    calls.push(text)
    return new Promise<void>((resolve, reject) => {
      pending.push({ resolve, reject })
    })
  })
  const autosave = createNoteAutosave({ save, onState: (state) => states.push(state) })
  const settle = async (index: number) => {
    pending[index]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
  }
  const fail = async (index: number) => {
    pending[index]?.reject(new Error('offline'))
    await vi.advanceTimersByTimeAsync(0)
  }
  return { autosave, calls, states, save, settle, fail }
}

describe('createNoteAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('goes dirty on change, saves 800ms after the last keystroke, then reports saved', async () => {
    const { autosave, calls, states, settle } = setup()
    autosave.change('a')
    expect(states.at(-1)).toBe('dirty')
    await vi.advanceTimersByTimeAsync(799)
    expect(calls).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toEqual(['a'])
    expect(states.at(-1)).toBe('saving')
    await settle(0)
    expect(states.at(-1)).toBe('saved')
  })

  it('restarts the delay on every keystroke', async () => {
    const { autosave, calls } = setup()
    autosave.change('a')
    await vi.advanceTimersByTimeAsync(500)
    autosave.change('ab')
    await vi.advanceTimersByTimeAsync(500)
    expect(calls).toEqual([])
    await vi.advanceTimersByTimeAsync(300)
    expect(calls).toEqual(['ab'])
  })

  it('never starts a second save while one is in flight, then saves the newest text and only then reports saved', async () => {
    const { autosave, calls, states, settle } = setup()
    autosave.change('a')
    await vi.advanceTimersByTimeAsync(800)
    expect(calls).toEqual(['a'])

    autosave.change('ab')
    await vi.advanceTimersByTimeAsync(800)
    expect(calls).toEqual(['a'])
    expect(states.at(-1)).toBe('dirty')

    await settle(0)
    expect(calls).toEqual(['a', 'ab'])
    expect(states.at(-1)).toBe('saving')

    await settle(1)
    expect(states.at(-1)).toBe('saved')
    expect(states.filter((state) => state === 'saved')).toHaveLength(1)
  })

  it('flush saves immediately without waiting for the delay', async () => {
    const { autosave, calls } = setup()
    autosave.change('x')
    autosave.flush()
    expect(calls).toEqual(['x'])
    await vi.advanceTimersByTimeAsync(2000)
    expect(calls).toEqual(['x'])
  })

  it('stores a whitespace-only note as null', async () => {
    const { autosave, calls } = setup()
    autosave.change('   ')
    await vi.advanceTimersByTimeAsync(800)
    expect(calls).toEqual([null])
  })

  it('reports error when the save rejects and retries with the latest text on the next change', async () => {
    const { autosave, calls, states, settle, fail } = setup()
    autosave.change('a')
    await vi.advanceTimersByTimeAsync(800)
    await fail(0)
    expect(states.at(-1)).toBe('error')

    autosave.change('ab')
    await vi.advanceTimersByTimeAsync(800)
    expect(calls).toEqual(['a', 'ab'])
    await settle(1)
    expect(states.at(-1)).toBe('saved')
  })

  it('dispose cancels a pending timer without saving, and flush afterwards does nothing', async () => {
    const { autosave, calls } = setup()
    autosave.change('a')
    autosave.dispose()
    await vi.advanceTimersByTimeAsync(2000)
    expect(calls).toEqual([])

    autosave.change('b')
    autosave.flush()
    expect(calls).toEqual([])
  })
})
