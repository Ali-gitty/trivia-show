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

export function ChoiceGrid({ options, compact = false }: { options: string[] ; compact?: boolean }) {
  return (
    <div className={`grid shrink-0 gap-2 sm:grid-cols-2 ${compact ? "mt-2" : "mt-3"}`}>
      {options.map((option, index) => (
        <div
          key={`${index}-${option}`}
          className={`flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-paper shadow-[3px_3px_0_var(--shadow)] ${
            compact ? "px-2.5 py-2" : "px-3 py-2.5"
          }`}
        >
          <span
            className={`grid shrink-0 place-items-center rounded-xl border-[2.5px] border-ink bg-card text-sm font-black tabular-nums ${
              compact ? "h-8 w-8" : "h-9 w-9"
            }`}
          >
            {index + 1}
          </span>
          <IsolatedText
            text={option}
            className={`min-w-0 flex-1 font-bold ${compact ? "text-sm leading-5" : "text-base leading-6"}`}
          />
        </div>
      ))}
    </div>
  );
}
