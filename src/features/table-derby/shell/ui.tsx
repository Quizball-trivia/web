'use client';

/** Betsson-platform primitives for the Table Derby shell (see
 *  docs/TABLE-DERBY-BETSSON-DESIGN-REFERENCE.md). Flat surfaces, 12px
 *  groups, orange toggles, white-on-orange CTAs. Match screens keep the
 *  show's sticker components in ./components instead. */

import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BsGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('bs-group', className)}>{children}</div>;
}

export function BsRow({
  icon,
  label,
  sub,
  trailing,
  onClick,
  chevron = !!onClick,
}: {
  icon?: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
}) {
  const body = (
    <>
      {icon && <span className="flex size-5 shrink-0 items-center justify-center text-[var(--bs-text)]">{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="bs-text truncate text-[14px] font-bold">{label}</span>
        {sub && <span className="bs-text truncate text-[11px] text-[var(--bs-text-3)]">{sub}</span>}
      </span>
      {trailing}
      {chevron && <ChevronRight size={18} className="shrink-0 text-[var(--bs-text-3)]" />}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="bs-row">
      {body}
    </button>
  ) : (
    <div className="bs-row">{body}</div>
  );
}

export function BsToggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors"
      style={{ background: on ? 'var(--bs-primary)' : 'var(--bs-toggle-off)' }}
    >
      <span
        className="absolute top-[3px] size-5 rounded-full bg-white transition-[left]"
        style={{ left: on ? 23 : 3 }}
      />
    </button>
  );
}

export function BsButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
}) {
  const styles =
    variant === 'primary'
      ? { background: 'var(--bs-primary)', color: 'var(--bs-on-primary)' }
      : variant === 'danger'
        ? { background: 'var(--bs-surface)', color: 'var(--bs-danger)' }
        : { background: 'var(--bs-surface)', color: 'var(--bs-text)' };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'bs-text w-full rounded-[8px] px-4 py-3.5 text-[14px] font-bold transition-transform active:scale-[0.98]',
        disabled && 'cursor-not-allowed',
        className,
      )}
      style={disabled ? { background: 'var(--bs-border)', color: 'var(--bs-text-3)' } : styles}
    >
      {children}
    </button>
  );
}

export function NewBadge({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-bold leading-[14px] text-white"
      style={{ background: 'var(--bs-new)' }}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ children, badge }: { children: ReactNode; badge?: ReactNode }) {
  return (
    <h3 className="bs-display flex items-center gap-2 px-0.5 text-[16px] text-[var(--bs-text)]">
      {children}
      {badge}
    </h3>
  );
}

export function GroupLabel({ children }: { children: ReactNode }) {
  return <p className="bs-text -mb-1.5 px-1 text-[12px] text-[var(--bs-text-3)]">{children}</p>;
}

export function Pill({ children, tone = 'dark', className }: { children: ReactNode; tone?: 'dark' | 'orange'; className?: string }) {
  return (
    <span
      className={cn('bs-text inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold', className)}
      style={
        tone === 'orange'
          ? { background: 'var(--bs-primary)', color: 'var(--bs-on-primary)' }
          : { background: 'var(--bs-surface)', color: 'var(--bs-text)', boxShadow: 'inset 0 0 0 1px var(--bs-border)' }
      }
    >
      {children}
    </span>
  );
}

/** Circular avatar frame with the Betsson orange ring. */
export function AvatarRing({ children, size = 40, ring = true }: { children: ReactNode; size?: number; ring?: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: 'var(--bs-surface)',
        boxShadow: ring ? '0 0 0 2px var(--bs-page), 0 0 0 4px var(--bs-primary)' : undefined,
      }}
    >
      {children}
    </span>
  );
}

/** Minimal accessible dialog for the prototype: scrim click + Escape close,
 *  focus moves into the dialog on open and returns on close. */
export function BsDialog({
  title,
  onClose,
  children,
  className,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, [href], input, [tabindex]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('relative w-full max-w-sm rounded-[14px] px-5 py-5', className)}
        style={{ background: 'var(--bs-surface-2)', border: '1px solid var(--bs-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
