"use client";

import { useState } from 'react';
import { logger } from "@/utils/logger";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Copy, Share2, Users, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/utils/clipboard';

interface FriendMatchScreenProps {
  onBack: () => void;
  onCreateRoom: (roomCode: string) => void;
  onJoinRoom: (roomCode: string) => void;
  playerName?: string;
}

export function FriendMatchScreen({
  onBack,
  onCreateRoom,
  onJoinRoom,
}: FriendMatchScreenProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);

  const generateRoomCode = () => {
    // Generate a 6-character alphanumeric code
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar looking chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    setGeneratedCode(code);
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}?join=${generatedCode}`;
    
    const success = await copyToClipboard(link);
    if (success) {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyCode = async () => {
    const success = await copyToClipboard(generatedCode);
    if (success) {
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy code');
    }
  };

  const handleShare = async () => {
    const link = `${window.location.origin}?join=${generatedCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Football Trivia - Friend Match',
          text: `Join my Football Trivia match! Use code: ${generatedCode}`,
          url: link,
        });
        toast.success('Shared successfully!');
      } catch {
        // User cancelled or share failed
        logger.debug('Share failed or was cancelled');
      }
    } else {
      // Fallback to copy
      handleCopyLink();
    }
  };

  const handleJoin = () => {
    if (roomCode.trim().length !== 6) {
      toast.error('Please enter a valid 6-character room code');
      return;
    }
    onJoinRoom(roomCode.toUpperCase());
  };

  const handleStartGame = () => {
    onCreateRoom(generatedCode);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-9 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-xl">Friend Match</h1>
              <p className="text-sm text-muted-foreground">
                Play unranked with friends
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Info Card */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/20">
                <Users className="size-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-1">Unranked Match</h3>
                <p className="text-sm text-muted-foreground">
                  This match won&apos;t affect your rank, but you&apos;ll still earn coins and XP!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-secondary rounded-lg">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'create'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'join'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Join Room
          </button>
        </div>

        {/* Create Room Tab */}
        {activeTab === 'create' && (
          <div className="space-y-4">
            {!generatedCode ? (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center space-y-3">
                    <div className="size-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <LinkIcon className="size-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="mb-1">Create a Private Room</h3>
                      <p className="text-sm text-muted-foreground">
                        Generate a room code and invite your friend
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleCreateRoom} className="w-full" size="lg">
                    <LinkIcon className="size-4 mr-2" />
                    Generate Room Code
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Room Code Display */}
                <Card className="border-2 border-primary">
                  <CardContent className="pt-6 space-y-4">
                    <div className="text-center space-y-3">
                      <Badge className="bg-primary text-primary-foreground">
                        Room Code
                      </Badge>
                      <div className="text-4xl tracking-widest font-mono bg-secondary py-4 px-6 rounded-lg">
                        {generatedCode}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Share this code with your friend
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={handleCopyCode}
                        variant="outline"
                        className="w-full"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="size-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="size-4 mr-2" />
                            Copy Code
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleShare}
                        variant="outline"
                        className="w-full"
                      >
                        <Share2 className="size-4 mr-2" />
                        Share Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Waiting Status */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center space-y-3">
                      <div className="size-12 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Users className="size-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="mb-1">Waiting for Friend</h3>
                        <p className="text-sm text-muted-foreground">
                          Your friend needs to join with the code above
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Start Game Button (Demo - in real app would wait for friend) */}
                <Button onClick={handleStartGame} className="w-full" size="lg">
                  Start Game (Demo)
                </Button>

                <Button 
                  onClick={() => setGeneratedCode('')} 
                  variant="outline" 
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Join Room Tab */}
        {activeTab === 'join' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center space-y-3">
                <div className="size-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1">Join a Friend&apos;s Room</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-character room code
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Room Code</label>
                  <Input
                    type="text"
                    placeholder="ABC123"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono h-14"
                  />
                </div>

                <Button 
                  onClick={handleJoin} 
                  className="w-full" 
                  size="lg"
                  disabled={roomCode.length !== 6}
                >
                  Join Room
                </Button>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-center text-muted-foreground">
                  Ask your friend for their room code
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
