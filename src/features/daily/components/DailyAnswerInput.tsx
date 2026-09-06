"use client";

/** Typed-answer field + submit, styled exactly like the ranked Who Am I board
 *  (CluesBoard): blue pill input, green pill button, stacked. */
export function DailyAnswerInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-4 space-y-2">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        aria-label={placeholder}
        className="font-poppins h-14 w-full rounded-[20px] border-none bg-brand-blue px-5 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none disabled:opacity-50"
        style={{ fontWeight: 600, letterSpacing: "0.08em", boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={!value.trim() || disabled}
        className="font-poppins h-14 w-full rounded-[20px] bg-brand-green uppercase text-white outline-none transition-colors hover:bg-brand-green-deep disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.06em", boxShadow: "0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)" }}
      >
        {submitLabel}
      </button>
    </div>
  );
}
