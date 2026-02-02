import { useState, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CareerPath, CareerLevel } from '../features/career/components/CareerPath';
import { ObjectivesPanel } from '../features/career/components/ObjectivesPanel';
import { AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet'; // Assuming we have a sheet component or will use a mobile overlay

// --- Mock Data (Moved from original file, ideally should be imported) ---
const careerLevels: CareerLevel[] = [
  {
    id: 1,
    name: 'Youth Academy',
    stage: 'The Beginning',
    description: 'Start your journey from the youth academy. Learn the basics!',
    questionsCount: 5,
    requiredScore: 3,
    coinReward: 500,
    icon: '🎓',
    gradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    id: 2,
    name: 'Reserve Team',
    stage: 'Building Skills',
    description: 'Prove yourself in the reserves and fight for a first team spot.',
    questionsCount: 7,
    requiredScore: 5,
    coinReward: 750,
    icon: '⚽',
    gradient: 'from-green-500/10 to-emerald-500/10',
  },
  {
    id: 3,
    name: 'First Team Debut',
    stage: 'Breaking Through',
    description: 'Make your mark in the first team and become a regular starter.',
    questionsCount: 10,
    requiredScore: 7,
    coinReward: 1000,
    icon: '👕',
    gradient: 'from-primary/10 to-green-500/10',
  },
  {
    id: 4,
    name: 'National Team Call-Up',
    stage: 'International Stage',
    description: 'Represent your country on the international stage!',
    questionsCount: 12,
    requiredScore: 9,
    coinReward: 1500,
    icon: '🏴',
    gradient: 'from-purple-500/10 to-pink-500/10',
  },
  {
    id: 5,
    name: 'Champions League',
    stage: 'Elite Competition',
    description: 'Compete against the best clubs in Europe. Glory awaits!',
    questionsCount: 15,
    requiredScore: 12,
    coinReward: 2500,
    icon: '🌟',
    gradient: 'from-indigo-500/10 to-blue-500/10',
  },
  {
    id: 6,
    name: 'World Cup',
    stage: 'Ultimate Glory',
    description: 'Lead your nation to World Cup glory. The biggest stage of all!',
    questionsCount: 20,
    requiredScore: 16,
    coinReward: 5000,
    icon: '🏆',
    gradient: 'from-yellow-500/10 to-orange-500/10',
  },
  {
    id: 7,
    name: 'Football Legend',
    stage: 'Hall of Fame',
    description: 'Cement your legacy as one of the all-time greats!',
    questionsCount: 25,
    requiredScore: 20,
    coinReward: 10000,
    icon: '👑',
    gradient: 'from-amber-500/10 to-yellow-500/10',
  },
];

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
    <div className="min-h-screen bg-background flex flex-col">
      
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
         <div className="hidden lg:block w-[400px] border-l bg-card sticky top-0 h-[calc(100vh-60px)] z-10 shadow-xl">
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
