import React, { createContext, useContext, useState } from 'react';
import { authenticateDemo, Session } from '../domain/auth';

type Auth = { session: Session | null; signIn: (username: string, password: string) => boolean; signOut: () => void };
const Context = createContext<Auth | null>(null);
export function SessionProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  function signIn(username: string, password: string) {
    const authenticated = authenticateDemo(username, password);
    if (!authenticated) return false;
    setSession(authenticated);
    return true;
  }
  return <Context.Provider value={{ session, signIn, signOut: () => setSession(null) }}>{children}</Context.Provider>;
}
export function useSession() {
  const context = useContext(Context);
  if (!context) throw new Error('Falta SessionProvider');
  return context;
}
