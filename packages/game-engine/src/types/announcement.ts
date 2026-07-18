export interface Announcement {
  id: string
  partyId: string
  title: string
  body: string
  createdBy: string
  createdAt: Date
}

export type CreateAnnouncementParams = {
  id: string
  partyId: string
  title: string
  body: string
  createdBy: string
}

export function createAnnouncement(params: CreateAnnouncementParams): Announcement {
  return {
    id: params.id,
    partyId: params.partyId,
    title: params.title,
    body: params.body,
    createdBy: params.createdBy,
    createdAt: new Date(),
  }
}
