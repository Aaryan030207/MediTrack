'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Medication, DosageLog } from '@/types/medication';
import {
  formatScheduledTime,
  getLocalDateString,
} from '@/types/medication';

interface UpcomingDoseReminderProps {
  medications: Medication[];
  dosageLogs: DosageLog[];
}

interface UpcomingDose {
  medication: Medication;
  scheduledTime: string;
  formattedTime: string;
  minutesUntil: number;
  isDue: boolean;
  isOverdue: boolean;
}

function getMinutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export default function UpcomingDoseReminder({
  medications,
  dosageLogs,
}: UpcomingDoseReminderProps) {
  const [, setCurrentTime] = useState<number | null>(null);

  // Refresh the reminder every minute.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime((previous) =>
        previous === null ? 0 : previous + 1
      );
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const upcomingDose = useMemo<UpcomingDose | null>(() => {
    const today = getLocalDateString();
    const currentMinutes = getCurrentMinutes();

    const candidates: UpcomingDose[] = [];

    medications.forEach((medication) => {
      if (!Array.isArray(medication.scheduled_times)) {
        return;
      }

      medication.scheduled_times.forEach((scheduledTime) => {
        if (!scheduledTime || !scheduledTime.trim()) {
          return;
        }

        const log = dosageLogs.find(
          (doseLog) =>
            doseLog.medicine_id === medication.id &&
            doseLog.scheduled_date === today &&
            doseLog.scheduled_time === scheduledTime
        );

        // Completed and skipped doses do not need reminders.
        if (
          log?.status === 'taken' ||
          log?.status === 'skipped'
        ) {
          return;
        }

        const scheduledMinutes =
          getMinutesFromTime(scheduledTime);

        const minutesUntil =
          scheduledMinutes - currentMinutes;

        candidates.push({
          medication,
          scheduledTime,
          formattedTime: formatScheduledTime(scheduledTime),
          minutesUntil,
          isDue: minutesUntil === 0,
          isOverdue: minutesUntil < 0,
        });
      });
    });

    if (candidates.length === 0) {
      return null;
    }

    /*
     * Priority:
     * 1. Overdue/past pending doses
     * 2. Due now
     * 3. Upcoming doses
     *
     * For overdue doses, the most recently scheduled one
     * is shown first.
     */

    const overdueDoses = candidates
      .filter((dose) => dose.isOverdue)
      .sort(
        (a, b) =>
          getMinutesFromTime(b.scheduledTime) -
          getMinutesFromTime(a.scheduledTime)
      );

    if (overdueDoses.length > 0) {
      return overdueDoses[0];
    }

    const upcomingDoses = candidates
      .filter((dose) => !dose.isOverdue)
      .sort(
        (a, b) =>
          getMinutesFromTime(a.scheduledTime) -
          getMinutesFromTime(b.scheduledTime)
      );

    return upcomingDoses[0] ?? null;
  }, [medications, dosageLogs]);

  if (!upcomingDose) {
    return null;
  }

  const {
    medication,
    formattedTime,
    minutesUntil,
    isDue,
    isOverdue,
  } = upcomingDose;

  let timingText = '';

  if (isOverdue) {
    const overdueMinutes = Math.abs(minutesUntil);

    if (overdueMinutes < 60) {
      timingText = `${overdueMinutes} ${
        overdueMinutes === 1 ? 'minute' : 'minutes'
      } overdue`;
    } else {
      const hours = Math.floor(overdueMinutes / 60);
      const minutes = overdueMinutes % 60;

      timingText =
        minutes === 0
          ? `${hours} ${
              hours === 1 ? 'hour' : 'hours'
            } overdue`
          : `${hours}h ${minutes}m overdue`;
    }
  } else if (isDue) {
    timingText = 'Due now';
  } else if (minutesUntil < 60) {
    timingText = `In ${minutesUntil} ${
      minutesUntil === 1 ? 'minute' : 'minutes'
    }`;
  } else {
    const hours = Math.floor(minutesUntil / 60);
    const minutes = minutesUntil % 60;

    if (minutes === 0) {
      timingText = `In ${hours} ${
        hours === 1 ? 'hour' : 'hours'
      }`;
    } else {
      timingText = `In ${hours}h ${minutes}m`;
    }
  }

  const reminderTitle = isOverdue
    ? 'Missed Dose'
    : isDue
      ? 'Dose Due Now'
      : 'Upcoming Dose';

  const reminderDescription = isOverdue
    ? 'This scheduled dose has not been recorded yet.'
    : isDue
      ? 'Your scheduled dose is due now.'
      : 'Your next scheduled medication dose.';

  return (
    <section
      className={`mb-6 rounded-xl border p-5 ${
        isOverdue
          ? 'border-red-300 bg-red-50 dark:border-red-900/70 dark:bg-red-950/25'
          : isDue
            ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
            : 'border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/20'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            isOverdue
              ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300'
              : isDue
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
          }`}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {reminderTitle}
            </h2>

            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isOverdue
                  ? 'bg-red-200 text-red-800 dark:bg-red-900/80 dark:text-red-200'
                  : isDue
                    ? 'bg-amber-200 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200'
                    : 'bg-blue-200 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200'
              }`}
            >
              {timingText}
            </span>
          </div>

          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {reminderDescription}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {medication.name}
            </span>

            {medication.dosage && (
              <span className="rounded-md bg-white/80 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
                {medication.dosage}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Scheduled for{' '}
            <span className="font-semibold">
              {formattedTime}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}