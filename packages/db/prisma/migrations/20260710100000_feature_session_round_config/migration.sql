-- Per-session mini-game selection and ordering.
ALTER TABLE "GameSession" ADD COLUMN "selectedMiniGameIds" JSONB;
