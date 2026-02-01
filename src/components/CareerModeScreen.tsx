import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Trophy, Lock, CheckCircle2, Star, Target } from 'lucide-react';
import { useState } from 'react';

interface CareerLevel {
  id: number;
  name: string;
  stage: string;
  description: string;
  questionsCount: number;
  requiredScore: number;
  coinReward: number;
  icon: string;
  gradient: string;
  borderColor: string;
  bgColor: string;
}

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
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/20',
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
    borderColor: 'border-green-500/30',
    bgColor: 'bg-green-500/20',
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
    borderColor: 'border-primary/30',
    bgColor: 'bg-primary/20',
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
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/20',
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
    borderColor: 'border-indigo-500/30',
    bgColor: 'bg-indigo-500/20',
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
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/20',
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
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/20',
  },
];

interface CareerModeScreenProps {
  onBack: () => void;
  onSelectLevel: (levelId: number, levelName: string, questionsCount: number) => void;
  completedLevels: Set<number>;
  levelScores: Map<number, number>;
}

export function CareerModeScreen({ 
  onBack, 
  onSelectLevel,
  completedLevels,
  levelScores
}: CareerModeScreenProps) {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const isLevelUnlocked = (levelId: number) => {
    if (levelId === 1) return true;
    return completedLevels.has(levelId - 1);
  };

  const getLevelStars = (levelId: number) => {
    const score = levelScores.get(levelId) || 0;
    const level = careerLevels.find(l => l.id === levelId);
    if (!level) return 0;
    
    const percentage = (score / level.questionsCount) * 100;
    if (percentage >= 90) return 3;
    if (percentage >= 70) return 2;
    if (percentage >= level.requiredScore / level.questionsCount * 100) return 1;
    return 0;
  };

  const completedCount = completedLevels.size;
  const totalLevels = careerLevels.length;
  const progressPercentage = (completedCount / totalLevels) * 100;

  // Map coordinates for each level (percentage-based positioning)
  const levelPositions = [
    { x: 15, y: 75 },  // Youth Academy - bottom left (local start)
    { x: 25, y: 65 },  // Reserve Team - nearby
    { x: 35, y: 55 },  // First Team Debut - moving up
    { x: 45, y: 45 },  // National Team - center
    { x: 60, y: 35 },  // Champions League - Europe
    { x: 75, y: 25 },  // World Cup - reaching the world
    { x: 85, y: 15 },  // Football Legend - top of the world
  ];

  const selectedLevelData = selectedLevel ? careerLevels.find(l => l.id === selectedLevel) : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onBack}
            className="flex size-10 items-center justify-center rounded-full hover:bg-secondary active:scale-95 transition-all"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl">Career Mode</h1>
            <p className="text-sm text-muted-foreground">
              Rise from academy to legend
            </p>
          </div>
          {/* View Toggle */}
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded text-sm transition-all ${
                viewMode === 'map' 
                  ? 'bg-primary text-white' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🗺️ Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm transition-all ${
                viewMode === 'list' 
                  ? 'bg-primary text-white' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📋 List
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Career Progress</span>
            <span className="text-primary">{completedCount}/{totalLevels} Completed</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-green-400 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {viewMode === 'map' ? (
        // World Map View
        <div className="p-4 space-y-4">
          {/* Map Container */}
          <Card className="bg-gradient-to-br from-blue-950/20 via-green-950/20 to-purple-950/20 border-2 border-primary/20 overflow-hidden">
            <CardContent className="p-0">
              <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-sky-950/30 to-green-950/30">
                {/* Stylized World Map Background */}
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full opacity-10"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Simple continent shapes */}
                  <path
                    d="M 10 60 Q 15 55 20 60 L 25 65 L 30 60 L 35 65 L 30 70 L 25 75 L 20 70 L 15 75 L 10 70 Z"
                    fill="currentColor"
                  />
                  <path
                    d="M 40 40 Q 50 35 60 40 L 70 35 L 75 40 L 80 35 L 85 40 L 80 50 L 75 55 L 70 50 L 65 55 L 60 50 L 55 55 L 50 50 L 45 55 L 40 50 Z"
                    fill="currentColor"
                  />
                  <path
                    d="M 70 60 Q 75 55 80 60 L 85 65 L 90 60 L 90 70 L 85 75 L 80 70 L 75 75 L 70 70 Z"
                    fill="currentColor"
                  />
                </svg>

                {/* Grid lines for depth */}
                <div className="absolute inset-0">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={`h-${i}`}
                      className="absolute w-full border-t border-white/5"
                      style={{ top: `${i * 10}%` }}
                    />
                  ))}
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={`v-${i}`}
                      className="absolute h-full border-l border-white/5"
                      style={{ left: `${i * 10}%` }}
                    />
                  ))}
                </div>

                {/* Progression Path */}
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#facc15" stopOpacity="0.5" />
                    </linearGradient>
                  </defs>
                  
                  {/* Draw path between levels */}
                  {levelPositions.map((pos, index) => {
                    if (index === levelPositions.length - 1) return null;
                    const nextPos = levelPositions[index + 1];
                    const isCompleted = completedLevels.has(index + 1);
                    
                    return (
                      <line
                        key={`path-${index}`}
                        x1={pos.x}
                        y1={pos.y}
                        x2={nextPos.x}
                        y2={nextPos.y}
                        stroke={isCompleted ? "url(#pathGradient)" : "#ffffff"}
                        strokeWidth="0.5"
                        strokeOpacity={isCompleted ? "1" : "0.15"}
                        strokeDasharray={isCompleted ? "0" : "2,2"}
                      />
                    );
                  })}
                </svg>

                {/* Level Markers */}
                {careerLevels.map((level, index) => {
                  const pos = levelPositions[index];
                  const unlocked = isLevelUnlocked(level.id);
                  const completed = completedLevels.has(level.id);
                  const stars = getLevelStars(level.id);
                  const isSelected = selectedLevel === level.id;
                  const isNext = !completed && unlocked;

                  return (
                    <div
                      key={level.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      onClick={() => {
                        if (unlocked) {
                          setSelectedLevel(isSelected ? null : level.id);
                        }
                      }}
                    >
                      {/* Pulsing ring for next level */}
                      {isNext && (
                        <div className="absolute inset-0 -m-3">
                          <div className="size-[3.5rem] rounded-full border-2 border-primary animate-ping opacity-75" />
                        </div>
                      )}

                      {/* Level Marker */}
                      <div
                        className={`relative size-12 rounded-full flex items-center justify-center text-2xl transition-all border-2 ${
                          completed
                            ? 'bg-gradient-to-br from-green-600 to-green-500 border-green-400 shadow-lg shadow-green-500/50'
                            : unlocked
                            ? `${level.bgColor} ${level.borderColor} shadow-lg hover:scale-110`
                            : 'bg-secondary/50 border-secondary opacity-50'
                        } ${isSelected ? 'scale-125 ring-4 ring-primary/50' : ''}`}
                      >
                        {unlocked ? level.icon : <Lock className="size-5 text-muted-foreground" />}
                        
                        {/* Completion Badge */}
                        {completed && (
                          <div className="absolute -top-1 -right-1 size-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                            <CheckCircle2 className="size-3 text-white" />
                          </div>
                        )}

                        {/* Level Number Badge */}
                        <div className="absolute -bottom-1 -right-1 size-5 bg-background rounded-full flex items-center justify-center text-[10px] border-2 border-current">
                          {level.id}
                        </div>

                        {/* Stars for completed levels */}
                        {completed && stars > 0 && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                            {[...Array(stars)].map((_, i) => (
                              <Star
                                key={i}
                                className="size-2 fill-yellow-500 text-yellow-500"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Level Name */}
                      <div className={`absolute top-full mt-1 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-[10px] text-center px-2 py-0.5 rounded ${
                        unlocked ? 'bg-background/90 text-foreground' : 'bg-background/50 text-muted-foreground'
                      }`}>
                        {level.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Level Details */}
          {selectedLevelData && (
            <Card className={`border-2 bg-gradient-to-br ${selectedLevelData.gradient} ${selectedLevelData.borderColor} animate-in slide-in-from-bottom-4`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-3">
                  <div className={`flex size-14 shrink-0 items-center justify-center rounded-full ${selectedLevelData.bgColor} text-2xl`}>
                    {selectedLevelData.icon}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{selectedLevelData.name}</span>
                      <Badge variant="outline" className="text-xs">
                        Level {selectedLevelData.id}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {selectedLevelData.stage}
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      {selectedLevelData.description}
                    </p>

                    <div className="flex items-center gap-4 mb-3 text-xs flex-wrap">
                      <div className="flex items-center gap-1">
                        <Target className="size-3 text-primary" />
                        <span>{selectedLevelData.questionsCount} Questions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="size-3 text-yellow-600" />
                        <span>{selectedLevelData.requiredScore}+ to pass</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-600">💰</span>
                        <span>+{selectedLevelData.coinReward}</span>
                      </div>
                    </div>

                    {completedLevels.has(selectedLevelData.id) ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`size-4 ${
                                s <= getLevelStars(selectedLevelData.id)
                                  ? 'fill-yellow-500 text-yellow-500'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-sm">
                          <span className="text-green-600">{levelScores.get(selectedLevelData.id)}</span>
                          <span className="text-muted-foreground">/{selectedLevelData.questionsCount}</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (isLevelUnlocked(selectedLevelData.id)) {
                            onSelectLevel(selectedLevelData.id, selectedLevelData.name, selectedLevelData.questionsCount);
                          }
                        }}
                        disabled={!isLevelUnlocked(selectedLevelData.id)}
                        className={`w-full py-2 rounded-lg transition-all ${
                          isLevelUnlocked(selectedLevelData.id)
                            ? 'bg-gradient-to-r from-primary to-green-400 text-white hover:shadow-lg hover:shadow-primary/50 active:scale-95'
                            : 'bg-secondary text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        {isLevelUnlocked(selectedLevelData.id) ? '⚡ Start Level' : '🔒 Locked'}
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Start Next Level */}
          {!selectedLevel && (() => {
            const nextLevel = careerLevels.find(l => !completedLevels.has(l.id) && isLevelUnlocked(l.id));
            if (!nextLevel) return null;
            
            return (
              <Card className="bg-gradient-to-r from-primary/10 to-green-500/10 border-primary/30">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{nextLevel.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Up Next</div>
                      <div className="font-semibold">{nextLevel.name}</div>
                    </div>
                    <button
                      onClick={() => onSelectLevel(nextLevel.id, nextLevel.name, nextLevel.questionsCount)}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-green-400 text-white rounded-lg hover:shadow-lg hover:shadow-primary/50 active:scale-95 transition-all"
                    >
                      Start
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Map Legend */}
          <Card className="bg-secondary/50">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-around text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-full bg-gradient-to-br from-green-600 to-green-500 border border-green-400" />
                  <span className="text-muted-foreground">Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-full bg-primary/20 border-2 border-primary/30" />
                  <span className="text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-full bg-secondary/50 border border-secondary opacity-50" />
                  <span className="text-muted-foreground">Locked</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-secondary/50">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground text-center">
                💡 Each level uses <span className="text-primary">Time Attack</span> mode with 3 help buttons (50/50, Clue, Change Question). Complete levels to unlock the next stage of your career!
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        // List View (Original)
        <div className="p-4 space-y-4">
          {careerLevels.map((level) => {
            const unlocked = isLevelUnlocked(level.id);
            const completed = completedLevels.has(level.id);
            const stars = getLevelStars(level.id);
            const score = levelScores.get(level.id);

            return (
              <Card
                key={level.id}
                className={`border-2 bg-gradient-to-br ${level.gradient} ${level.borderColor} ${
                  unlocked ? 'cursor-pointer active:scale-[0.98]' : 'opacity-60'
                } transition-all`}
                onClick={() => unlocked && onSelectLevel(level.id, level.name, level.questionsCount)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex gap-3">
                    {/* Level Icon */}
                    <div className={`flex size-14 shrink-0 items-center justify-center rounded-full ${level.bgColor} text-2xl relative`}>
                      {unlocked ? (
                        <>
                          {level.icon}
                          {completed && (
                            <div className="absolute -top-1 -right-1 size-5 bg-green-600 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="size-3 text-white" />
                            </div>
                          )}
                        </>
                      ) : (
                        <Lock className="size-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Level Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold">{level.name}</span>
                            <Badge variant="outline" className="text-xs">
                              Level {level.id}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {level.stage}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {level.description}
                      </p>

                      {/* Level Stats */}
                      <div className="flex items-center gap-4 mb-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Target className="size-3 text-primary" />
                          <span>{level.questionsCount} Questions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="size-3 text-yellow-600" />
                          <span>{level.requiredScore}+ to pass</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-600">💰</span>
                          <span>+{level.coinReward}</span>
                        </div>
                      </div>

                      {/* Stars or Score */}
                      {completed && score !== undefined ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3].map((s) => (
                              <Star
                                key={s}
                                className={`size-4 ${
                                  s <= stars
                                    ? 'fill-yellow-500 text-yellow-500'
                                    : 'text-muted-foreground/30'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="text-sm">
                            <span className="text-green-600">{score}</span>
                            <span className="text-muted-foreground">/{level.questionsCount}</span>
                          </div>
                        </div>
                      ) : unlocked ? (
                        <Badge className="bg-gradient-to-r from-primary to-green-400 text-white">
                          ⚡ Start Level
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          🔒 Complete Level {level.id - 1} to unlock
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Info Card */}
          <Card className="bg-secondary/50">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground text-center">
                💡 Each level uses <span className="text-primary">Time Attack</span> mode with 3 help buttons (50/50, Clue, Change Question). Complete levels to unlock the next stage of your career!
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}