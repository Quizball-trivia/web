import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';

export default function FootballGridDevPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  redirect('/dev/football-tic-tac-toe');
}
