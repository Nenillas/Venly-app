import { useCallback, useEffect, useState } from 'react';
import { Category, Entry, MonthMeta, SAVINGS_BUCKETS } from '@/lib/types';
import { currentMonth } from '@/lib/format';
import { readAutogiroMap, readPaidMap, readPaymentTypeMap, writePaid, writePaymentType } from '@/lib/paidStorage';
import {
  ENTRIES_TABLE,
  MONTHS_TABLE,
  entryWritePayload,
  itemsQuery,
  monthsQuery,
  normalizeEntry as mapEntry,
  normalizeMeta,
  queryUserRows,
} from '@/lib/financeDb';
import { ensureAccessToken } from '@/lib/supabase/session';
import { logSupabaseError, supabaseErrorMessage } from '@/lib/supabaseErrors';

const DEFAULT_META = {
  ending_balance: 0,
  alloc_buffer: 40,
  alloc_avanza: 40,
  alloc_travel: 20,
};

export function useFinance(userId: string | undefined, sessionReady: boolean) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [months, setMonths] = useState<MonthMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionReady || !userId) {
      setEntries([]);
      setMonths([]);
      setLoading(!sessionReady);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const auth = await ensureAccessToken();
      const sessionUserId = auth?.userId ?? userId;
      if (!auth?.userId) {
        console.error('[PGRST] useFinance.load utan JWT — hoppar över public.monthly_records / public.budget_items');
        setEntries([]);
        setMonths([]);
        setError('Inte inloggad. Logga in igen för att ladda din ekonomi.');
        return;
      }

      await ensureStarterBudget(sessionUserId);

      const [entriesHit, monthsHit] = await Promise.all([
        queryUserRows(ENTRIES_TABLE, sessionUserId, 'created_at'),
        queryUserRows(MONTHS_TABLE, sessionUserId, 'month'),
      ]);

      setEntries(entriesHit.data.map((row) => normalizeEntry(row, sessionUserId)));
      setMonths(monthsHit.data.map((row) => normalizeMeta(row)));
      setError(null);
    } catch (err) {
      logSupabaseError(err, 'useFinance.load');
      setEntries([]);
      setMonths([]);
      setError(supabaseErrorMessage(err, 'Kunde inte ladda ekonomin.'));
    } finally {
      setLoading(false);
    }
  }, [userId, sessionReady]);

  useEffect(() => {
    void load();
  }, [load]);

  const getMeta = useCallback(
    (month: string): MonthMeta => {
      const found = months.find((m) => m.month === month);
      return found ?? { id: '', month, ...DEFAULT_META };
    },
    [months],
  );

  const ensureMeta = useCallback(
    async (month: string): Promise<MonthMeta> => {
      if (!userId) throw new Error('meta');
      const existing = months.find((m) => m.month === month);
      if (existing) return existing;
      const { data, error: insErr } = await monthsQuery()
        .insert({ user_id: userId, month, ...DEFAULT_META })
        .select()
        .maybeSingle();
      if (insErr || !data) {
        console.error('[PGRST] public.monthly_records.insert', insErr?.message, insErr);
        logSupabaseError(insErr, 'public.monthly_records.insert');
        throw new Error(supabaseErrorMessage(insErr, 'Kunde inte skapa månad.'));
      }
      const meta = normalizeMeta(data as Record<string, unknown>);
      setMonths((prev) => [...prev, meta]);
      return meta;
    },
    [months, userId],
  );

  const addEntry = useCallback(
    async (month: string, category: Category, name: string, amount: number) => {
      if (!userId) {
        const message = 'Ingen inloggad användare – kan inte lägga till post.';
        console.error(message);
        throw new Error(message);
      }
      const isCost = category === 'fixed' || category === 'variable';
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: Entry = {
        id: tempId,
        month,
        category,
        name,
        amount,
        paid: false,
        payment_type: isCost ? 'invoice' : 'invoice',
      };
      setEntries((prev) => [...prev, optimistic]);

      const payload = entryWritePayload({
        userId,
        month,
        category,
        name,
        amount,
        payment_type: isCost ? 'invoice' : undefined,
      });
      try {
        const { data, error: insErr } = await itemsQuery()
          .insert(payload)
          .select()
          .maybeSingle();
        if (insErr || !data) {
          if (insErr && /payment_type|schema cache|column/i.test(insErr.message)) {
            const retry = await itemsQuery()
              .insert(entryWritePayload({ userId, month, category, name, amount }))
              .select()
              .maybeSingle();
            if (retry.data) {
              const entry = normalizeEntry(retry.data as Record<string, unknown>, userId);
              setEntries((prev) =>
                prev.map((e) =>
                  e.id === tempId
                    ? { ...entry, payment_type: isCost ? 'invoice' : entry.payment_type }
                    : e,
                ),
              );
              if (isCost) writePaymentType(userId, entry.id, 'invoice');
              return;
            }
            logSupabaseError(retry.error, 'public.budget_items.insert.retry');
            console.error('[PGRST] public.budget_items.insert.retry', retry.error?.message, retry.error);
          }
          logSupabaseError(insErr, 'public.budget_items.insert');
          console.error('[PGRST] public.budget_items.insert', insErr?.message ?? 'Kunde inte lägga till posten.', insErr);
          setEntries((prev) => prev.filter((e) => e.id !== tempId));
          throw new Error(supabaseErrorMessage(insErr, 'Kunde inte lägga till posten.'));
        }
        setEntries((prev) =>
          prev.map((e) => (e.id === tempId ? normalizeEntry(data as Record<string, unknown>, userId) : e)),
        );
      } catch (err) {
        setEntries((prev) => prev.filter((e) => e.id !== tempId));
        const message = err instanceof Error ? err.message : String(err);
        console.error(message, err);
        throw err;
      }
    },
    [userId],
  );

  const updateEntry = useCallback(
    async (id: string, patch: Partial<Pick<Entry, 'name' | 'amount' | 'paid' | 'payment_type'>>) => {
      if (!userId) return;
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
      if (patch.payment_type) writePaymentType(userId, id, patch.payment_type);
      const { error: updErr } = await itemsQuery()
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId);
      if (updErr) {
        logSupabaseError(updErr, 'public.budget_items.update');
        console.error('[PGRST] public.budget_items.update', updErr.message, updErr);
        if (!/payment_type|is_autogiro|schema cache|column/i.test(updErr.message)) {
          setError(supabaseErrorMessage(updErr, 'Kunde inte spara ändringen.'));
        }
      }
    },
    [userId],
  );

  const togglePaid = useCallback(async (id: string, paid: boolean) => {
    if (!userId) return;
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, paid } : e)));
    writePaid(userId, id, paid);
    const { error: updErr } = await itemsQuery()
      .update({ paid })
      .eq('id', id)
      .eq('user_id', userId);
    if (updErr) {
      console.error('[PGRST] public.budget_items.paid', updErr.message, updErr);
      logSupabaseError(updErr, 'public.budget_items.paid');
      if (!/paid|schema cache|column/i.test(updErr.message)) {
        setError(supabaseErrorMessage(updErr, 'Kunde inte spara betalstatus.'));
      }
    }
  }, [userId]);

  const deleteEntry = useCallback(async (id: string) => {
    if (!userId) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const { error: delErr } = await itemsQuery()
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (delErr) {
      console.error('[PGRST] public.budget_items.delete', delErr.message, delErr);
      logSupabaseError(delErr, 'public.budget_items.delete');
      setError(supabaseErrorMessage(delErr, 'Kunde inte ta bort posten.'));
    }
  }, [userId]);

  const copyMonth = useCallback(
    async (fromMonth: string, toMonth: string) => {
      if (!userId) return;
      const source = entries.filter((e) => e.month === fromMonth);
      if (source.length === 0) return;
      const payload = source.map(({ category, name, amount }) =>
        entryWritePayload({ userId, month: toMonth, category, name, amount }),
      );
      const { data, error: insErr } = await itemsQuery()
        .insert(payload)
        .select();
      if (insErr || !data) {
        console.error('[PGRST] public.budget_items.copy', insErr?.message, insErr);
        logSupabaseError(insErr, 'public.budget_items.copy');
        setError(supabaseErrorMessage(insErr, 'Kunde inte kopiera föregående månad.'));
        throw new Error('copy');
      }
      data.forEach((row, i) => {
        const type = source[i]?.payment_type;
        if (type && type !== 'invoice') writePaymentType(userId, row.id, type);
      });
      setEntries((prev) => [...prev, ...data.map((row) => normalizeEntry(row as Record<string, unknown>, userId))]);
      await Promise.all(data.map(async (row, i) => {
        const type = source[i]?.payment_type;
        if (!type || type === 'invoice') return;
        const { error: typeErr } = await itemsQuery()
          .update({ payment_type: type })
          .eq('id', row.id)
          .eq('user_id', userId);
        if (typeErr) {
          console.error('[PGRST] public.budget_items.copy.payment_type', typeErr.message, typeErr);
          logSupabaseError(typeErr, 'public.budget_items.copy.payment_type');
        }
      }));

      const sourceMeta = months.find((m) => m.month === fromMonth);
      if (sourceMeta) {
        await ensureMeta(toMonth);
        const { error: metaErr } = await monthsQuery()
          .update({
            alloc_buffer: sourceMeta.alloc_buffer,
            alloc_avanza: sourceMeta.alloc_avanza,
            alloc_travel: sourceMeta.alloc_travel,
          })
          .eq('month', toMonth)
          .eq('user_id', userId);
        if (metaErr) {
          console.error('[PGRST] public.monthly_records.copy', metaErr.message, metaErr);
          logSupabaseError(metaErr, 'public.monthly_records.copy');
          setError(supabaseErrorMessage(metaErr, 'Kunde inte kopiera månadsinställningen.'));
        }
        setMonths((prev) =>
          prev.map((m) =>
            m.month === toMonth
              ? {
                  ...m,
                  alloc_buffer: sourceMeta.alloc_buffer,
                  alloc_avanza: sourceMeta.alloc_avanza,
                  alloc_travel: sourceMeta.alloc_travel,
                }
              : m,
          ),
        );
      }
    },
    [entries, months, ensureMeta, userId],
  );

  const updateMeta = useCallback(
    async (month: string, patch: Partial<Omit<MonthMeta, 'id' | 'month'>>) => {
      if (!userId) {
        console.error('Ingen inloggad användare – kan inte spara månadsvärde.');
        return;
      }
      setMonths((prev) => {
        const found = prev.find((m) => m.month === month);
        if (found) return prev.map((m) => (m.month === month ? { ...m, ...patch } : m));
        return [...prev, { id: '', month, ...DEFAULT_META, ...patch }];
      });
      try {
        const meta = await ensureMeta(month);
        const { error: updErr } = await monthsQuery()
          .update(patch)
          .eq('id', meta.id)
          .eq('user_id', userId);
        if (updErr) {
          logSupabaseError(updErr, 'public.monthly_records.update');
          console.error('[PGRST] public.monthly_records.update', updErr.message, updErr);
          setError(supabaseErrorMessage(updErr, 'Kunde inte spara månadsinställningen.'));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(message, err);
        setError(message);
      }
    },
    [ensureMeta, userId],
  );

  return {
    entries,
    months,
    loading,
    error,
    reload: load,
    getMeta,
    ensureMeta,
    addEntry,
    updateEntry,
    deleteEntry,
    copyMonth,
    updateMeta,
    togglePaid,
  };
}

