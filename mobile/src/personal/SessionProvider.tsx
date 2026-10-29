import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { setTheme } from "../api/Theme";
import { PersonalClient } from "./client";
import { secrets } from "./storage";
import { nfc, NfcCapabilities } from "./nfc";
import { NfcMode } from "./types";

const preferencesKey = "nexaccess.personal.preferences.v1";
const initialCapabilities: NfcCapabilities = {
  available: false,
  enabled: false,
  alwaysAvailable: false,
  reason: "Comprobando compatibilidad NFC…",
};
const defaultClient = () =>
  new PersonalClient(
    process.env.EXPO_PUBLIC_PERSONAL_API_URL ||
      process.env.EXPO_PUBLIC_API_URL ||
      (Platform.OS === "web"
        ? "/api/v1"
        : "https://nexaccess.rattenkoenig.net/api/v1"),
    secrets,
    fetch,
    () => nfc.disable(),
  );
type PersonalContext = {
  client: PersonalClient;
  preferencesReady: boolean;
  nfcMode: NfcMode;
  capabilities: NfcCapabilities;
  setNfcMode: (mode: NfcMode) => Promise<void>;
  saveTheme: (theme: "light" | "dark") => Promise<void>;
};
const Context = createContext<PersonalContext | null>(null);
export function SessionProvider({
  children,
  client: provided,
}: {
  children: React.ReactNode;
  client?: PersonalClient;
}) {
  const client = useMemo(() => provided ?? defaultClient(), [provided]);
  const [preferencesReady, setReady] = useState(false);
  const [nfcMode, changeMode] = useState<NfcMode>("unlocked");
  const [capabilities, setCapabilities] = useState(initialCapabilities);
  const preferenceWrites = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(preferencesKey);
        const prefs = raw ? JSON.parse(raw) : {};
        if (prefs.theme === "dark" || prefs.theme === "light")
          setTheme(prefs.theme);
        if (
          ["foreground", "unlocked", "always"].includes(prefs.nfcMode) &&
          active
        )
          changeMode(prefs.nfcMode);
      } catch {
        /* Invalid non-secret preferences fall back to system/defaults. */
      }
      if (active) setReady(true);
      try {
        const next = await nfc.capabilities();
        if (active) setCapabilities(next);
      } catch {
        if (active)
          setCapabilities({
            ...initialCapabilities,
            reason:
              "No se pudo comprobar NFC. Tu tarjeta no está lista para presentar.",
          });
      }
      await client.restore();
    })();
    return () => {
      active = false;
    };
  }, [client]);
  async function preference(key: string, value: string) {
    const write = preferenceWrites.current.then(async () => {
      const raw = await AsyncStorage.getItem(preferencesKey);
      let current: Record<string, string> = {};
      try {
        current = raw ? JSON.parse(raw) : {};
      } catch {
        /* reset malformed preferences */
      }
      await AsyncStorage.setItem(
        preferencesKey,
        JSON.stringify({ ...current, [key]: value }),
      );
    });
    preferenceWrites.current = write.catch(() => {});
    await write;
  }
  return (
    <Context.Provider
      value={{
        client,
        preferencesReady,
        nfcMode,
        capabilities,
        async setNfcMode(mode) {
          if (
            mode === "always" &&
            capabilities.available &&
            !capabilities.alwaysAvailable
          )
            throw new Error(
              "Este teléfono no permite NFC con pantalla bloqueada o apagada.",
            );
          await nfc.setMode(mode);
          await preference("nfcMode", mode);
          changeMode(mode);
        },
        async saveTheme(theme) {
          await preference("theme", theme);
          setTheme(theme);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePersonal() {
  const context = useContext(Context);
  if (!context) throw new Error("SessionProvider is required");
  const session = useSyncExternalStore(
    context.client.subscribe,
    context.client.getSnapshot,
    context.client.getSnapshot,
  );
  return {
    ...context,
    ...session,
    notice:
      session.notice ||
      (__DEV__ && process.env.EXPO_PUBLIC_PERSONAL_PREVIEW === "1"
        ? "Vista de prueba · datos ficticios · NFC no disponible"
        : ""),
  };
}
