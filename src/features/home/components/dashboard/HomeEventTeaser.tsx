import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Timer } from 'lucide-react';

export function HomeEventTeaser() {
  const router = useRouter();

  return (
    <div className="mt-8 pt-6 border-t border-border/50">
       <Card className="bg-gradient-to-r from-purple-500/10 to-transparent border-purple-500/20 overflow-hidden relative">
          <CardContent className="p-4 flex items-center justify-between relative z-10">
             <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
                   <Calendar className="size-6" />
                </div>
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">UPCOMING</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                         <Timer className="size-3" /> Starts in 2d 14h
                      </span>
                   </div>
                   <h4 className="font-bold text-lg">Champions League Special</h4>
                   <p className="text-sm text-muted-foreground">Double RP • Exclusive Badges</p>
                </div>
             </div>

             <Button variant="secondary" className="border-purple-500/30 hover:bg-purple-500/10" onClick={() => router.push('/events')}>
                View Event
             </Button>
          </CardContent>
       </Card>
    </div>
  );
}
