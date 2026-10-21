import { IconName } from '../components/ui';

export const modules: { group: string; label: string; icon: IconName; path: string }[] = [
  { group: 'GENERAL', label: 'Dashboard', icon: 'grid-outline', path: '/dashboard' },
  { group: 'GENERAL', label: 'Historial de accesos', icon: 'time-outline', path: '/historial' },
  { group: 'ADMINISTRACIÓN', label: 'Empleados', icon: 'people-outline', path: '/' },
  { group: 'ADMINISTRACIÓN', label: 'Tarjetas RFID/NFC', icon: 'card-outline', path: '/tarjetas' },
  { group: 'ADMINISTRACIÓN', label: 'Áreas y salas', icon: 'business-outline', path: '/areas' },
  { group: 'ADMINISTRACIÓN', label: 'Lectores y dispositivos', icon: 'hardware-chip-outline', path: '/lectores' },
  { group: 'ADMINISTRACIÓN', label: 'Permisos de acceso', icon: 'shield-checkmark-outline', path: '/permisos' },
  { group: 'MONITOREO', label: 'Alertas', icon: 'notifications-outline', path: '/alertas' },
  { group: 'MONITOREO', label: 'Reportes', icon: 'bar-chart-outline', path: '/reportes' },
  { group: 'MONITOREO', label: 'Auditoría', icon: 'list-outline', path: '/auditoria' },
  { group: 'SISTEMA', label: 'Configuración', icon: 'settings-outline', path: '/configuracion' },
];
