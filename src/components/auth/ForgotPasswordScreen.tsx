import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { AppLogo } from '../AppLogo';
import { useLocale } from '@/contexts/LocaleContext';
import { validateEmail } from '@/lib/auth/validation';

interface ForgotPasswordScreenProps {
  /** Resolves when the request completes; rejects on failure. */
  onResetPassword: (email: string) => Promise<void>;
  onBack: () => void;
}

export function ForgotPasswordScreen({ onResetPassword, onBack }: ForgotPasswordScreenProps) {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorKey = validateEmail(email);
    if (errorKey) {
      setEmailError(t(errorKey));
      return;
    }
    setEmailError(null);
    setSubmitting(true);
    try {
      await onResetPassword(email);
      // Only reveal the generic success AFTER the request succeeds, and never
      // confirm whether an account exists for that address.
      setSent(true);
    } catch {
      setEmailError(t('forgotPassword.sendFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto space-y-6">
          {!sent ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('forgotPassword.title')}</CardTitle>
                <CardDescription>{t('forgotPassword.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('forgotPassword.emailLabel')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('forgotPassword.emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        disabled={submitting}
                        autoComplete="email"
                      />
                    </div>
                    {emailError ? (
                      <p className="text-sm text-brand-red-soft">{emailError}</p>
                    ) : null}
                  </div>

                  <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                    {submitting ? t('forgotPassword.sending') : t('forgotPassword.sendResetLink')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-brand-green/10">
                    <CheckCircle className="size-8 text-brand-green" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3>{t('forgotPassword.checkEmail')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('forgotPassword.genericSuccess')}
                  </p>
                </div>
                <div className="pt-4">
                  <Button onClick={onBack} variant="outline" size="lg" className="w-full">
                    {t('forgotPassword.backToSignIn')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
