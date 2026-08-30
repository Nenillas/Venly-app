import { CalendarDays } from 'lucide-react';
import { swedishDayOrdinal } from '@/lib/payday';
import { SensitiveKr } from '@/components/SensitiveKr';

interface Props {
  dailyAmount: number;
  remainingDays: number;
  paydayDay: number;
}

export default function DailyAllowanceBadge({ dailyAmount, remainingDays, paydayDay }: Props) {
  const dayWord = remainingDays === 1 ? 'dag' : 'dagar';
  return (
    <div className="flex min-w-0 w-full items-start gap-2.5 rounded-lg border border-zinc-700/50 bg-zinc-800/80 p-3 sm:w-auto sm:max-w-[18rem] sm:shrink-0">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/[0.04] text-zinc-300">
        <CalendarDays className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-300">Kvar per dag</div>
        <div className="stat-num text-base font-bold text-zinc-100 sm:text-lg">
          <SensitiveKr value={dailyAmount} numberOnly suffix=" / dag" />
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
          ({remainingDays} {dayWord} till lön den {swedishDayOrdinal(paydayDay)})
        </p>
      </div>
    </div>
  );
}
