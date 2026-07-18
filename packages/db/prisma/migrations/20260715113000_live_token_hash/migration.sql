-- Persist only the live access token hash. The raw token is returned once to the client.
ALTER TABLE "RealtimeConnection" RENAME COLUMN "accessToken" TO "tokenHash";

ALTER INDEX "RealtimeConnection_accessToken_key" RENAME TO "RealtimeConnection_tokenHash_key";

ALTER INDEX "RealtimeConnection_accessToken_idx" RENAME TO "RealtimeConnection_tokenHash_idx";
