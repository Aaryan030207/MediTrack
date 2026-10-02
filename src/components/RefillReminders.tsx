'use client';

import type { Medication } from '@/types/medication';

interface RefillRemindersProps {
  medications: Medication[];
}

export default function RefillReminders({
  medications,
}: RefillRemindersProps) {
  const refillMedicines = medications.filter(
    (medication) => medication.quantity <= medication.refill_threshold
  );

  if (refillMedicines.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
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
              d="M12 9v3.75m9 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Refill Reminders
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Some medicines are running low.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {refillMedicines.map((medication) => {
          const isOutOfStock = medication.quantity === 0;

          return (
            <div
              key={medication.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-white p-4 dark:border-amber-900/50 dark:bg-zinc-900"
            >
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {medication.name}
                </h3>

                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {isOutOfStock
                    ? 'No doses remaining — refill now.'
                    : `Only ${medication.quantity} ${
                        medication.quantity === 1 ? 'dose' : 'doses'
                      } remaining — consider refilling soon.`}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  isOutOfStock
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                }`}
              >
                {isOutOfStock ? 'Refill Now' : 'Low Stock'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}