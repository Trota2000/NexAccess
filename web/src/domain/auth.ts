// Demo-only credentials, deliberately public. Replace this adapter with the
// team's authentication API before handling real accounts or access permissions.
export const DEMO_ACCOUNT = { username: 'admin', password: 'NexAccess2026!' } as const;
export type Session = { username: string; displayName: string };
export function validateLogin(username: string, password: string) {
  return {
    username: username.trim() ? undefined : 'Ingresá tu usuario.',
    password: password ? undefined : 'Ingresá tu contraseña.',
  };
}
export function authenticateDemo(username: string, password: string): Session | null {
  return username.trim().toLowerCase() === DEMO_ACCOUNT.username && password === DEMO_ACCOUNT.password
    ? { username: DEMO_ACCOUNT.username, displayName: 'Administrador Demo' }
    : null;
}
