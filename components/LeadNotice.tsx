"use client";

import { unreachableLead } from "@/lib/gameReducer";
import { useGame } from "./GameProvider";
import { Button, Dialog, Panel } from "./ui";

export function LeadNotice() {
  const { dispatch, state } = useGame();
  if (state.phase !== "board") return null;
  const lead = unreachableLead(state);
  if (!lead) return null;
  const capped = lead.multiplier >= 32;

  return (
    <Dialog titleId="lead-title" onClose={() => undefined}>
      <Panel className="grid w-full max-w-lg gap-4 p-5">
        <div>
          <p className="kicker">فارق حاسم</p>
          <h2 id="lead-title" className="mt-3 text-2xl font-black">
            تقدم {lead.leaderName} لا يُغلق
          </h2>
        </div>
        <p className="text-sm leading-7">
          الفارق {lead.gap} نقطة، ومجموع الأسئلة المتبقية {lead.remaining} نقطة. حتى لو أخذ {lead.challengerName} كل ما تبقى، يبقى خلف {lead.leaderName}.
        </p>
        <p className="text-sm text-muted">
          {capped
            ? "المضاعفة بلغت حدها. الإنهاء ينقل المباراة إلى المنصة."
            : `مضاعفة الأسئلة المتبقية تجعل قيمتها ×${lead.multiplier * 2}.`}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            className="w-full"
            disabled={capped}
            onClick={() => dispatch({ type: "DOUBLE_REMAINING" })}
          >
            مضاعفة المتبقي
          </Button>
          <Button variant="danger" className="w-full" onClick={() => dispatch({ type: "END_MATCH" })}>
            إنهاء المباراة
          </Button>
        </div>
      </Panel>
    </Dialog>
  );
}
