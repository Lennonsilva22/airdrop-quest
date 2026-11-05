
export interface CantonConfig {
  participantUrl: string | null;
  partyId: string | null;
  isConfigured: boolean;
}

export function getCantonConfig(): CantonConfig {
  const participantUrl =
    process.env.CANTON_PARTICIPANT_URL?.trim() || null;

  const partyId =
    process.env.CANTON_PARTY_ID?.trim() || null;

  return {
    participantUrl,
    partyId,
    isConfigured: Boolean(participantUrl && partyId),
  };
}
