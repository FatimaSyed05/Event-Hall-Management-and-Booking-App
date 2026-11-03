// backend/services/bookingServices.ts
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export const checkHallAvailability = async (hallId: string, date: string, timeSlot: string) => {
  try {
    const requestedTime = parseTimeSlot(timeSlot);
    if (!requestedTime) {
      return true;
    }

    const q = query(
      collection(db, 'bookings'),
      where('hallId', '==', hallId),
      where('date', '==', date),
      where('status', 'in', ['confirmed', 'pending', 'completed'])
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return true; 
    }

    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requestedDate.setHours(0, 0, 0, 0);
    const isPastDate = requestedDate < today;

    for (const doc of snapshot.docs) {
      const bookingData = doc.data();
      const bookingStatus = bookingData.status;

      if (bookingStatus === 'completed' && isPastDate) {
        continue; 
      }

      if (!bookingData.timeSlot) {
        continue;
      }

      const existingTime = parseTimeSlot(bookingData.timeSlot);
      
      if (!existingTime) {
        continue;
      }
      
      if (timeSlotsOverlap(requestedTime, existingTime)) {
        return false; 
      }
    }

    return true; 
  } catch (error) {
    console.error("Error checking availability:", error);
    return true;
  }
};

function parseTimeSlot(timeSlot: string): { start: number; end: number } | null {
  if (!timeSlot || typeof timeSlot !== 'string') return null;

  const trimmed = timeSlot.trim();
  if (!trimmed) return null;

  if (trimmed.includes(' to ')) {
    const [startTime, endTime] = trimmed.split(' to ');
    const start = convertTimeToMinutes(startTime?.trim());
    const end = convertTimeToMinutes(endTime?.trim());
    if (start === null || end === null) return null;
    return { start, end };
  }

  if (trimmed.includes(' - ')) {
    const [startTime, endTime] = trimmed.split(' - ');
    const start = convertTimeToMinutes(startTime?.trim());
    const end = convertTimeToMinutes(endTime?.trim());
    if (start === null || end === null) return null;
    return { start, end };
  }

  const textFormats: { [key: string]: { start: number; end: number } } = {
    'morning': { start: 8 * 60, end: 12 * 60 },
    'afternoon': { start: 12 * 60, end: 16 * 60 },
    'evening': { start: 18 * 60, end: 22 * 60 },
    // 'night': { start: 20 * 60, end: 24 * 60 }
  };

  const lowerTime = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(textFormats)) {
    if (lowerTime.includes(key)) return value;
  }

  return null;
}

function convertTimeToMinutes(time: string): number | null {
  if (!time || typeof time !== 'string') return null;
  const trimmed = time.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(' ');
  if (parts.length !== 2) return null;

  const [timePart, period] = parts;
  const timeParts = timePart.split(':');
  if (timeParts.length !== 2) return null;

  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);

  if (isNaN(hours) || isNaN(minutes)) return null;
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

  let hours24 = hours;
  const upperPeriod = period.toUpperCase();
  if (upperPeriod === 'PM' && hours !== 12) hours24 += 12;
  if (upperPeriod === 'AM' && hours === 12) hours24 = 0;

  return hours24 * 60 + minutes;
}

function timeSlotsOverlap(
  slot1: { start: number; end: number },
  slot2: { start: number; end: number }
): boolean {
  return slot1.start < slot2.end && slot2.start < slot1.end;
}