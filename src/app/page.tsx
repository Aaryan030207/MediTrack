'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import type {
  Medication,
  MedicationFormData,
  DosageLog,
  DoseLogStatus,
} from '@/types/medication';

import {
  getLocalDateString,
  getDaysAgoLocalDateString,
} from '@/types/medication';

import MedicationModal from '@/components/MedicationModal';
import MedicationCard from '@/components/MedicationCard';
import TodaySchedule from '@/components/TodaySchedule';
import AdherenceStats from '@/components/AdherenceStats';
import RefillReminders from '@/components/RefillReminders';
import UpcomingDoseReminder from '@/components/UpcomingDoseReminder';

interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [dosageLogs, setDosageLogs] = useState<DosageLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isMedicationModalOpen, setIsMedicationModalOpen] =
    useState(false);

  const [editingMedication, setEditingMedication] =
    useState<Medication | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const user = session.user;

      // Fetch profile
      const {
        data: existingProfile,
        error: profileFetchError,
      } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileFetchError) {
        throw profileFetchError;
      }

      if (!existingProfile) {
        const {
          data: createdProfile,
          error: createProfileError,
        } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
          })
          .select('*')
          .single();

        if (createProfileError) {
          throw createProfileError;
        }

        setProfile(createdProfile as Profile);
      } else {
        setProfile(existingProfile as Profile);
      }

      // Fetch medications
      const {
        data: medicationsData,
        error: medicationsError,
      } = await supabase
        .from('medicines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (medicationsError) {
        throw medicationsError;
      }

      const fetchedMedications =
        (medicationsData ?? []) as Medication[];

      setMedications(fetchedMedications);

      // Fetch dosage logs for the last 7 days
      const medIds = fetchedMedications.map(
        (medication) => medication.id
      );

      if (medIds.length === 0) {
        setDosageLogs([]);
        return;
      }

      const todayStr = getLocalDateString();
      const sevenDaysAgoStr = getDaysAgoLocalDateString(6);

      const {
        data: logsData,
        error: logsError,
      } = await supabase
        .from('dosage_logs')
        .select('*')
        .in('medicine_id', medIds)
        .gte('scheduled_date', sevenDaysAgoStr)
        .lte('scheduled_date', todayStr)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (logsError) {
        throw logsError;
      }

      setDosageLogs((logsData ?? []) as DosageLog[]);
    } catch (err: unknown) {
      console.error('Dashboard fetch error:', err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Sign out
  const handleSignOut = async () => {
    try {
      setError('');

      const { error: signOutError } =
        await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      router.push('/login');
    } catch (err: unknown) {
      console.error('Sign out error:', err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to sign out.');
      }
    }
  };

  // Save medication
  const handleSaveMedication = async (
    data: MedicationFormData
  ) => {
    try {
      setError('');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error('You are not logged in.');
      }

      if (editingMedication) {
        const {
          data: updatedMedication,
          error: updateError,
        } = await supabase
          .from('medicines')
          .update({
            name: data.name,
            dosage: data.dosage || null,
            frequency: data.frequency || null,
            start_date: data.start_date || null,
            end_date: data.end_date || null,
            notes: data.notes || null,
            scheduled_times: data.scheduled_times,
            quantity: data.quantity,
            refill_threshold: data.refill_threshold,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMedication.id)
          .eq('user_id', user.id)
          .select('*')
          .single();

        if (updateError) {
          throw updateError;
        }

        setMedications((current) =>
          current.map((medication) =>
            medication.id === editingMedication.id
              ? (updatedMedication as Medication)
              : medication
          )
        );
      } else {
        const {
          data: newMedication,
          error: insertError,
        } = await supabase
          .from('medicines')
          .insert({
            user_id: user.id,
            name: data.name,
            dosage: data.dosage || null,
            frequency: data.frequency || null,
            start_date: data.start_date || null,
            end_date: data.end_date || null,
            notes: data.notes || null,
            scheduled_times: data.scheduled_times,
            quantity: data.quantity,
            refill_threshold: data.refill_threshold,
          })
          .select('*')
          .single();

        if (insertError) {
          throw insertError;
        }

        setMedications((current) => [
          newMedication as Medication,
          ...current,
        ]);
      }

      setEditingMedication(null);
      setIsMedicationModalOpen(false);
    } catch (err: unknown) {
      console.error('Save medication error:', err);

      if (err instanceof Error) {
        throw err;
      }

      throw new Error('Failed to save medication.');
    }
  };

  // Edit medication
  const handleEditMedication = (medication: Medication) => {
    setEditingMedication(medication);
    setIsMedicationModalOpen(true);
  };

  // Delete medication
  const handleDeleteMedication = async (id: string) => {
    const medication = medications.find(
      (item) => item.id === id
    );

    const confirmed = window.confirm(
      `Are you sure you want to delete ${
        medication?.name ?? 'this medication'
      }?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      const { error: deleteError } = await supabase
        .from('medicines')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setMedications((current) =>
        current.filter((item) => item.id !== id)
      );

      setDosageLogs((current) =>
        current.filter((log) => log.medicine_id !== id)
      );
    } catch (err: unknown) {
      console.error('Delete medication error:', err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete medication.');
      }
    }
  };

  // Log dose
  const handleLogDose = async (
    medicineId: string,
    scheduledTime: string,
    status: DoseLogStatus
  ) => {
    const todayStr = getLocalDateString();

    const previousLog = dosageLogs.find(
      (log) =>
        log.medicine_id === medicineId &&
        log.scheduled_date === todayStr &&
        log.scheduled_time === scheduledTime
    );

    const previousStatus = previousLog?.status ?? null;

    const medication = medications.find(
      (med) => med.id === medicineId
    );

    if (!medication) {
      throw new Error('Medication not found.');
    }

    const currentQuantity = medication.quantity ?? 0;

    // Prevent taking a dose when there is no stock.
    if (
      status === 'taken' &&
      previousStatus !== 'taken' &&
      currentQuantity <= 0
    ) {
      throw new Error(
        `Cannot mark ${medication.name} as Taken because there is no stock remaining.`
      );
    }

    let quantityChange = 0;

    // Pending/Skipped -> Taken
    if (
      previousStatus !== 'taken' &&
      status === 'taken'
    ) {
      quantityChange = -1;
    }

    // Taken -> Skipped
    else if (
      previousStatus === 'taken' &&
      status === 'skipped'
    ) {
      quantityChange = 1;
    }

    const newQuantity = Math.max(
      0,
      currentQuantity + quantityChange
    );

    // Update dosage log
    const {
      data: updatedLog,
      error: logError,
    } = await supabase
      .from('dosage_logs')
      .upsert(
        {
          medicine_id: medicineId,
          scheduled_date: todayStr,
          scheduled_time: scheduledTime,
          status,
          taken_at:
            status === 'taken'
              ? new Date().toISOString()
              : null,
        },
        {
          onConflict:
            'medicine_id,scheduled_date,scheduled_time',
        }
      )
      .select('*')
      .single();

    if (logError) {
      console.error(
        'Supabase dosage log error:',
        logError
      );
      throw logError;
    }

    // Update medication quantity
    if (quantityChange !== 0) {
      const {
        data: updatedMedication,
        error: quantityError,
      } = await supabase
        .from('medicines')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', medicineId)
        .select('*')
        .single();

      if (quantityError) {
        console.error(
          'Supabase quantity update error:',
          quantityError
        );
        throw quantityError;
      }

      setMedications((current) =>
        current.map((item) =>
          item.id === medicineId
            ? (updatedMedication as Medication)
            : item
        )
      );
    }

    // Update local dosage logs
    setDosageLogs((current) => {
      const existingIndex = current.findIndex(
        (log) =>
          log.medicine_id === medicineId &&
          log.scheduled_date === todayStr &&
          log.scheduled_time === scheduledTime
      );

      if (existingIndex === -1) {
        return [
          ...current,
          updatedLog as DosageLog,
        ];
      }

      const next = [...current];

      next[existingIndex] =
        updatedLog as DosageLog;

      return next;
    });
  };

  const todayStr = getLocalDateString();

  const todayLogs = useMemo(() => {
    return dosageLogs.filter(
      (log) => log.scheduled_date === todayStr
    );
  }, [dosageLogs, todayStr]);

  const totalScheduledToday = useMemo(() => {
    return medications.reduce(
      (total, medication) => {
        return (
          total +
          (Array.isArray(
            medication.scheduled_times
          )
            ? medication.scheduled_times.length
            : 0)
        );
      },
      0
    );
  }, [medications]);

  const completedToday = useMemo(() => {
    return todayLogs.filter(
      (log) => log.status === 'taken'
    ).length;
  }, [todayLogs]);

  const skippedToday = useMemo(() => {
    return todayLogs.filter(
      (log) => log.status === 'skipped'
    ).length;
  }, [todayLogs]);

  const pendingToday = Math.max(
    0,
    totalScheduledToday -
      completedToday -
      skippedToday
  );

  const adherenceToday =
    totalScheduledToday > 0
      ? Math.round(
          (completedToday /
            totalScheduledToday) *
            100
        )
      : 0;

  const userName =
    profile?.full_name?.trim() || 'there';

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Loading your dashboard...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              MediTrack
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
              Good day, {userName}
            </h1>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Keep track of your medications and daily doses.
            </p>
          </div>

          {/* Sign Out only */}
          <div className="flex w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:w-auto"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 15l3-3m0 0l-3-3m3 3H9"
                />
              </svg>

              Sign Out
            </button>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
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

              <div>
                <p className="font-semibold text-red-800 dark:text-red-300">
                  Something went wrong
                </p>

                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Today's Overview */}
        <section className="mb-6">
          <div className="mb-3">
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Today&apos;s Overview
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

            {/* Scheduled */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Scheduled
              </p>

              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {totalScheduledToday}
              </p>

              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                doses today
              </p>
            </div>

            {/* Completed */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Completed
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {completedToday}
              </p>

              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">
                doses taken
              </p>
            </div>

            {/* Pending */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Pending
              </p>

              <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
                {pendingToday}
              </p>

              <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                doses remaining
              </p>
            </div>

            {/* Adherence */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Adherence
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
                {adherenceToday}%
              </p>

              <p className="mt-1 text-xs text-blue-600 dark:text-blue-500">
                today
              </p>
            </div>
          </div>
        </section>

        {/* Refill Reminders */}
        <div className="mb-6">
          <RefillReminders
            medications={medications}
          />
        </div>

        {/* Upcoming Dose Reminder */}
        <UpcomingDoseReminder
          medications={medications}
          dosageLogs={dosageLogs}
        />

        {/* Today's Schedule */}
        <section className="mb-6">
          <TodaySchedule
            medications={medications}
            dosageLogs={dosageLogs}
            onLogDose={handleLogDose}
          />
        </section>

        {/* Adherence Statistics */}
        <section className="mb-6">
          <AdherenceStats
            medications={medications}
            dosageLogs={dosageLogs}
          />
        </section>

        {/* Your Medications */}
        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Your Medications
              </h2>

              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Manage your medicines and their schedules.
              </p>
            </div>

            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {medications.length}{' '}
              {medications.length === 1
                ? 'medication'
                : 'medications'}
            </span>
          </div>

          {medications.length === 0 ? (

            /* Empty State */
            <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="1.75"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 3h6m-6 0a2 2 0 00-2 2v1a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2m-3 7v7m-3-3h6"
                  />
                </svg>
              </div>

              <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                No medications yet
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                Add your first medication to start
                tracking doses, adherence, and stock
                levels.
              </p>

              <button
                type="button"
                onClick={() => {
                  setEditingMedication(null);
                  setIsMedicationModalOpen(true);
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 5v14M5 12h14"
                  />
                </svg>

                Add Medication
              </button>
            </div>

          ) : (

            /* Medication Cards + Add Medication Card */
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

              {medications.map((medication) => (
                <MedicationCard
                  key={medication.id}
                  medication={medication}
                  onEdit={handleEditMedication}
                  onDelete={handleDeleteMedication}
                />
              ))}

              {/* Add Medication Card */}
              <button
                type="button"
                onClick={() => {
                  setEditingMedication(null);
                  setIsMedicationModalOpen(true);
                }}
                className="group flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-white p-6 text-center transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-600 dark:hover:bg-blue-950/20"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:group-hover:bg-blue-900/60">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 5v14M5 12h14"
                    />
                  </svg>
                </div>

                <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Add Medication
                </h3>

                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Add a new medicine to your tracker
                </p>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Medication Modal */}
      <MedicationModal
        isOpen={isMedicationModalOpen}
        onClose={() => {
          setIsMedicationModalOpen(false);
          setEditingMedication(null);
        }}
        onSave={handleSaveMedication}
        initialData={editingMedication}
      />
    </main>
  );
}