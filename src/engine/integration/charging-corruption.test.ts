import { describe, it, expect } from 'vitest'
import {
  createCorruptionState,
  addCorruption,
  getCorruptionAmount,
  getStage,
  isVessel,
} from '@engine/corruption/CorruptionEngine'
import type { CorruptionSource, CorruptionState } from '@engine/corruption/CorruptionEngine'
import { generateWhisper, getWhisperInterval } from '@engine/corruption/WhisperEngine'
import { attemptPurification } from '@engine/corruption/PurificationEngine'
import type { VesselState } from '@engine/corruption/VesselState'
import { getRequiredChargeTime } from '@engine/charging/ChargingEngine'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSource(type: CorruptionSource['type'], amount: number): CorruptionSource {
  return { type, amount, timestamp: Date.now() }
}

function addCorruptionN(state: CorruptionState, type: CorruptionSource['type'], amount: number, n: number): CorruptionState {
  for (let i = 0; i < n; i++) {
    state = addCorruption(state, makeSource(type, amount))
  }
  return state
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Charging → Corruption → Purification integration', () => {
  describe('corruption amount scales by demon rank', () => {
    it('King rank produces higher corruption than Baron', () => {
      const kingAmount = getCorruptionAmount('sigil_cast', 'King')
      const baronAmount = getCorruptionAmount('sigil_cast', 'Baron')
      expect(kingAmount).toBeGreaterThan(baronAmount)
    })

    it('corruption amount is clamped to 0.20 maximum', () => {
      // purification_failed (0.10 base) * King (2.5) = 0.25 → clamped to 0.20
      const amount = getCorruptionAmount('purification_failed', 'King')
      expect(amount).toBe(0.20)
    })
  })

  describe('corruption stage progression', () => {
    it('progresses through clean → tainted → compromised → vessel', () => {
      let state = createCorruptionState()
      expect(state.stage).toBe('clean')

      // Push past 0.25 → tainted
      state = addCorruption(state, makeSource('sigil_cast', 0.26))
      expect(state.stage).toBe('tainted')

      // Push past 0.50 → compromised
      state = addCorruption(state, makeSource('sigil_cast', 0.25))
      expect(state.stage).toBe('compromised')

      // Push past 0.80 → vessel
      state = addCorruption(state, makeSource('pact', 0.30))
      expect(state.stage).toBe('vessel')
      expect(isVessel(state)).toBe(true)
    })

    it('never exceeds level 1.0', () => {
      let state = createCorruptionState()
      state = addCorruptionN(state, 'pact', 0.20, 10) // 2.0 total attempted
      expect(state.level).toBe(1.0)
    })
  })

  describe('whisper generation matches corruption stage', () => {
    it('returns low intensity for corruption < 0.50', () => {
      const whisper = generateWhisper(0.30, [])
      expect(whisper.intensity).toBe('low')
    })

    it('returns medium intensity for corruption 0.50–0.79', () => {
      const whisper = generateWhisper(0.60, [])
      expect(whisper.intensity).toBe('medium')
    })

    it('returns high intensity for corruption >= 0.80', () => {
      const whisper = generateWhisper(0.90, [])
      expect(whisper.intensity).toBe('high')
    })

    it('can personalise whispers with demon names', () => {
      // Run multiple times — personalisation has 30% chance
      const whispers = Array.from({ length: 100 }, () =>
        generateWhisper(0.50, ['Paimon']),
      )
      const personalised = whispers.filter(w => w.demonName === 'Paimon')
      // At least some should be personalised (expected ~30 out of 100)
      expect(personalised.length).toBeGreaterThan(0)
    })
  })

  describe('whisper interval decreases with corruption', () => {
    it('is 5 minutes at corruption 0', () => {
      expect(getWhisperInterval(0)).toBe(5 * 60_000)
    })

    it('is 30 seconds at corruption 1', () => {
      expect(getWhisperInterval(1)).toBe(30_000)
    })

    it('decreases monotonically', () => {
      const levels = [0, 0.25, 0.50, 0.75, 1.0]
      const intervals = levels.map(l => getWhisperInterval(l))
      for (let i = 1; i < intervals.length; i++) {
        expect(intervals[i]).toBeLessThanOrEqual(intervals[i - 1])
      }
    })
  })

  describe('purification', () => {
    const baseVessel: VesselState = {
      playerId: 'player1',
      lastPosition: null,
      boundDemonIds: ['bael', 'paimon'],
      corruptedAt: Date.now(),
      vesselPower: 5,
    }

    it('succeeds with high seal integrity', () => {
      // required threshold = 5 / (5 + 5) = 0.50
      const result = attemptPurification(
        { purifierId: 'helper', targetVesselId: 'player1', sealIntegrity: 0.90 },
        baseVessel,
      )
      expect(result.outcome).toBe('success')
      expect(result.targetCorruptionAfter).toBe(0.30)
      expect(result.purifierCorruptionGain).toBe(0)
      expect(result.permanentScars.length).toBeGreaterThan(0)
    })

    it('fails with low seal integrity', () => {
      // required threshold = 5 / (5 + 5) = 0.50
      const result = attemptPurification(
        { purifierId: 'helper', targetVesselId: 'player1', sealIntegrity: 0.30 },
        baseVessel,
      )
      expect(result.outcome).toBe('failure')
      expect(result.targetCorruptionAfter).toBe(1.0)
      expect(result.purifierCorruptionGain).toBe(0.10)
      expect(result.permanentScars).toEqual([])
    })

    it('produces suspicious_demon and shifted_geometry scars when 2+ demons bound', () => {
      const result = attemptPurification(
        { purifierId: 'helper', targetVesselId: 'player1', sealIntegrity: 0.90 },
        baseVessel,
      )
      const scarTypes = result.permanentScars.map(s => s.type)
      expect(scarTypes).toContain('persistent_distortion')
      expect(scarTypes).toContain('suspicious_demon')
      expect(scarTypes).toContain('shifted_geometry')
    })
  })

  describe('full cycle: clean → vessel → purified', () => {
    it('accumulates corruption to vessel stage then purifies down to tainted', () => {
      // Start clean
      let state = createCorruptionState()
      expect(state.stage).toBe('clean')

      // Simulate multiple sigil casts at King rank (0.05 each)
      const castAmount = getCorruptionAmount('sigil_cast', 'King')
      // Need to reach >= 0.80 for vessel
      const castsNeeded = Math.ceil(0.80 / castAmount)
      state = addCorruptionN(state, 'sigil_cast', castAmount, castsNeeded)
      expect(state.stage).toBe('vessel')
      expect(isVessel(state)).toBe(true)

      // Purify successfully
      const vessel: VesselState = {
        playerId: 'player1',
        lastPosition: null,
        boundDemonIds: ['bael'],
        corruptedAt: Date.now(),
        vesselPower: 3,
      }
      // required = 3 / (3 + 5) = 0.375
      const result = attemptPurification(
        { purifierId: 'helper', targetVesselId: 'player1', sealIntegrity: 0.50 },
        vessel,
      )
      expect(result.outcome).toBe('success')
      expect(result.targetCorruptionAfter).toBe(0.30)

      // After purification, corruption level would be 0.30 → tainted stage
      expect(getStage(result.targetCorruptionAfter)).toBe('tainted')
    })
  })

  describe('charging time scales by rank', () => {
    it('Kings require the longest charging time', () => {
      const kingTime = getRequiredChargeTime('King')
      const baronTime = getRequiredChargeTime('Baron')
      expect(kingTime).toBeGreaterThan(baronTime)
      expect(kingTime).toBe(5_400_000) // 90 minutes
    })
  })
})
