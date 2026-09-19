import { DevAnimationsContent } from './DevAnimationsContent';

export default function DevAnimationsPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white font-fun">
        Dev only
      </div>
    );
  }

  return <DevAnimationsContent />;
}
