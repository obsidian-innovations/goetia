export { getBestSigil, getSigilCount, getBoundDemonIds, getGrimoirePower } from './GrimoireEngine'
export {
  createGrimoireMemory,
  recordRitual,
  tickGrimoire,
  generateGrimoireWhisper,
  getLatestBehavior,
  getSuggestedDemonId,
  getActiveBleedthrough,
  getPageReorderTarget,
  getMemoryTier,
} from './PalimpsestEngine'
export type { GrimoireMemory, GrimoireBehavior, GrimoireBehaviorType, GrimoireTickResult } from './PalimpsestEngine'
