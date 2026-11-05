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
import { AppState, Platform } from "react-native";
import { setTheme } from "../api/Theme";
import { PersonalClient } from "./client";
import { secrets } from "./storage";
import { nfc, NfcCapabilities } from "./nfc";
import { NfcMode, nfcModes } from "./types";
import { bluetooth } from "./bluetooth";

const preferencesKey = "nexaccess.personal.preferences.v1";
async function applyAccessMode(mode: NfcMode) {
  const results = await Promise.allSettled([
    nfc.setMode(mode),
    bluetooth.setMode(mode),
  ]);
  if (results.some((result) => result.status === "rejected"))
    throw new Error("No se pudo aplicar el modo a NFC y Bluetooth.");
}
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
        : "https://nx.rattenkoenig.net/api/v1"),
    secrets,
    fetch,
    async () => {
      await Promise.all([nfc.disable(), bluetooth.disable()]);
    },
    async (id, credential, expiresAt) => {
      const [nfcState, bleState] = await Promise.all([
        nfc.capabilities(),
        bluetooth.state(),
      ]);
      if (!nfcState.available && !bleState.available)
        throw new Error(
          "Este teléfono no tiene una integración de acceso disponible.",
        );
      await Promise.all([
        ...(nfcState.available
          ? [nfc.configure(id, credential, expiresAt)]
          : []),
        ...(bleState.available
          ? [bluetooth.configure(id, credential, expiresAt)]
          : []),
      ]);
    },
  );
type PersonalContext = {
  client: PersonalClient;
  preferencesReady: boolean;
  accessMode: NfcMode;
  modeNotice: string;
  capabilities: NfcCapabilities;
  setAccessMode: (mode: NfcMode) => Promise<void>;
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
  const [accessMode, changeMode] = useState<NfcMode>("unlocked");
  const [modeNotice, setModeNotice] = useState("");
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
        const saved = nfcModes.find(({ key }) => key === prefs.accessMode);
        let mode = saved?.key;
        if (!mode) {
          const previousNfc =
            nfcModes.find(({ key }) => key === prefs.nfcMode)?.key ??
            "unlocked";
          const previousBle = await bluetooth.state();
          // Keep the more restrictive setting when migrating two old choices.
          mode = nfcModes.find(
            ({ key }) =>
              key === previousNfc ||
              (previousBle.available && key === previousBle.mode),
          )!.key;
        }
        if (!active) return;
        await applyAccessMode(mode);
        if (!saved) await preference("accessMode", mode);
        if (active) changeMode(mode);
      } catch {
        if (active)
          setModeNotice(
            "No se pudo restaurar el modo. Elegilo en Uso de la tarjeta.",
          );
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
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active")
        void nfc
          .capabilities()
          .then(setCapabilities)
          .catch(() => {});
    });
    return () => sub.remove();
  }, []);
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
        accessMode,
        modeNotice,
        capabilities,
        async setAccessMode(mode) {
          if (
            mode === "always" &&
            capabilities.available &&
            !capabilities.alwaysAvailable
          )
            throw new Error(
              "Este teléfono no permite NFC con pantalla bloqueada o apagada.",
            );
          try {
            await applyAccessMode(mode);
            await preference("accessMode", mode);
          } catch (error) {
            try {
              await applyAccessMode(accessMode);
            } catch {
              setModeNotice(
                "Volvé a elegir el modo para sincronizar NFC y Bluetooth.",
              );
            }
            throw error;
          }
          changeMode(mode);
          setModeNotice("");
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
      context.modeNotice ||
      (__DEV__ && process.env.EXPO_PUBLIC_PERSONAL_PREVIEW === "1"
        ? "Vista de prueba · datos ficticios · NFC no disponible"
        : ""),
  };
}
