import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Check, Globe } from 'lucide-react';
import { useLocale } from './LocaleContext';
import { LOCALES } from '../data/locales';

interface LanguageSelectorProps {
  compact?: boolean;
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { locale, setLocale } = useLocale();

  if (compact) {
    return (
      <div className="flex gap-2">
        {LOCALES.map((lang) => (
          <Button
            key={lang.code}
            variant={locale === lang.code ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLocale(lang.code)}
            className="gap-2"
          >
            <span className="text-base">{lang.flag}</span>
            <span>{lang.nativeName}</span>
            {locale === lang.code && <Check className="size-3.5 ml-1" />}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="size-5 text-primary" />
          {locale === 'en' ? 'Language / ენა' : 'ენა / Language'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {LOCALES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLocale(lang.code)}
              className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                locale === lang.code
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{lang.flag}</span>
                <div className="text-left">
                  <div className="text-sm font-medium">{lang.nativeName}</div>
                  <div className="text-xs text-muted-foreground">{lang.name}</div>
                </div>
              </div>
              {locale === lang.code && (
                <div className="flex items-center justify-center size-6 rounded-full bg-primary">
                  <Check className="size-4 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            {locale === 'en' 
              ? 'Questions and interface will be displayed in the selected language'
              : 'კითხვები და ინტერფეისი გამოჩნდება არჩეულ ენაზე'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
