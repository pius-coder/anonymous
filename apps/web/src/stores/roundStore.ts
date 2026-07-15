"use client";

import { create } from "zustand";
import type { ConnectionState } from "@/components/ui/ConnectionStatus";

type RoundClientState = {
  connection: ConnectionState;
  lastInputNonce?: string;
  inputRejectedReason?: string;
  setConnection: (connection: ConnectionState) => void;
  markInputSubmitted: (nonce: string) => void;
  markInputRejected: (reason: string) => void;
  clearInputFeedback: () => void;
};

export const useRoundClientStore = create<RoundClientState>((set) => ({
  connection: "stable",
  setConnection: (connection) => set({ connection }),
  markInputSubmitted: (nonce) => set({ lastInputNonce: nonce, inputRejectedReason: undefined }),
  markInputRejected: (reason) => set({ inputRejectedReason: reason }),
  clearInputFeedback: () => set({ inputRejectedReason: undefined }),
}));

