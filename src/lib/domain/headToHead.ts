export interface HeadToHeadSummary {
  userAId: string;
  userBId: string;
  winsA: number;
  winsB: number;
  draws: number;
  total: number;
  lastPlayedAt: string | null;
}
