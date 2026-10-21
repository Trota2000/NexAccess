import { AccessEvent, Credential, Employee } from './types';
import { dateKey } from './reports';
import { normalize } from './users';
import { validDate } from './system';

export type HistoryFilters = { search: string; result: string; area: string; device: string; from: string; until: string; timeFrom: string; timeUntil: string; order: string };
export const emptyHistoryFilters: HistoryFilters = { search: '', result: 'Todos', area: 'Todas', device: 'Todos', from: '', until: '', timeFrom: '', timeUntil: '', order: 'Recientes' };
export function historyFilterError(f: HistoryFilters) {
  if ((f.from && !validDate(f.from)) || (f.until && !validDate(f.until)) || (f.from && f.until && f.from > f.until)) return 'Ingresá un intervalo de fechas válido (AAAA-MM-DD).';
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if ((f.timeFrom && !time.test(f.timeFrom)) || (f.timeUntil && !time.test(f.timeUntil)) || (f.timeFrom && f.timeUntil && f.timeFrom > f.timeUntil)) return 'Ingresá horas válidas (HH:MM), con inicio anterior al fin.';
  return '';
}
export function eventTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}
export function filterAccessEvents(events: AccessEvent[], employees: Employee[], credentials: Credential[], filters: HistoryFilters, timezone: string) {
  if (historyFilterError(filters)) return [];
  const query = normalize(filters.search);
  return events.filter(e => {
    const employee = employees.find(p => p.id === e.employeeId);
    const credential = credentials.find(c => c.id === e.credentialId);
    const day = dateKey(e.date, timezone), time = eventTime(e.date, timezone);
    return (!query || normalize(`${employee?.nombre ?? ''} ${employee?.apellido ?? ''} ${e.id} ${e.employeeId} ${e.credentialId} ${credential?.maskedUid ?? ''} ${e.area} ${e.lector}`).includes(query)) &&
      (filters.result === 'Todos' || filters.result === e.resultado) && (filters.area === 'Todas' || filters.area === e.areaId) && (filters.device === 'Todos' || filters.device === e.deviceId) &&
      (!filters.from || day >= filters.from) && (!filters.until || day <= filters.until) && (!filters.timeFrom || time >= filters.timeFrom) && (!filters.timeUntil || time <= filters.timeUntil);
  }).sort((a,b) => filters.order === 'Antiguos' ? Date.parse(a.date)-Date.parse(b.date) : Date.parse(b.date)-Date.parse(a.date));
}
