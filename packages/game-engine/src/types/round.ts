export enum RoundStatus {
  UNSPECIFIED = 0,
  Setup = 1,
  Briefing = 2,
  Active = 3,
  Closing = 4,
  Resolved = 5,
  Published = 6,
}

export interface Round {
  id: string
  gameId: string
  number: number
  status: RoundStatus
  miniGameKey: string
}

export type CreateRoundParams = {
  id: string
  gameId: string
  number: number
  miniGameKey: string
}

export function createRound(params: CreateRoundParams): Round {
  return {
    id: params.id,
    gameId: params.gameId,
    number: params.number,
    status: RoundStatus.Setup,
    miniGameKey: params.miniGameKey,
  }
}
