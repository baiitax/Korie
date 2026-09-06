"use client";

import React from "react";
import { useAgent } from "../AgentContext";

/**
 * Renders a formatted ledger amount, but never displays a number before the
 * real backend value has loaded — shows a neutral skeleton instead. This
 * guarantees the "no hardcoded financial numbers" rule holds even during the
 * brief window between initial render and the /api/v1/agency/float response.
 */
export const LiquidityAmount: React.FC<{
  value: string;
  widthClassName?: string;
  className?: string;
}> = ({ value, widthClassName = "w-20", className = "" }) => {
  const { isLiquidityLoading, isBalanceHidden } = useAgent();

  if (isLiquidityLoading) {
    return (
      <span
        className={`inline-block h-[1em] ${widthClassName} rounded bg-white/10 animate-pulse align-middle ${className}`}
      />
    );
  }

  if (isBalanceHidden) {
    return <span className={className}>••••••••</span>;
  }

  return <span className={className}>{value}</span>;
};

export default LiquidityAmount;
