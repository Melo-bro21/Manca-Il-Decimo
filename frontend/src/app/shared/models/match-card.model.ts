export interface MatchCardData {
  id: number;
  imageUrl: string;
  dayLabel: string;
  time: string;
  type: string;
  centerName: string;
  address: string;
  availableSpots: number;
  deposit: number;
  distanceKm: number;
  daysFromToday: number;

  requiresApproval?: boolean;
  onlyReliableUsers?: boolean;
  minReliabilityScore?: number | null;
}