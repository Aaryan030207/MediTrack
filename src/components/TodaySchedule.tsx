'use client';

import { useState, useMemo } from 'react';
import type {
  Medication,
  DosageLog,
  DoseLogStatus,
  DoseDisplayStatus,
  ScheduledDoseItem,
} from '@/types/medication';
import {
  formatScheduledTime,
  getDoseStatus,
  getLocalDateString,
} from '@/types/medication';

interface TodayScheduleProps {
  medications: Medication[];
  dosageLogs: DosageLog[];
  onLogDose: (
    medicineId: string,
    scheduledTime: string,
    status: DoseLogStatus
  ) => Promise<void>;
}

export default function TodaySchedule({
  medications,
  dosageLogs,
  onLogDose,
}: TodayScheduleProps) {
  const [loadingDoseId, setLoadingDoseId] = useState<string | null>(null);
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [changingDoseId, setChangingDoseId] = useState<string | null>(null);

  const todayLocalDate = getLocalDateString();

  // Generate schedule items mapped with their corresponding dosage log for today
  const scheduleItems = useMemo<ScheduledDoseItem[]>(() => {
    const items: ScheduledDoseItem[] = [];

    medications.forEach((med) => {
      if (Array.isArray(med.scheduled_times)) {
        med.scheduled_times.forEach((time) => {
          if (time && time.trim()) {
            const log = dosageLogs.find(
              (l) =>
                l.medicine_id === med.id &&
                l.scheduled_date === todayLocalDate &&
                l.scheduled_time === time
            );

            let status: DoseDisplayStatus;
            if (log) {
              if (log.status === 'taken') {
                status = 'Completed';
              } else if (log.status === 'skipped') {
                status = 'Skipped';
              } else {
                status = 'Due';
              }
            } else {
              status = getDoseStatus(time);
            }

            items.push({
              id: `${med.id}-${time}`,
              medicationId: med.id,
              name: med.name,
              dosage: med.dosage,
              frequency: med.frequency,
              scheduledTime: time,
              formattedTime: formatScheduledTime(time),
              status,
              notes: med.notes,
              log,
            });
          }
        });
      }
    });

    // Chronological sort
    items.sort((a, b) => {
      const timeDiff = a.scheduledTime.localeCompare(b.scheduledTime);
      if (timeDiff !== 0) return timeDiff;
      return a.name.localeCompare(b.name);
    });

    return items;
  }, [medications, dosageLogs, todayLocalDate]);

  const handleAction = async (item: ScheduledDoseItem, newStatus: DoseLogStatus) => {
    try {
      setLoadingDoseId(item.id);
      setErrorMap((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });

      await onLogDose(item.medicationId, item.scheduledTime, newStatus);
      setChangingDoseId(null);
    } catch (err: unknown) {
      console.error('Complete Supabase error in handleAction:', err);

      let formattedError = 'Failed to update dose log.';

      if (err && typeof err === 'object') {
        const pgErr = err as {
          message?: string;
          code?: string;
          details?: string;
          hint?: string;
        };

        const errorParts: string[] = [];

        if (pgErr.message) {
          errorParts.push(pgErr.message);
        }

        if (pgErr.code) {
          errorParts.push(`(Code: ${pgErr.code})`);
        }

        if (pgErr.details) {
          errorParts.push(`Details: ${pgErr.details}`);
        }

        if (pgErr.hint) {
          errorParts.push(`Hint: ${pgErr.hint}`);
        }

        if (errorParts.length > 0) {
          formattedError = `Failed to update dose log: ${errorParts.join(' ')}`;
        } else if (err instanceof Error && err.message) {
          formattedError = `Failed to update dose log: ${err.message}`;
        }
      } else if (typeof err === 'string') {
        formattedError = `Failed to update dose log: ${err}`;
      }

      setErrorMap((prev) => ({ ...prev, [item.id]: formattedError }));
    } finally {
      setLoadingDoseId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Today&apos;s Schedule
            </h2>
            {scheduleItems.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                {scheduleItems.length} {scheduleItems.length === 1 ? 'dose' : 'doses'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Daily medication timeline ordered chronologically
          </p>
        </div>
      </div>

      {scheduleItems.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-8 sm:p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-3">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
            No doses scheduled for today
          </h3>
          <p className="mt-1 max-w-sm text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            When you add medications with daily scheduled times, they will automatically appear here in your daily routine.
          </p>
        </div>
      ) : (
        /* Chronological Dose Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scheduleItems.map((item) => {
            const isDue = item.status === 'Due';
            const isCompleted = item.status === 'Completed';
            const isSkipped = item.status === 'Skipped';
            const isPending = !isCompleted && !isSkipped;
            const isOperating = loadingDoseId === item.id;
            const isChanging = changingDoseId === item.id;
            const errorMessage = errorMap[item.id];

            return (
              <div
                key={item.id}
                className={`relative flex flex-col justify-between rounded-xl border p-4.5 transition-all shadow-xs ${
                  isCompleted
                    ? 'border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/30 dark:bg-emerald-950/15'
                    : isSkipped
                    ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 opacity-90'
                    : isDue
                    ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-400/30 dark:ring-amber-600/30'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                }`}
              >
                <div>
                  {/* Top Bar: Time and Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-md ${
                          isCompleted
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                            : isSkipped
                            ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            : isDue
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                            : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {item.formattedTime}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5">
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Completed
                        </span>
                      )}

                      {isSkipped && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                          <svg className="h-3 w-3 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Skipped
                        </span>
                      )}

                      {isPending && isDue && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/70 border border-amber-300 dark:border-amber-700 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Due Now
                        </span>
                      )}

                      {isPending && !isDue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Medicine Name & Details */}
                  <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {item.name}
                  </h4>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {item.dosage && (
                      <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {item.dosage}
                      </span>
                    )}
                    {item.frequency && (
                      <span className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {item.frequency}
                      </span>
                    )}
                  </div>

                  {/* Notes snippet if present */}
                  {item.notes && (
                    <div className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-2 truncate" title={item.notes}>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">Note: </span>
                      {item.notes}
                    </div>
                  )}
                </div>

                {/* Bottom Action Area */}
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                  {errorMessage && (
                    <p className="mb-2 text-xs text-red-600 dark:text-red-400 font-medium break-words">
                      {errorMessage}
                    </p>
                  )}

                  {isPending || isChanging ? (
                    <div className="flex items-center gap-2">
                      {/* Taken Button */}
                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => handleAction(item, 'taken')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label={`Mark ${item.name} as taken`}
                      >
                        {isOperating && (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        )}
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span>Taken</span>
                      </button>

                      {/* Skipped Button */}
                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => handleAction(item, 'skipped')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 font-medium py-2 px-3 text-xs sm:text-sm transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label={`Mark ${item.name} as skipped`}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                        <span>Skipped</span>
                      </button>

                      {isChanging && (
                        <button
                          type="button"
                          onClick={() => setChangingDoseId(null)}
                          className="px-2 py-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Completed or Skipped footer with Change action */
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>
                        {isCompleted && item.log?.taken_at
                          ? `Recorded at ${new Date(item.log.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : isSkipped
                          ? 'Dose marked as skipped'
                          : 'Recorded'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setChangingDoseId(item.id)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
