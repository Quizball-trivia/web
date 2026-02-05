import { useState } from "react";
import { Copy, Plus, Lock, Globe, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getSocket } from "@/lib/realtime/socket-client";
import { useRouter } from "next/navigation";

interface CreateJoinPanelProps {
  onActionTriggered?: () => void;
}

export function CreateJoinPanel({ onActionTriggered }: CreateJoinPanelProps) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreate = () => {
    if (onActionTriggered) onActionTriggered();
    setIsCreating(true);
    getSocket().emit("lobby:create", { mode: "friendly", isPublic });
    
    // We rely on the socket event listener elsewhere to navigate, 
    // or we can optimistically navigate if we had the code (which we don't yet).
    // For now, let's just show a loading state until the lobby:state event fires.
    // In a real app, we'd wait for an ack or the lobby:state event.
    
    toast.info("Creating room...");
  };

  const handleJoin = () => {
    if (!inviteCode || inviteCode.length < 3) {
      toast.error("Please enter a valid code");
      return;
    }

    if (onActionTriggered) onActionTriggered();
    setIsJoining(true);
    getSocket().emit("lobby:join_by_code", { inviteCode: inviteCode.toUpperCase() });
    
    toast.info(`Joining ${inviteCode.toUpperCase()}...`);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
      {/* Create Room Card */}
      <Card className="border-border bg-card/50 backdrop-blur-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
         <div className="absolute top-0 left-0 w-1 bg-primary h-full opacity-50 group-hover:opacity-100 transition-opacity" />
         <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
                  <Plus className="size-4" /> Create Room
               </div>
               <h3 className="text-2xl font-bold">Start a New Lobby</h3>
               <p className="text-muted-foreground text-sm">
                  Host a match and invite a friend, or open it up for anyone to join.
               </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
               <div className="space-y-1">
                  <Label htmlFor="public-mode" className="font-semibold flex items-center gap-2">
                     {isPublic ? <Globe className="size-4 text-blue-400" /> : <Lock className="size-4 text-muted-foreground" />}
                     Public Room
                  </Label>
                  <p className="text-xs text-muted-foreground">
                     {isPublic ? "Anyone can find and join this room." : "Only people with the code can join."}
                  </p>
               </div>
               <Switch 
                  id="public-mode" 
                  checked={isPublic} 
                  onCheckedChange={setIsPublic} 
               />
            </div>

            <Button 
               size="lg" 
               className="w-full font-bold h-12 text-base shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]"
               onClick={handleCreate}
               disabled={isCreating}
            >
               {isCreating ? (
                  <>
                     <Loader2 className="size-5 mr-2 animate-spin" /> Creating...
                  </>
               ) : (
                  "Create Room"
               )}
            </Button>
         </CardContent>
      </Card>

      {/* Join Room Card */}
      <Card className="border-border bg-card/50 backdrop-blur-sm relative overflow-hidden group hover:border-blue-500/50 transition-colors">
         <div className="absolute top-0 left-0 w-1 bg-blue-500 h-full opacity-50 group-hover:opacity-100 transition-opacity" />
         <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-blue-500 font-bold uppercase tracking-wider text-xs">
                  <ArrowRight className="size-4" /> Join Room
               </div>
               <h3 className="text-2xl font-bold">Have a Code?</h3>
               <p className="text-muted-foreground text-sm">
                  Enter the invite code shared by your friend to jump into their lobby.
               </p>
            </div>

            <div className="space-y-2">
               <Label htmlFor="invite-code">Invite Code</Label>
               <div className="flex gap-2">
                  <div className="relative flex-1">
                     <Input 
                        id="invite-code"
                        placeholder="e.g. AB12" 
                        className="h-12 text-lg font-mono uppercase tracking-widest text-center bg-background"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        maxLength={8}
                     />
                     <Copy className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground opacity-50" />
                  </div>
               </div>
            </div>

            <Button 
               size="lg" 
               variant="outline"
               className="w-full font-bold h-12 text-base border-2 hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-500 transition-all active:scale-[0.98]"
               onClick={handleJoin}
               disabled={isJoining || !inviteCode}
            >
               {isJoining ? (
                  <>
                     <Loader2 className="size-5 mr-2 animate-spin" /> Joining...
                  </>
               ) : (
                  "Join Lobby"
               )}
            </Button>
         </CardContent>
      </Card>
    </div>
  );
}
