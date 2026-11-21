import { numberSequence, optionDirection } from "@/lib/direction";

export function IsolatedText({ text, className = "" }: { text: string; className?: string }) {
  const pieces = numberSequence(text);
  if (!pieces) {
    return (
      <span dir={optionDirection(text)} className={className} style={{ unicodeBidi: "isolate" }}>
        {text}
      </span>
    );
  }
  return (
    <span dir="ltr" className={`ltr-sequence ${className}`} style={{ direction: "ltr", unicodeBidi: "isolate" }}>
      {pieces.map((piece, index) => (
        <span key={`${piece}-${index}`} dir="ltr" className="tabular-nums">
          {index > 0 ? <span aria-hidden="true">, </span> : null}
          {`\u2066${piece}\u2069`}
        </span>
      ))}
    </span>
  );
}

export function ChoiceGrid({ options }: { options: string[] }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {options.map((option, index) => (
        <div
          key={`${index}-${option}`}
          className="flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-paper px-3 py-3 shadow-[3px_3px_0_var(--shadow)]"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-[2.5px] border-ink bg-card text-sm font-black tabular-nums">
            {index + 1}
          </span>
          <IsolatedText text={option} className="min-w-0 flex-1 text-base font-bold leading-7" />
        </div>
      ))}
    </div>
  );
}
