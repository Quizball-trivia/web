import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { AppLogo } from '../AppLogo';

interface ForgotPasswordScreenProps {
  onResetPassword: (email: string) => void;
  onBack: () => void;
}

export function ForgotPasswordScreen({ onResetPassword, onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onResetPassword(email);
    setEmailSent(true);
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
            <AppLogo size="sm" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto space-y-6">
          {!emailSent ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Forgot your password?</CardTitle>
              <CardDescription>
                  Enter your email address and we&apos;ll send you a link to reset your password
              </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    Send Reset Link
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle className="size-8 text-green-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3>Check your email</h3>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ve sent a password reset link to{' '}
                    <span className="text-foreground">{email}</span>
                  </p>
                </div>
                <div className="pt-4">
                  <Button onClick={onBack} variant="outline" size="lg" className="w-full">
                    Back to Sign In
                  </Button>
                </div>
                <div className="text-center pt-2">
                  <button
                    onClick={() => setEmailSent(false)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Didn&apos;t receive the email? Try again
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
