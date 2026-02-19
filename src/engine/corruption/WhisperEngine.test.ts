import { describe, it, expect } from 'vitest'
import { getWhisperInterval, generateWhisper } from './WhisperEngine'

describe('getWhisperInterval', () => {
  it('returns maximum interval at 0 corruption', () => {
    expect(getWhisperInterval(0)).toBe(5 * 60_000)
  })

  it('returns minimum interval at full corruption', () => {
    expect(getWhisperInterval(1.0)).toBe(30_000)
  })

  it('interval decreases as corruption rises', () => {
    const a = getWhisperInterval(0.30)
    const b = getWhisperInterval(0.70)
    expect(b).toBeLessThan(a)
  })

  it('never below 30 seconds', () => {
    expect(getWhisperInterval(0.99)).toBeGreaterThanOrEqual(30_000)
  })
})

describe('generateWhisper', () => {
  it('returns a non-empty string', () => {
    const w = generateWhisper(0.30, [])
    expect(w.text.length).toBeGreaterThan(0)
  })

  it('returns low intensity below 0.50', () => {
    const w = generateWhisper(0.30, [])
    expect(w.intensity).toBe('low')
  })

  it('returns medium intensity at 0.60', () => {
    const w = generateWhisper(0.60, [])
    expect(w.intensity).toBe('medium')
  })

  it('returns high intensity at 0.90', () => {
    const w = generateWhisper(0.90, [])
    expect(w.intensity).toBe('high')
  })

  it('has no demonName when no bound demons', () => {
    // Run many times to ensure no false positive from the 0.3 random chance
    for (let i = 0; i < 50; i++) {
      const w = generateWhisper(0.30, [])
      expect(w.demonName).toBeUndefined()
    }
  })
})
