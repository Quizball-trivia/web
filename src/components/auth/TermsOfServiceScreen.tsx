import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft } from "lucide-react";

interface TermsOfServiceScreenProps {
  onBack: () => void;
}

export function TermsOfServiceScreen({ onBack }: TermsOfServiceScreenProps) {
  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground animate-in fade-in duration-300">
      <header className="flex h-16 items-center border-b border-border/40 px-6 backdrop-blur-xl shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      </header>
      
      <ScrollArea className="flex-1">
        <div className="container mx-auto max-w-3xl px-6 py-12">
          <div className="glass-card mb-8 p-8 md:p-12 border-none">
            <h1 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl text-foreground">Terms of Service</h1>
            <p className="mb-8 text-sm text-muted-foreground">Last updated: January 30, 2026</p>
            
            <div className="space-y-8 text-sm leading-relaxed text-muted-foreground/90 md:text-base">
              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using QuizBall (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">2. Description of Service</h2>
                <p>
                  QuizBall is a real-time multiplayer football trivia game. We provide a platform for users to compete in quiz matches, earn ratings, and track their progress. We reserve the right to modify or discontinue the Service at any time without notice.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">3. User Accounts</h2>
                <p>
                  You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities that occur under your account. We reserve the right to terminate accounts that violate our community guidelines or cheat in competitive play.
                </p>
              </section>
              
              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">4. Virtual Currency and Items</h2>
                <p>
                  The Service may include virtual currency (&quot;Coins&quot;) or items. These items have no real-world value and cannot be exchanged for cash. We do not guarantee, and are not responsible for, the persistence of user data or virtual items.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">5. Prohibited Conduct</h2>
                <p>
                  You agree not to use the Service for any unlawful purpose or to:
                  <br />• Harass, abuse, or harm another person.
                  <br />• Use bots, cheats, or automation software.
                  <br />• Interfere with the proper operation of the Service.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
                <p>
                  In no event shall QuizBall, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                </p>
              </section>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
