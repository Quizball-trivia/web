import { redirect } from 'next/navigation';

// The WL dev playground moved to /dev/wl.
export default function DevWeekendLeaguePage() {
  redirect('/dev/wl');
}