async function ensureStarterBudget(userId: string) {
  try {
  const month = currentMonth();
  const { data: existingMonth, error: monthErr } = await monthsQuery()
    .select('id')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle();

  if (monthErr) {
    console.error('[PGRST] public.monthly_records.starter.select', monthErr.message, monthErr);
    logSupabaseError(monthErr, 'public.monthly_records.starter.select');
    return;
  }

  if (!existingMonth) {
    const { error: insMonthErr } = await monthsQuery().insert({
      user_id: userId,
      month,
      ...DEFAULT_META,
    });
    if (insMonthErr) {
      console.error('[PGRST] public.monthly_records.starter.insert', insMonthErr.message, insMonthErr);
      logSupabaseError(insMonthErr, 'public.monthly_records.starter.insert');
    }
  }

  const { count, error: countErr } = await itemsQuery()
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('month', month);

  if (countErr) {
    console.error('[PGRST] public.budget_items.starter.count', countErr.message, countErr);
    logSupabaseError(countErr, 'public.budget_items.starter.count');
    return;
  }
  if ((count ?? 0) > 0) return;

  const { error: insEntriesErr } = await itemsQuery().insert(
    SAVINGS_BUCKETS.map((b) =>
      entryWritePayload({
        userId,
        month,
        category: 'savings',
        name: b.name,
        amount: 0,
      }),
    ),
  );
  if (insEntriesErr) {
    console.error('[PGRST] public.budget_items.starter.insert', insEntriesErr.message, insEntriesErr);
    logSupabaseError(insEntriesErr, 'public.budget_items.starter.insert');
  }
  } catch (err) {
    logSupabaseError(err, 'ensureStarterBudget');
  }
}

function normalizeEntry(row: Record<string, unknown>, userId: string): Entry {
  const mapped = mapEntry(row);
  const id = mapped.id;
  const local = readPaymentTypeMap(userId)[id];
  const paidLocal = readPaidMap(userId);
  if (local === 'autogiro' || local === 'card_pot' || local === 'invoice') {
    return {
      ...mapped,
      paid: mapped.paid || Boolean(paidLocal[id]),
      payment_type: local,
    };
  }
  if (Boolean(readAutogiroMap(userId)[id])) {
    return {
      ...mapped,
      paid: mapped.paid || Boolean(paidLocal[id]),
      payment_type: 'autogiro',
    };
  }
  return {
    ...mapped,
    paid: mapped.paid || Boolean(paidLocal[id]),
  };
}
