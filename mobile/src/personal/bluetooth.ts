import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import { NfcMode } from "./types";

export type BluetoothState = {
  available: boolean;
  permissions: boolean;
  bluetoothOn: boolean;
  enabled: boolean;
  running: boolean;
  prepared: boolean;
  mode: NfcMode;
  status: string;
  message: string;
};
interface NativeBle {
  getState(): Promise<BluetoothState>;
  setEnabled(enabled: boolean): Promise<void>;
  setMode(mode: NfcMode): Promise<void>;
  configureCredential(
    id: number,
    credential: string,
    expires: number,
  ): Promise<void>;
  disableCredential(): Promise<void>;
}
const native = (): NativeBle | undefined =>
  Platform.OS === "android" ? NativeModules.NexAccessBle : undefined;
export const bluetooth = {
  async state(): Promise<BluetoothState> {
    const module = native();
    if (module) return module.getState();
    return {
      available: false,
      permissions: false,
      bluetoothOn: false,
      enabled: false,
      running: false,
      prepared: false,
      mode: "foreground",
      status: "unavailable",
      message:
        "Bluetooth requiere instalar el APK actualizado y un ESP32 con el firmware BLE NexAccess.",
    };
  },
  async enable(enabled: boolean) {
    const module = native();
    if (!module) throw new Error("Instalá el APK con Bluetooth nativo.");
    if (enabled) {
      const required =
        Number(Platform.Version) >= 31
          ? [
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            ]
          : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const permissions = await PermissionsAndroid.requestMultiple(required);
      if (
        required.some(
          (key) => permissions[key] !== PermissionsAndroid.RESULTS.GRANTED,
        )
      )
        throw new Error(
          "Concedé el permiso de dispositivos cercanos para usar Bluetooth. En Android 11 o anterior se necesita ubicación.",
        );
      if (Number(Platform.Version) >= 33)
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
    }
    await module.setEnabled(enabled);
  },
  async setMode(mode: NfcMode) {
    await native()?.setMode(mode);
  },
  async configure(id: number, credential: string, expiresAt: string | null) {
    const module = native();
    if (!module) throw new Error("Instalá el APK con Bluetooth nativo.");
    await module.configureCredential(
      id,
      credential,
      expiresAt ? Date.parse(expiresAt) : 0,
    );
  },
  async disable() {
    await native()?.disableCredential();
  },
};
