import { safeRatio } from "./numeric-foundation.ts";

export const COST_TO_REVENUE_LABEL = "Omkostninger i % af omsætning";
export const COST_DISTRIBUTION_SHARE_LABEL = "Andel af samlede omkostninger";

export function costToRevenue(totalCosts: number | null, revenue: number | null) {
  return safeRatio(totalCosts, revenue);
}

export function costDistributionShare(memberCost: number | null, totalCosts: number | null) {
  return safeRatio(memberCost, totalCosts);
}
