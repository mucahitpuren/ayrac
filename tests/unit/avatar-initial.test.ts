import { describe, expect, it } from 'vitest'
import { avatarInitial } from '@/lib/avatar-initial'

describe('avatarInitial', () => {
  it('uppercases i to dotted İ under the Turkish locale', () => {
    expect(avatarInitial('irem@example.com', 'tr')).toBe('İ')
  })

  it('uppercases i to plain I under the English locale', () => {
    expect(avatarInitial('irem@example.com', 'en')).toBe('I')
  })

  it('takes the first letter and uppercases it', () => {
    expect(avatarInitial('mucahit@x.com', 'tr')).toBe('M')
  })

  it('keeps Turkish letters as one character regardless of the UI language', () => {
    expect(avatarInitial('şule@x.com', 'en')).toBe('Ş')
  })

  it('falls back to ? when there is no email', () => {
    expect(avatarInitial(undefined, 'tr')).toBe('?')
    expect(avatarInitial('', 'en')).toBe('?')
  })

  it('treats a regional Turkish tag like tr', () => {
    expect(avatarInitial('irem@example.com', 'tr-TR')).toBe('İ')
  })
})
