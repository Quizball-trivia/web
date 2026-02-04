import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { Mail, Lock, User, ArrowLeft, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { AppLogo } from '../AppLogo';

interface RegisterScreenProps {
  onRegister: (nickname: string, email: string, password: string) => void;
  onGoogleRegister: () => void;
  onBack: () => void;
  onSignIn: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
}

export function RegisterScreen({ 
  onRegister, 
  onGoogleRegister, 
  onBack,
  onSignIn,
  onTerms,
  onPrivacy
}: RegisterScreenProps) {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    if (!agreeToTerms) {
      alert("Please agree to the terms and conditions");
      return;
    }
    onRegister(nickname, email, password);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-40 -left-20 size-60 rounded-full bg-primary/5 blur-3xl"
          animate={{ 
            x: [0, 40, 0],
            y: [0, 30, 0],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
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
      <div className="flex-1 overflow-y-auto p-6 pb-8 relative z-10">
        <div className="max-w-md mx-auto space-y-6">
          {/* Welcome Message */}
          <motion.div 
            className="text-center space-y-2 pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl">Join quizball</h2>
              <Sparkles className="size-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Create your account and start competing
            </p>
          </motion.div>

          {/* Social Register */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-primary/10">
              <CardContent className="pt-6 space-y-3">
                <Button 
                  onClick={onGoogleRegister}
                  variant="outline" 
                  size="lg" 
                  className="w-full h-11 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                >
                  <svg className="size-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Divider */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="absolute inset-0 flex items-center">
              <Separator className="bg-border/60" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">
                Or sign up with email
              </span>
            </div>
          </motion.div>

          {/* Registration Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-primary/10">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nickname" className="text-sm">Nickname</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="nickname"
                        type="text"
                        placeholder="Choose a nickname"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="pl-10 h-11 border-primary/10 focus:border-primary/30"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 border-primary/10 focus:border-primary/30"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-11 border-primary/10 focus:border-primary/30"
                        required
                        minLength={8}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 h-11 border-primary/10 focus:border-primary/30"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-2">
                    <Checkbox 
                      id="terms" 
                      checked={agreeToTerms}
                      onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-muted-foreground leading-tight"
                    >
                      I agree to the{' '}
                      <button type="button" onClick={onTerms} className="text-primary hover:underline">
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button type="button" onClick={onPrivacy} className="text-primary hover:underline">
                        Privacy Policy
                      </button>
                    </label>
                  </div>

                  <Button type="submit" size="lg" className="w-full h-11 shadow-md shadow-primary/20">
                    Create Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sign In Link */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button onClick={onSignIn} className="text-primary hover:underline">
                Sign in
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
