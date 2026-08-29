import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { ChevronLeft, ChevronRight, LineChart as LineIcon, BarChart3 } from 'lucide-react';
import { Entry, MonthMeta } from '@/lib/types';
import { healthScore, totalsFor, effectiveCarriedOverBalance } from '@/lib/calculations';
import { addMonths, formatKr, formatPercent, monthLabel, monthShort } from '@/lib/format';
import HealthScore from './HealthScore';

const AXIS = '#64748b';
const GRID = 'rgba(255,255,255,0.06)';

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  entries: Entry[];
  getMeta: (month: string) => MonthMeta;
}

export default function AnalyticsView({ month, onMonthChange, entries, getMeta }: Props) {
  const months = useMemo(
    () => Array.from(new Set(entries.map((e) => e.month))).sort().slice(-12),
    [entries],
  );

  const byMonth = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      if (!map.has(e.month)) map.set(e.month, []);
      map.get(e.month)!.push(e);
    }
    return map;
  }, [entries]);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.month === month),
    [entries, month],
  );
  const score = useMemo(
    () => healthScore(monthEntries, effectiveCarriedOverBalance(getMeta(month)), 'operational'),
    [monthEntries, getMeta, month],
  );

  const lineData = months.map((m) => {
    const t = totalsFor(byMonth.get(m) ?? [], 'operational');
    return { name: monthShort(m), Inkomster: t.income, Utgifter: t.expenses };
  });

  const barData = months.map((m) => {
    const t = totalsFor(byMonth.get(m) ?? [], 'operational');
    return { name: monthShort(m), Sparkvot: Math.round(t.savingsRate * 100) };
  });

  if (months.length === 0 && monthEntries.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 animate-fade-in">
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <button
            onClick={() => onMonthChange(addMonths(month, -1))}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center sm:min-w-[11rem] sm:flex-none">
            <div className="text-xs uppercase tracking-wide text-slate-500">Historik & Hälsa</div>
            <div className="font-display text-lg font-bold capitalize text-slate-50">{monthLabel(month)}</div>
          </div>
          <button
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <p className="min-w-0 text-sm text-slate-500">Hälsobetyget gäller vald månads budget. Graferna visar upp till 12 månader.</p>
      </header>

      <HealthScore score={score} />

      {months.length > 0 && (
        <>
          <ChartCard title="Inkomster vs. Utgifter" subtitle="Faktisk månadsinkomst (exkl. ingående balans) · levnadskostnader" icon={<LineIcon className="h-5 w-5 text-emerald-400" />}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} className="capitalize" />
                <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip {...tooltip} formatter={(v) => formatKr(Number(v))} />
                <Legend {...legend} />
                <Line type="monotone" dataKey="Inkomster" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Utgifter" stroke="#fb7185" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Sparkvot per månad" subtitle="Andel av faktisk inkomst som sparas (exkl. ingående balans)" icon={<BarChart3 className="h-5 w-5 text-sky-400" />}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...tooltip} formatter={(v) => formatPercent(Number(v))} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="Sparkvot" radius={[6, 6, 0, 0]} fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}

const tooltip = {
  contentStyle: {
    background: '#0b111b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#e2e8f0',
    fontSize: 13,
  },
  labelStyle: { color: '#94a3b8', textTransform: 'capitalize' as const },
};

const legend = {
  iconType: 'circle' as const,
  wrapperStyle: { fontSize: 12, color: '#94a3b8' },
};

function ChartCard({ title, subtitle, icon, children }: {
  title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="card min-w-0 p-4 sm:p-5 animate-slide-up">
      <div className="mb-4 flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5">{icon}</span>
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="w-full min-w-0 overflow-x-auto">
        <div className="min-w-[20rem] sm:min-w-0">
          {children}
        </div>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="card grid place-items-center p-16 text-center text-slate-500">
      <BarChart3 className="mb-3 h-10 w-10 opacity-40" />
      <p>Ingen historik ännu. Lägg till poster under Månadsöversikt.</p>
    </div>
  );
}
