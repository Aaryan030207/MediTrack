export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  scheduled_times: string[];
  quantity: number;
  refill_threshold: number;
  created_at: string;
  updated_at: string;
}

export type MedicationInsert = Omit<Medication, 'id' | 'created_at' | 'updated_at'>;

export type MedicationUpdate = Partial<Omit<Medication, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export interface MedicationFormData {
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string;
  notes: string;
  scheduled_times: string[];
  quantity: number;
  refill_threshold: number;
}

export type DoseLogStatus = 'taken' | 'missed' | 'skipped';

export interface DosageLog {
  id: string;
  medicine_id: string;
  taken_at: string | null;
  status: DoseLogStatus;
  scheduled_date: string;
  scheduled_time: string;
  created_at?: string;
}

export type DoseDisplayStatus = 'Upcoming' | 'Due' | 'Completed' | 'Skipped';

export interface ScheduledDoseItem {
  id: string;
  medicationId: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  scheduledTime: string;
  formattedTime: string;
  status: DoseDisplayStatus;
  notes: string | null;
  log?: DosageLog;
}

/**
 * Formats a 24-hour time string ("14:00" or "08:30") into a 12-hour formatted time ("2:00 PM" or "8:30 AM").
 */
export function formatScheduledTime(time24: string): string {
  if (!time24) return '';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return time24;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const minutesFormatted = minutes.toString().padStart(2, '0');
  return `${hours12}:${minutesFormatted} ${period}`;
}

/**
 * Determines whether an unlogged dose is Upcoming or Due based on the user's current clock.
 */
export function getDoseStatus(time24: string): 'Upcoming' | 'Due' {
  if (!time24) return 'Upcoming';
  const parts = time24.split(':');
  if (parts.length < 2) return 'Upcoming';
  const doseHours = parseInt(parts[0], 10);
  const doseMinutes = parseInt(parts[1], 10);
  if (isNaN(doseHours) || isNaN(doseMinutes)) return 'Upcoming';

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduledTotalMinutes = doseHours * 60 + doseMinutes;
  const diff = scheduledTotalMinutes - currentMinutes;

  // If scheduled time is more than 30 minutes in the future -> Upcoming
  // Otherwise (due now or earlier today without a log) -> Due
  if (diff > 30) {
    return 'Upcoming';
  } else {
    return 'Due';
  }
}

/**
 * Generates YYYY-MM-DD from the user's local browser calendar date (avoiding UTC offset bugs).
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a local YYYY-MM-DD string for N days ago.
 */
export function getDaysAgoLocalDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getLocalDateString(d);
}

/**
 * Returns an array of the last N local calendar date strings [N-1 days ago, ..., today].
 */
export function getLastNDaysLocal(days: number = 7): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(getLocalDateString(d));
  }
  return dates;
}

/**
 * Formats a local YYYY-MM-DD string into a friendly label like "Today" or "Mon, Oct 2".
 */
export function formatLocalDateLabel(dateStr: string): string {
  const todayStr = getLocalDateString();
  if (dateStr === todayStr) {
    return 'Today';
  }
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
}
