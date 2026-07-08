export interface CountdownState {
  remainingMs: number;
  totalMs: number;
  progress: number;
  seconds: number;
  isExpired: boolean;
}

export function getCountdownState({
  deadlineEpochMs,
  nowEpochMs,
  totalMs,
}: {
  deadlineEpochMs: number;
  nowEpochMs: number;
  totalMs: number;
}): CountdownState {
  const safeTotal = Math.max(totalMs, 1);
  const remainingMs = Math.max(0, deadlineEpochMs - nowEpochMs);

  return {
    remainingMs,
    totalMs: safeTotal,
    progress: Math.max(0, Math.min(1, remainingMs / safeTotal)),
    seconds: Math.ceil(remainingMs / 1000),
    isExpired: remainingMs === 0,
  };
}
