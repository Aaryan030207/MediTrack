'use client';

import { useState } from 'react';
import type { Medication } from '@/types/medication';
import { formatScheduledTime } from '@/types/medication';

interface MedicationCardProps {
  medication: Medication;
  onEdit: (medication: Medication) => void;
  onDelete: (id: string) => Promise<void>;
}

export default function MedicationCard({
  medication,
  onEdit,
  onDelete,
}: MedicationCardProps) {
  const [deleting, setDeleting] = useState(false);

  const isOutOfStock = medication.quantity === 0;

  const isLowStock =
    medication.quantity > 0 &&
    medication.quantity <= medication.refill_threshold;

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${medication.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      await onDelete(medication.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div>
        {/* Top Header: Name, Dosage, Stock Badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {medication.name}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {medication.dosage && (
                <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {medication.dosage}
                </span>
              )}

              {medication.frequency && (
                <span className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {medication.frequency}
                </span>
              )}
            </div>
          </div>

          {/* Stock Status Indicator */}
          <div className="shrink-0">
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 px-2.5 py-1 text-xs font-bold text-red-700 dark:text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Low Stock: {medication.quantity} left
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {medication.quantity} in stock
              </span>
            )}
          </div>
        </div>

        {/* Scheduled Times */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
            <svg
              className="h-3.5 w-3.5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>

            <span>
              Scheduled Doses ({medication.scheduled_times?.length || 0})
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {medication.scheduled_times &&
            medication.scheduled_times.length > 0 ? (
              medication.scheduled_times.map((time, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/60"
                >
                  {formatScheduledTime(time)}
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-400 italic">
                No scheduled times set
              </span>
            )}
          </div>
        </div>

        {/* Notes */}
        {medication.notes && (
          <div className="mt-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-2.5 text-xs text-zinc-600 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              Instructions:{' '}
            </span>
            {medication.notes}
          </div>
        )}

        {/* Schedule Dates */}
        {(medication.start_date || medication.end_date) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            {medication.start_date && (
              <span>
                Start:{' '}
                <strong className="text-zinc-700 dark:text-zinc-300">
                  {medication.start_date}
                </strong>
              </span>
            )}

            {medication.end_date && (
              <span>
                End:{' '}
                <strong className="text-zinc-700 dark:text-zinc-300">
                  {medication.end_date}
                </strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
        <div className="text-[11px] text-zinc-400">
          Refill alert at ≤ {medication.refill_threshold}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Edit Button */}
          <button
            type="button"
            onClick={() => onEdit(medication)}
            disabled={deleting}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label={`Edit ${medication.name}`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>

            <span>Edit</span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label={`Delete ${medication.name}`}
          >
            {deleting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
            ) : (
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            )}

            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}