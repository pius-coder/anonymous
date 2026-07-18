export type GameServerMetricSnapshot = {
  joins: number;
  drops: number;
  reconnects: number;
  lateInputs: number;
  duplicateInputs: number;
  rejects: number;
  rejectReasons: Record<string, number>;
};

const counters: GameServerMetricSnapshot = {
  joins: 0,
  drops: 0,
  reconnects: 0,
  lateInputs: 0,
  duplicateInputs: 0,
  rejects: 0,
  rejectReasons: {},
};

export function recordJoin(): void {
  counters.joins += 1;
}

export function recordDrop(): void {
  counters.drops += 1;
}

export function recordReconnect(): void {
  counters.reconnects += 1;
}

export function recordLateInput(): void {
  counters.lateInputs += 1;
}

export function recordDuplicateInput(): void {
  counters.duplicateInputs += 1;
}

export function recordReject(reason: string): void {
  counters.rejects += 1;
  counters.rejectReasons[reason] = (counters.rejectReasons[reason] ?? 0) + 1;

  if (reason === "LATE_INPUT") {
    recordLateInput();
  } else if (reason === "DUPLICATE_INPUT") {
    recordDuplicateInput();
  }
}

export function getMetrics(): GameServerMetricSnapshot {
  return {
    joins: counters.joins,
    drops: counters.drops,
    reconnects: counters.reconnects,
    lateInputs: counters.lateInputs,
    duplicateInputs: counters.duplicateInputs,
    rejects: counters.rejects,
    rejectReasons: { ...counters.rejectReasons },
  };
}

export function resetMetrics(): void {
  counters.joins = 0;
  counters.drops = 0;
  counters.reconnects = 0;
  counters.lateInputs = 0;
  counters.duplicateInputs = 0;
  counters.rejects = 0;
  counters.rejectReasons = {};
}
