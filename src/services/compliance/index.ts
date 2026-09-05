/**
 * Compliance portal data layer — public surface.
 *
 * Pages import from here and nowhere else. That is the rule that makes the
 * "centralised demo data, swappable for live APIs" requirement true rather than
 * aspirational: a page cannot reach a fixture, because it cannot reach the
 * module the fixtures live in.
 */

export * from './types';
export {
  loadComplianceResource,
  complianceMode,
  demoAllowed,
  type LoadOptions,
} from './service';
export {
  runLiveAction,
  runDemoAction,
  runScreening,
  type LiveActionKey,
} from './mutations';
export {
  useComplianceResource,
  useComplianceAction,
  useAutoClearingFeedback,
  type UseComplianceResourceResult,
  type UseComplianceActionResult,
} from './hooks';
export { LIVE_SOURCES, WIRING, type ComplianceWiring } from './endpoints';
export { DEMO_FIXTURE_NOTICE } from './demo/fixtures';
