import { NativeModules, Platform } from "react-native";
import { NfcMode } from "./types";

// Android HCE prototype. Expo Go and web intentionally have no native implementation.
export type NfcCapabilities = {
  available: boolean;
  enabled: boolean;
  alwaysAvailable: boolean;
  reason: string;
};
interface NativeNfc {
  getCapabilities(): Promise<NfcCapabilities>;
  setMode(mode: NfcMode): Promise<void>;
  disableCredential(): Promise<void>;
  configureCredential(
    id: number,
    credential: string,
    expires: number,
  ): Promise<void>;
}
function native(): NativeNfc | undefined {
  return Platform.OS === "android" ? NativeModules.NexAccessHce : undefined;
}
export const nfc = {
  async capabilities(): Promise<NfcCapabilities> {
    const module = native();
    if (module) return module.getCapabilities();
    return {
      available: false,
      enabled: false,
      alwaysAvailable: false,
      reason:
        Platform.OS === "web"
          ? "La vista web permite revisar el diseño. NFC requiere la app Android y un lector compatible."
          : "La integración NFC nativa todavía no está instalada. Tu tarjeta aún no puede abrir accesos desde este teléfono.",
    };
  },
  async setMode(mode: NfcMode) {
    await native()?.setMode(mode);
  },
  async disable() {
    await native()?.disableCredential();
  },
  async configure(id: number, credential: string, expiresAt: string | null) {
    const module = native();
    if (!module)
      throw new Error("Instalá el APK con NFC nativo para usar la tarjeta.");
    await module.configureCredential(
      id,
      credential,
      expiresAt ? Date.parse(expiresAt) : 0,
    );
  },
};
