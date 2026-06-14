'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, Paperclip, X } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import type { MessageKey } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { submitFeedback, type FeedbackCategory } from '@/lib/repositories/feedback.repo';

interface ContactModalProps {
  /** Element that opens the modal (rendered inside DialogTrigger). */
  trigger: ReactNode;
}

const CATEGORIES: FeedbackCategory[] = ['bug', 'feedback', 'other'];

const MAX_FILES = 3;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Shared field styling so the inputs read on the blue brand surface.
const FIELD =
  'w-full rounded-xl border border-white/15 bg-black/20 text-white placeholder:text-white/60 ' +
  'focus-visible:border-white/40 focus-visible:ring-0';

const LABEL = 'text-xs font-bold uppercase tracking-wide text-white/90';

export function ContactModal({ trigger }: ContactModalProps) {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [message, setMessage] = useState('');
  // Email + nickname are always shown and required so we can trace reports;
  // prefilled from the account when logged in, but still editable.
  const [email, setEmail] = useState(user?.email ?? '');
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the user edited a field so async-arriving auth never clobbers
  // their input.
  const emailTouchedRef = useRef(false);
  const nicknameTouchedRef = useRef(false);

  // Auth may hydrate after mount — prefill identity when it arrives, but only if
  // the user hasn't typed anything there yet. Deferred so it doesn't setState
  // synchronously inside the effect body.
  useEffect(() => {
    const email = user?.email;
    const nickname = user?.nickname;
    if (!email && !nickname) return;
    queueMicrotask(() => {
      if (!emailTouchedRef.current && email) setEmail(email);
      if (!nicknameTouchedRef.current && nickname) setNickname(nickname);
    });
  }, [user?.email, user?.nickname]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const categoryLabel = (c: FeedbackCategory) =>
    c === 'bug'
      ? t('feedback.categoryBug')
      : c === 'feedback'
        ? t('feedback.categoryFeedback')
        : t('feedback.categoryOther');

  const reset = () => {
    setCategory('bug');
    setMessage('');
    setEmail(user?.email ?? '');
    setNickname(user?.nickname ?? '');
    setFiles([]);
    setFileError(null);
    setStatus('idle');
    emailTouchedRef.current = false;
    nicknameTouchedRef.current = false;
  };

  const handleAddFiles = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    setFileError(null);
    const incoming = Array.from(picked);
    const valid: File[] = [];
    for (const f of incoming) {
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
        setFileError(t('feedback.fileTypeInvalid'));
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        setFileError(t('feedback.fileTooLarge'));
        continue;
      }
      valid.push(f);
    }
    setFiles((prev) => {
      const next = [...prev, ...valid];
      if (next.length > MAX_FILES) {
        setFileError(t('feedback.tooManyFiles'));
        return next.slice(0, MAX_FILES);
      }
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      // Reopened — cancel any pending close-reset so it can't wipe the form.
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    } else {
      resetTimerRef.current = setTimeout(reset, 200);
    }
  };

  // Which required field (if any) is missing — drives inline validation text.
  const validationKey = useMemo((): MessageKey | null => {
    if (!nickname.trim()) return 'feedback.nicknameRequired';
    if (!email.trim()) return 'feedback.emailRequired';
    if (!emailValid) return 'feedback.emailInvalid';
    if (!message.trim()) return 'feedback.messageRequired';
    return null;
  }, [nickname, email, emailValid, message]);

  const handleSubmit = async () => {
    if (validationKey) {
      setStatus('error');
      return;
    }
    setStatus('sending');
    try {
      const attachments = files.length > 0 ? await Promise.all(files.map(readAsDataUrl)) : undefined;
      const response = await submitFeedback({
        category,
        message: message.trim(),
        email: email.trim(),
        nickname: nickname.trim(),
        context: typeof window !== 'undefined' ? window.location.pathname : undefined,
        attachments,
      });
      setStatus(response.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={cn(
          'flex max-h-[88vh] w-[95vw] max-w-md flex-col gap-0 overflow-hidden rounded-[24px]',
          'border-0 bg-brand-blue p-0 font-fun',
          '[&>button]:hidden',
        )}
      >
        {/* Close button (brand red) */}
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => handleOpenChange(false)} className="!static" />
        </div>

        {status === 'sent' ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <CheckCircle2 className="size-12 text-brand-green-light" />
            <DialogTitle className="text-xl font-black text-white">
              {t('feedback.successTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-white/75">
              {t('feedback.successBody')}
            </DialogDescription>
          </div>
        ) : (
          <>
            {/* Header (fixed) — extra right padding so the title/subtitle never
                run under the close button. */}
            <div className="px-6 pt-6 pr-20 sm:px-7 sm:pr-20">
              <DialogTitle className="text-xl font-black text-white">
                {t('feedback.title')}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-white/90">
                {t('feedback.subtitle')}
              </DialogDescription>
            </div>

            {/* Body (scrolls) */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4 sm:px-7">
              <div className="space-y-1.5">
                <label className={LABEL}>{t('feedback.category')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => {
                    const active = category === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={cn(
                          'flex min-h-[40px] items-center justify-center rounded-xl border px-1.5 py-1.5',
                          'text-center text-[11px] font-bold leading-tight transition-colors',
                          active
                            ? 'border-white bg-white text-brand-blue'
                            : 'border-white/15 bg-black/20 text-white/70 hover:border-white/40 hover:text-white',
                        )}
                      >
                        {categoryLabel(c)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="feedback-message" className={LABEL}>
                  {t('feedback.messageLabel')}
                </label>
                <Textarea
                  id="feedback-message"
                  rows={4}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder={t('feedback.messagePlaceholder')}
                  className={cn(FIELD, 'resize-none')}
                />
              </div>

              {/* Who's reporting — always required so we can trace the report. */}
              <div className="space-y-1.5">
                <label htmlFor="feedback-nickname" className={LABEL}>
                  {t('feedback.nicknameLabel')} <span className="text-brand-yellow">*</span>
                </label>
                <Input
                  id="feedback-nickname"
                  value={nickname}
                  onChange={(e) => {
                    nicknameTouchedRef.current = true;
                    setNickname(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder={t('feedback.nicknamePlaceholder')}
                  className={FIELD}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="feedback-email" className={LABEL}>
                  {t('feedback.emailLabel')} <span className="text-brand-yellow">*</span>
                </label>
                <Input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    emailTouchedRef.current = true;
                    setEmail(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder={t('feedback.emailPlaceholder')}
                  className={FIELD}
                />
              </div>

              {/* Attachments */}
              <div className="space-y-1.5">
                <label className={LABEL}>{t('feedback.attachmentsLabel')}</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAddFiles(e.target.files)}
                />
                {files.length > 0 && (
                  <ul className="space-y-1.5">
                    {files.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5"
                      >
                        <Paperclip className="size-3.5 shrink-0 text-white/50" />
                        <span className="min-w-0 flex-1 truncate text-xs text-white/80">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          aria-label={t('feedback.removeFile')}
                          className="shrink-0 text-white/50 hover:text-white"
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {files.length < MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/25 px-3 py-2 text-xs font-bold text-white/70 transition-colors hover:border-white/50 hover:text-white"
                  >
                    <Paperclip className="size-3.5" />
                    {t('feedback.addFile')}
                  </button>
                )}
                <p className="text-[11px] text-white/65">{t('feedback.attachmentsHint')}</p>
                {fileError && <p className="text-xs font-bold text-brand-yellow">{fileError}</p>}
              </div>

              {status === 'error' && (
                <p className="text-sm font-bold text-brand-yellow">
                  {validationKey ? t(validationKey) : t('feedback.error')}
                </p>
              )}
            </div>

            {/* Footer (pinned) — Send is always visible */}
            <div className="border-t border-white/10 px-6 py-4 sm:px-7">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={status === 'sending'}
                className={cn(
                  'flex h-12 w-full items-center justify-center rounded-2xl bg-brand-yellow',
                  'font-poppins text-sm font-black uppercase tracking-wide text-black',
                  'transition-colors hover:bg-brand-yellow-deep active:translate-y-[1px]',
                  'disabled:opacity-60',
                )}
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t('feedback.sending')}
                  </>
                ) : (
                  t('feedback.send')
                )}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
