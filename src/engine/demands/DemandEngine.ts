import type { Demon } from '@engine/sigil/Types'
import { getTemplate, getDeadlineMs } from './DemandTemplates'
import type { DemandType } from './DemandTemplates'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DemonicDemand {
  id: string
  demonId: string
  type: DemandType
  description: string
  /** Ongoing demand duration in ms; null for one-shot demands */
  durationMs: number | null
  issuedAt: number
  /** Time in ms from issuance before the demon considers it ignored */
  deadlineMs: number
  fulfilled: boolean
  /** Always true — no surveillance; the player self-reports compliance */
  selfReported: boolean
}

export type DemandOutcome = 'fulfilled' | 'ignored' | 'lied'

export interface DemandResult {
  outcome: DemandOutcome
  bindingStrengthDelta: number  // positive = stronger, negative = weaker
  escalate: boolean             // whether future demands should be harder
}

// ─── ID counter ────────────────────────────────────────────────────────────

let _demandCounter = 0
function nextId(): string {
  return `demand-${Date.now()}-${_demandCounter++}`
}

// ─── Core functions ────────────────────────────────────────────────────────

/**
 * Generates a new demonic demand from the demon's primary domain.
 * `bindingIntegrity` influences which template tier is selected.
 * Higher integrity = harder demands (the demon senses strength to exploit).
 */
export function generateDemand(demon: Demon, bindingIntegrity: number): DemonicDemand {
  const domain = demon.domains[0]
  // Escalation 0 = mildest, higher values = harder demands
  const escalation = bindingIntegrity >= 0.75 ? 2 : bindingIntegrity >= 0.5 ? 1 : 0
  const template = getTemplate(domain, escalation)
  const now = Date.now()

  return {
    id: nextId(),
    demonId: demon.id,
    type: template.type,
    description: template.description,
    durationMs: template.baseDurationMs,
    issuedAt: now,
    deadlineMs: getDeadlineMs(demon.rank),
    fulfilled: false,
    selfReported: true,
  }
}

/**
 * Generates an escalated demand — harder than the previous one.
 * Cycles to the next template in the domain's list.
 */
export function escalateDemand(previousDemand: DemonicDemand, demon: Demon): DemonicDemand {
  const domain = demon.domains[0]
  // Step up by 1 escalation level for repeated demands
  const escalation = 2 // Always use hardest template for escalated demands
  const template = getTemplate(domain, escalation)
  const now = Date.now()

  return {
    id: nextId(),
    demonId: demon.id,
    type: template.type,
    description: `[ESCALATED] ${template.description}`,
    durationMs: template.baseDurationMs,
    issuedAt: now,
    // Escalated demands have shorter deadlines (half of normal)
    deadlineMs: Math.floor(getDeadlineMs(demon.rank) / 2),
    fulfilled: false,
    selfReported: true,
  }
}

/**
 * Evaluates the player's compliance with a demand.
 *
 * - `fulfilled: true`  → DemandOutcome 'fulfilled'
 * - `fulfilled: false` → DemandOutcome 'ignored'
 * - `lied: true`       → DemandOutcome 'lied' (internal tracking only)
 */
export function evaluateCompliance(
  demand: DemonicDemand,
  selfReported: boolean,
  lied = false,
): DemandResult {
  if (lied) {
    return {
      outcome: 'lied',
      bindingStrengthDelta: -0.05,
      escalate: true,
    }
  }

  if (selfReported) {
    return {
      outcome: 'fulfilled',
      bindingStrengthDelta: +0.02,
      escalate: false,
    }
  }

  // Not fulfilled within deadline
  const now = Date.now()
  const expired = now - demand.issuedAt > demand.deadlineMs
  if (!demand.fulfilled && expired) {
    return {
      outcome: 'ignored',
      bindingStrengthDelta: -0.08,
      escalate: true,
    }
  }

  // Pending (neither fulfilled nor expired)
  return {
    outcome: 'fulfilled',
    bindingStrengthDelta: 0,
    escalate: false,
  }
}
