import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft } from "lucide-react";

interface PrivacyPolicyScreenProps {
  onBack: () => void;
}

export function PrivacyPolicyScreen({ onBack }: PrivacyPolicyScreenProps) {
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
            <h1 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl text-foreground">Privacy Policy</h1>
            <p className="mb-8 text-sm text-muted-foreground">Last updated: January 30, 2026</p>
            
            <div className="space-y-8 text-sm leading-relaxed text-muted-foreground/90 md:text-base">
              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">1. Introduction</h2>
                <p>
                  QuizBall (&quot;us&quot;, &quot;we&quot;, or &quot;our&quot;) operates the quizball.com website and mobile application (the &quot;Service&quot;). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">2. Information Collection and Use</h2>
                <p>
                  We collect several different types of information for various purposes to provide and improve our Service to you:
                  <br /><br />
                  <strong>Personal Data:</strong> While using our Service, we may ask you to provide certain personally identifiable information (e.g., Email address, Nickname).
                  <br />
                  <strong>Usage Data:</strong> We may also collect information on how the Service is accessed and used (e.g., gameplay statistics, device information).
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">3. Use of Data</h2>
                <p>
                  QuizBall uses the collected data for various purposes:
                  <br />• To provide and maintain the Service
                  <br />• To notify you about changes to our Service
                  <br />• To allow you to participate in interactive features
                  <br />• To provide customer care and support
                  <br />• To monitor the usage of the Service
                </p>
              </section>
              
              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">4. Data Security</h2>
                <p>
                  The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">5. Third-Party Services</h2>
                <p>
                  We may employ third party companies and individuals to facilitate our Service (&quot;Service Providers&quot;), to provide the Service on our behalf, or to assist us in analyzing how our Service is used. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">6. Children&apos;s Privacy</h2>
                <p>
                  Our Service does not address anyone under the age of 13 (&quot;Children&quot;). We do not knowingly collect personally identifiable information from anyone under the age of 13.
                </p>
              </section>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
