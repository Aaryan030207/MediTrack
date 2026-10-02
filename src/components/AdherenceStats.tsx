'use client';

import { useMemo } from 'react';
import type { Medication, DosageLog } from '@/types/medication';
import {
  getLocalDateString,
  getLastNDaysLocal,
  formatLocalDateLabel,
} from '@/types/medication';

interface AdherenceStatsProps {
  medications: Medication[];
  dosageLogs: DosageLog[];
}

interface DayStat {
  date: string;
  label: string;
  scheduled: number;
  taken: number;
  skipped: number;
  pending: number;
  adherence: number;
}

interface MedStat {
  id: string;
  name: string;
  dosage: string | null;
  scheduled: number;
  taken: number;
  skipped: number;
  pending: number;
  adherence: number;
}

export default function AdherenceStats({
  medications,
  dosageLogs,
}: AdherenceStatsProps) {
  const todayStr = getLocalDateString();
  const last7Days = useMemo(() => getLastNDaysLocal(7), []);

  // 1. Calculate Today's Adherence
  const todayStats = useMemo(() => {
    let scheduled = 0;
    medications.forEach((med) => {
      const isStartValid = !med.start_date || med.start_date <= todayStr;
      const isEndValid = !med.end_date || med.end_date >= todayStr;
      if (isStartValid && isEndValid && Array.isArray(med.scheduled_times)) {
        scheduled += med.scheduled_times.length;
      }
    });

    const todayLogs = dosageLogs.filter((l) => l.scheduled_date === todayStr);
    const taken = todayLogs.filter((l) => l.status === 'taken').length;
    const skipped = todayLogs.filter((l) => l.status === 'skipped').length;
    const pending = Math.max(0, scheduled - taken - skipped);
    const adherence = scheduled > 0 ? Math.round((taken / scheduled) * 100) : 100;

    return { scheduled, taken, skipped, pending, adherence };
  }, [medications, dosageLogs, todayStr]);

  // 2. Calculate 7-Day Adherence
  const sevenDayStats = useMemo<DayStat[]>(() => {
    return last7Days.map((date) => {
      let scheduled = 0;
      medications.forEach((med) => {
        const isStartValid = !med.start_date || med.start_date <= date;
        const isEndValid = !med.end_date || med.end_date >= date;
        if (isStartValid && isEndValid && Array.isArray(med.scheduled_times)) {
          scheduled += med.scheduled_times.length;
        }
      });

      const dayLogs = dosageLogs.filter((l) => l.scheduled_date === date);
      const taken = dayLogs.filter((l) => l.status === 'taken').length;
      const skipped = dayLogs.filter((l) => l.status === 'skipped').length;
      const pending = Math.max(0, scheduled - taken - skipped);
      const adherence = scheduled > 0 ? Math.round((taken / scheduled) * 100) : 100;

      return {
        date,
        label: formatLocalDateLabel(date),
        scheduled,
        taken,
        skipped,
        pending,
        adherence,
      };
    });
  }, [last7Days, medications, dosageLogs]);

  // Overall 7-Day Average Adherence
  const sevenDayAverage = useMemo(() => {
    const totalScheduled = sevenDayStats.reduce((sum, d) => sum + d.scheduled, 0);
    const totalTaken = sevenDayStats.reduce((sum, d) => sum + d.taken, 0);
    return totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 100;
  }, [sevenDayStats]);

  // 3. Calculate Medication-wise Statistics across the 7-day period
  const medicationStats = useMemo<MedStat[]>(() => {
    return medications.map((med) => {
      let scheduled = 0;
      last7Days.forEach((date) => {
        const isStartValid = !med.start_date || med.start_date <= date;
        const isEndValid = !med.end_date || med.end_date >= date;
        if (isStartValid && isEndValid && Array.isArray(med.scheduled_times)) {
          scheduled += med.scheduled_times.length;
        }
      });

      const medLogs = dosageLogs.filter(
        (l) => l.medicine_id === med.id && last7Days.includes(l.scheduled_date)
      );
      const taken = medLogs.filter((l) => l.status === 'taken').length;
      const skipped = medLogs.filter((l) => l.status === 'skipped').length;
      const pending = Math.max(0, scheduled - taken - skipped);
      const adherence = scheduled > 0 ? Math.round((taken / scheduled) * 100) : 100;

      return {
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        scheduled,
        taken,
        skipped,
        pending,
        adherence,
      };
    });
  }, [medications, dosageLogs, last7Days]);

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Adherence & Statistics
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          7-day compliance overview and medication adherence analytics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today's Adherence Summary Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Today&apos;s Adherence
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  todayStats.adherence >= 80
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : todayStats.adherence >= 50
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                }`}
              >
                {todayStats.adherence >= 80 ? 'On Track' : todayStats.adherence >= 50 ? 'Needs Attention' : 'Low'}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                {todayStats.adherence}%
              </span>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {todayStats.taken} of {todayStats.scheduled} taken
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${todayStats.scheduled > 0 ? (todayStats.taken / todayStats.scheduled) * 100 : 0}%`,
                }}
                title={`${todayStats.taken} taken`}
              />
              <div
                className="bg-rose-400 transition-all duration-500"
                style={{
                  width: `${todayStats.scheduled > 0 ? (todayStats.skipped / todayStats.scheduled) * 100 : 0}%`,
                }}
                title={`${todayStats.skipped} skipped`}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
              <span>0%</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Taken
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  Skipped
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  Pending
                </span>
              </div>
              <span>100%</span>
            </div>
          </div>

          {/* Quick Metrics Breakdown */}
          <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-4 gap-2 text-center">
            <div>
              <span className="block text-base font-bold text-zinc-900 dark:text-zinc-100">
                {todayStats.scheduled}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Total</span>
            </div>
            <div>
              <span className="block text-base font-bold text-emerald-600 dark:text-emerald-400">
                {todayStats.taken}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Taken</span>
            </div>
            <div>
              <span className="block text-base font-bold text-rose-500 dark:text-rose-400">
                {todayStats.skipped}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Skipped</span>
            </div>
            <div>
              <span className="block text-base font-bold text-amber-500 dark:text-amber-400">
                {todayStats.pending}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Pending</span>
            </div>
          </div>
        </div>

        {/* 7-Day Adherence Overview */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  7-Day Trend
                </span>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Last 7 Calendar Days
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-400">7-Day Avg</span>
                <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                  {sevenDayAverage}%
                </div>
              </div>
            </div>

            {/* Daily Bars */}
            <div className="mt-5 space-y-3">
              {sevenDayStats.map((day) => {
                const takenPercent = day.scheduled > 0 ? (day.taken / day.scheduled) * 100 : 0;
                const skippedPercent = day.scheduled > 0 ? (day.skipped / day.scheduled) * 100 : 0;

                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="w-16 sm:w-20 text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                      {day.label}
                    </span>

                    {/* Progress Bar */}
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-full h-3 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{ width: `${takenPercent}%` }}
                        title={`${day.taken} taken`}
                      />
                      <div
                        className="bg-rose-400 transition-all duration-500"
                        style={{ width: `${skippedPercent}%` }}
                        title={`${day.skipped} skipped`}
                      />
                    </div>

                    <div className="w-20 text-right shrink-0">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {day.scheduled > 0 ? `${day.adherence}%` : '—'}
                      </span>
                      <span className="text-[10px] text-zinc-400 ml-1">
                        ({day.taken}/{day.scheduled})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>Past doses not logged remain pending</span>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span>Taken</span>
              <span className="inline-block h-2 w-2 rounded-full bg-rose-400 ml-2" />
              <span>Skipped</span>
            </div>
          </div>
        </div>
      </div>

      {/* Medication-wise Statistics Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Medication-Wise Compliance
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Individual adherence rates across the active 7-day period
            </p>
          </div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {medicationStats.length} {medicationStats.length === 1 ? 'medication' : 'medications'}
          </span>
        </div>

        {medicationStats.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-400">
            No active medications to show statistics for.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {medicationStats.map((med) => {
              const takenPct = med.scheduled > 0 ? (med.taken / med.scheduled) * 100 : 0;
              const skippedPct = med.scheduled > 0 ? (med.skipped / med.scheduled) * 100 : 0;

              return (
                <div
                  key={med.id}
                  className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {med.name}
                      </h4>
                      {med.dosage && (
                        <span className="inline-block text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {med.dosage}
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                        med.adherence >= 80
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : med.adherence >= 50
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {med.scheduled > 0 ? `${med.adherence}%` : '—'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 transition-all duration-500"
                      style={{ width: `${takenPct}%` }}
                    />
                    <div
                      className="bg-rose-400 transition-all duration-500"
                      style={{ width: `${skippedPct}%` }}
                    />
                  </div>

                  {/* Dose Breakdown */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                    <span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{med.taken}</strong> taken
                    </span>
                    <span>
                      <strong className="text-rose-500 dark:text-rose-400 font-semibold">{med.skipped}</strong> skipped
                    </span>
                    <span>
                      <strong className="text-amber-500 dark:text-amber-400 font-semibold">{med.pending}</strong> pending
                    </span>
                    <span className="text-zinc-400">
                      Total: {med.scheduled}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
