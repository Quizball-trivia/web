import { EventsDashboard } from '@/features/tournaments/EventsDashboard';

export interface Tournament {
  id: string;
  name: string;
  type: 'weekly' | 'monthly' | 'seasonal';
  prizePool: string;
  entryCoins: number;
  minRank: number;
  minRankTier: string;
  participants: number;
  maxParticipants: number;
  endsIn: string;
  status: 'active' | 'upcoming' | 'ended';
  rewards: {
    first: string;
    second: string;
    third: string;
  };
}

export interface TournamentsScreenProps {
  playerCoins: number;
  playerRankPoints: number;
  playerTier: string;
  onEnterTournament: (tournament: Tournament) => void;
}

const mockTournaments: Tournament[] = [
  // Weekly Tournaments
  {
    id: 'weekly-1',
    name: 'Weekend Warriors',
    type: 'weekly',
    prizePool: '$125',
    entryCoins: 500,
    minRank: 800,
    minRankTier: 'Bronze',
    participants: 342,
    maxParticipants: 1000,
    endsIn: '2d 14h',
    status: 'active',
    rewards: {
      first: '$50 Amazon Card',
      second: '$30 Steam Card',
      third: '$25 PayPal',
    },
  },
  {
    id: 'weekly-2',
    name: 'Silver Showdown',
    type: 'weekly',
    prizePool: '$300',
    entryCoins: 1000,
    minRank: 1200,
    minRankTier: 'Silver',
    participants: 156,
    maxParticipants: 500,
    endsIn: '4d 8h',
    status: 'active',
    rewards: {
      first: '$150 Amazon Card',
      second: '$100 Steam Card',
      third: '$50 PayPal',
    },
  },
  {
    id: 'weekly-3',
    name: 'Gold Rush',
    type: 'weekly',
    prizePool: '$600',
    entryCoins: 2000,
    minRank: 1600,
    minRankTier: 'Gold',
    participants: 89,
    maxParticipants: 250,
    endsIn: '5d 20h',
    status: 'active',
    rewards: {
      first: '$300 Amazon Card',
      second: '$200 Visa Gift Card',
      third: '$100 PayPal',
    },
  },

  // Monthly Tournaments
  {
    id: 'monthly-1',
    name: 'Champions League',
    type: 'monthly',
    prizePool: '$2,500',
    entryCoins: 5000,
    minRank: 1400,
    minRankTier: 'Silver',
    participants: 1247,
    maxParticipants: 5000,
    endsIn: '18d 6h',
    status: 'active',
    rewards: {
      first: '$1,000 Amazon Card',
      second: '$750 Visa Gift Card',
      third: '$500 PayPal',
    },
  },
  {
    id: 'monthly-2',
    name: 'Elite Masters',
    type: 'monthly',
    prizePool: '$5,000',
    entryCoins: 10000,
    minRank: 1800,
    minRankTier: 'Gold',
    participants: 423,
    maxParticipants: 2000,
    endsIn: '18d 6h',
    status: 'active',
    rewards: {
      first: '$2,000 Amazon Card',
      second: '$1,500 Visa Gift Card',
      third: '$1,000 PayPal',
    },
  },

  // Seasonal Tournaments
  {
    id: 'seasonal-1',
    name: 'Winter World Cup',
    type: 'seasonal',
    prizePool: '$25,000',
    entryCoins: 25000,
    minRank: 1600,
    minRankTier: 'Gold',
    participants: 2834,
    maxParticipants: 10000,
    endsIn: '67d 12h',
    status: 'active',
    rewards: {
      first: '$10,000 Cash Prize',
      second: '$7,500 Visa Gift Card',
      third: '$5,000 Amazon Card',
    },
  },
  {
    id: 'seasonal-2',
    name: 'Diamond Dynasty',
    type: 'seasonal',
    prizePool: '$50,000',
    entryCoins: 50000,
    minRank: 2000,
    minRankTier: 'Diamond',
    participants: 567,
    maxParticipants: 5000,
    endsIn: '67d 12h',
    status: 'active',
    rewards: {
      first: '$20,000 Cash Prize',
      second: '$15,000 Visa Gift Card',
      third: '$10,000 Amazon Card',
    },
  },
];

export function TournamentsScreen({ playerCoins, playerRankPoints, playerTier, onEnterTournament }: TournamentsScreenProps) {
  return (
    <EventsDashboard
      playerCoins={playerCoins}
      playerRankPoints={playerRankPoints}
      playerTier={playerTier}
      tournaments={mockTournaments}
      onEnterTournament={onEnterTournament}
    />
  );
}