'use client';

import { useState } from 'react';
import type { Medication, MedicationFormData } from '@/types/medication';

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MedicationFormData) => Promise<void>;
  initialData?: Medication | null;
}

const FREQUENCY_OPTIONS = [
  'Daily',
  'Twice Daily',
  'Three Times Daily',
  'Four Times Daily',
  'Every Other Day',
  'Weekly',
  'As Needed (PRN)',
  'Custom',
];

export default function MedicationModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: MedicationModalProps) {
  const [formData, setFormData] = useState<MedicationFormData>(() => ({
    name: initialData?.name || '',
    dosage: initialData?.dosage || '',
    frequency: initialData?.frequency || 'Daily',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    notes: initialData?.notes || '',
    scheduled_times:
      initialData?.scheduled_times && initialData.scheduled_times.length > 0
        ? initialData.scheduled_times
        : ['08:00'],
    quantity: typeof initialData?.quantity === 'number' ? initialData.quantity : 30,
    refill_threshold:
      typeof initialData?.refill_threshold === 'number'
        ? initialData.refill_threshold
        : 5,
  }));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddTime = () => {
    setFormData((prev) => ({
      ...prev,
      scheduled_times: [...prev.scheduled_times, '12:00'],
    }));
  };

  const handleRemoveTime = (indexToRemove: number) => {
    if (formData.scheduled_times.length <= 1) {
      setError('At least one scheduled dose time is required.');
      return;
    }
    setError(null);
    setFormData((prev) => ({
      ...prev,
      scheduled_times: prev.scheduled_times.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleTimeChange = (indexToUpdate: number, newTime: string) => {
    setFormData((prev) => ({
      ...prev,
      scheduled_times: prev.scheduled_times.map((time, idx) =>
        idx === indexToUpdate ? newTime : time
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Medication name is required.');
      return;
    }

    if (formData.quantity < 0) {
      setError('Quantity in stock cannot be negative.');
      return;
    }

    if (formData.refill_threshold < 0) {
      setError('Refill threshold cannot be negative.');
      return;
    }

    const validTimes = formData.scheduled_times.filter((t) => t.trim().length > 0);
    if (validTimes.length === 0) {
      setError('Please provide at least one scheduled time.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        ...formData,
        name: formData.name.trim(),
        dosage: formData.dosage.trim(),
        frequency: formData.frequency.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        notes: formData.notes.trim(),
        scheduled_times: validTimes,
        quantity: Math.max(0, Math.floor(Number(formData.quantity) || 0)),
        refill_threshold: Math.max(0, Math.floor(Number(formData.refill_threshold) || 0)),
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while saving.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {initialData ? 'Edit Medication' : 'Add New Medication'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {initialData
                  ? 'Update medication details, schedule, or inventory'
                  : 'Enter prescription instructions and dosage timings'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 p-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                <svg className="h-5 w-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Medicine Name */}
            <div>
              <label htmlFor="med-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                Medicine Name <span className="text-red-500">*</span>
              </label>
              <input
                id="med-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Amoxicillin, Lisinopril, Metformin"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Dosage & Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="med-dosage" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Dosage
                </label>
                <input
                  id="med-dosage"
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  placeholder="e.g. 500mg, 10ml, 1 tablet"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label htmlFor="med-frequency" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Frequency
                </label>
                <select
                  id="med-frequency"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scheduled Times */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Scheduled Dose Times <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddTime}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>Add Time</span>
                </button>
              </div>

              <div className="space-y-2">
                {formData.scheduled_times.map((time, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <input
                        type="time"
                        required
                        value={time}
                        onChange={(e) => handleTimeChange(idx, e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    {formData.scheduled_times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(idx)}
                        className="rounded-lg p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Remove dose time"
                        aria-label="Remove dose time"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quantity in Stock & Refill Threshold */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="med-quantity" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Quantity in Stock
                </label>
                <input
                  id="med-quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label htmlFor="med-threshold" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Refill Threshold
                </label>
                <input
                  id="med-threshold"
                  type="number"
                  min="0"
                  value={formData.refill_threshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      refill_threshold: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Start Date & End Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="med-start-date" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Start Date (Optional)
                </label>
                <input
                  id="med-start-date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label htmlFor="med-end-date" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  End Date (Optional)
                </label>
                <input
                  id="med-end-date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="med-notes" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                Notes & Instructions (Optional)
              </label>
              <textarea
                id="med-notes"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Take with a full glass of water. Avoid taking on an empty stomach."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              <span>{loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Medication'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
