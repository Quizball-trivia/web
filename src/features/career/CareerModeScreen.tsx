import { useState, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CareerPath, CareerLevel } from './components/CareerPath';
import { ObjectivesPanel } from './components/ObjectivesPanel';
import { AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { careerLevels } from '@/data/careerLevels';

interface CareerModeScreenProps {
  onBack: () => void;
  onSelectLevel: (levelId: number, levelName: string, questionsCount: number) => void;
  completedLevels: Set<number>;
}

export function CareerModeScreen({
  onBack,
  onSelectLevel,
  completedLevels
}: CareerModeScreenProps) {
  // Find current play level (first uncompleted)
  const currentLevelId = useMemo(() => {
    const lastCompleted = Math.max(...Array.from(completedLevels), 0);
    return Math.min(lastCompleted + 1, careerLevels.length);
  }, [completedLevels]);

  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);

  // Logic to determine what to show in the side panel
  const activeLevelData = useMemo(() => {
     if (selectedLevelId) return careerLevels.find(l => l.id === selectedLevelId);
     // Default to current level if none selected specifically, OR keep panel closed?
     // Let's default to current playable level if selectedLevelId is null
     return careerLevels.find(l => l.id === currentLevelId);
  }, [selectedLevelId, currentLevelId]);

  const handleLevelSelect = (level: CareerLevel) => {
    setSelectedLevelId(level.id);
  };

  const handleStartLevel = () => {
    if (activeLevelData) {
      onSelectLevel(activeLevelData.id, activeLevelData.name, activeLevelData.questionsCount);
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      style={{ '--navbar-height': '60px' } as React.CSSProperties}
    >

      {/* Navbar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <button onClick={onBack} className="p-2 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="size-5" />
           </button>
           <div>
              <h1 className="font-bold text-lg leading-none">Career Mode</h1>
              <p className="text-xs text-muted-foreground">Journey to Greatness</p>
           </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
           <span className="text-xs font-medium text-muted-foreground">Total Progress</span>
           <span className="text-sm font-bold text-primary">{Math.round((completedLevels.size / careerLevels.length) * 100)}%</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">

         {/* Main Content (Journey Path) */}
         <div className="flex-1 overflow-y-auto bg-grid-white/[0.02]">
            <div className="min-h-full pb-32">
               <CareerPath
                  levels={careerLevels}
                  completedLevels={completedLevels}
                  currentLevelId={currentLevelId}
                  selectedLevelId={selectedLevelId}
                  onLevelSelect={handleLevelSelect}
               />
            </div>
         </div>

         {/* Desktop Side Panel */}
         <div
           className="hidden lg:block w-[400px] border-l bg-card sticky top-0 z-10 shadow-xl"
           style={{ height: 'calc(100vh - var(--navbar-height, 60px))' }}
         >
             <AnimatePresence mode="wait">
                {activeLevelData ? (
                   <ObjectivesPanel
                      key={activeLevelData.id}
                      level={activeLevelData}
                      isOpen={true}
                      onStart={handleStartLevel}
                   />
                ) : (
                   <div className="h-full flex items-center justify-center text-muted-foreground">
                      Select a level to view details
                   </div>
                )}
             </AnimatePresence>
         </div>

      </div>

      {/* Mobile Drawer / Sheet */}
      <div className="lg:hidden">
         <Sheet open={!!selectedLevelId} onOpenChange={(open) => !open && setSelectedLevelId(null)}>
            <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-3xl border-t-0">
                <SheetTitle className="sr-only">Level Details</SheetTitle>
                {activeLevelData && (
                   <ObjectivesPanel
                      level={activeLevelData}
                      isOpen={true}
                      onStart={handleStartLevel}
                   />
                )}
            </SheetContent>
         </Sheet>
      </div>

    </div>
  );
}
