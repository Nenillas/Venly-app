import VenlyLogo from '@/components/VenlyLogo';

export default function MissingConfigScreen() {
  return (
    <div className="grid min-h-dvh min-h-screen place-items-center px-4 py-10">
      <div className="card w-full max-w-lg p-6 text-center">
        <VenlyLogo size={40} className="mx-auto mb-4" />
        <h1 className="font-display text-xl font-bold text-slate-50">Venly är inte konfigurerad</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Produktionsbygget saknar Supabase-nycklar. Sätt följande variabler i Vercel
          (Settings → Environment Variables) för Production och gör en ny deploy:
        </p>
        <ul className="mt-4 space-y-1 font-mono text-sm text-emerald-300">
          <li>VITE_SUPABASE_URL</li>
          <li>VITE_SUPABASE_ANON_KEY</li>
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Vite bäddar in värdena vid build-tid. Att bara lägga till dem utan ny deploy räcker inte.
        </p>
      </div>
    </div>
  );
}
