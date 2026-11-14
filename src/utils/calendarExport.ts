import { CalendarEvent } from '../types';

/**
 * Generates an .ics file formatted string for an event or multiple events
 */
export function generateIcs(events: CalendarEvent[]): string {
  const formatDate = (dateStr: string, timeStr: string) => {
    // Expected dateStr: YYYY-MM-DD, timeStr: HH:MM
    const [year, month, day] = dateStr.split('-');
    const [hours, minutes] = timeStr.split(':');
    return `${year}${month}${day}T${hours}${minutes}00`;
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Toki Prime Executive Assistant//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((evt) => {
    const dtStart = formatDate(evt.date, evt.startTime);
    const dtEnd = formatDate(evt.date, evt.endTime);
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:toki-${evt.id}-${Date.now()}@tokiprime.ai`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${evt.title.replace(/[,;]/g, ' ')}`);
    if (evt.description) {
      lines.push(`DESCRIPTION:${evt.description.replace(/\n/g, '\\n')}`);
    }
    if (evt.location) {
      lines.push(`LOCATION:${evt.location.replace(/[,;]/g, ' ')}`);
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a browser download of the .ics calendar file
 */
export function downloadIcsFile(events: CalendarEvent[], fileName = 'toki-agenda.ics') {
  const content = generateIcs(events);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a direct Google Calendar event creation URL
 */
export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const formatDateTime = (dateStr: string, timeStr: string) => {
    const cleanDate = dateStr.replace(/-/g, '');
    const cleanTime = timeStr.replace(/:/g, '') + '00';
    return `${cleanDate}T${cleanTime}`;
  };

  const start = formatDateTime(event.date, event.startTime);
  const end = formatDateTime(event.date, event.endTime);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || 'Agendado pelo assistente executivo Toki Prime.',
    location: event.location || 'Google Meet',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
