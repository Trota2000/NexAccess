import React, { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { Bluetooth } from "lucide-react-native";
import { useDesign } from "../api/Theme";
import { bluetooth, BluetoothState } from "./bluetooth";
import { message, Notice, styles } from "./ui";

export default function BluetoothAccess() {
  const { color, styles: s } = useDesign(styles);
  const [state, setState] = useState<BluetoothState>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const update = () => {
      void bluetooth
        .state()
        .then((next) => {
          if (active) setState(next);
        })
        .catch(() => {
          if (active) setError("No se pudo consultar Bluetooth.");
        });
    };
    update();
    const timer = setInterval(update, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function change(enabled: boolean) {
    setBusy(true);
    setError("");
    try {
      await bluetooth.enable(enabled);
      setState(await bluetooth.state());
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.card}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <View style={s.row}>
          <Bluetooth size={20} color={color.primary} />
          <Text style={s.sectionTitle}>Acceso Bluetooth</Text>
        </View>
        <Switch
          accessibilityLabel="Activar acceso Bluetooth automático"
          value={state?.enabled ?? false}
          disabled={
            busy || !state?.available || (!state.prepared && !state.enabled)
          }
          onValueChange={(enabled) => void change(enabled)}
          trackColor={{ true: color.primary }}
        />
      </View>
      <Text style={s.muted}>{state?.message || "Comprobando Bluetooth…"}</Text>
      {!!state?.available && !state.prepared && (
        <Text style={s.muted}>
          Actualizá Mi tarjeta y seleccioná una credencial vinculada a este
          teléfono.
        </Text>
      )}
      {!!error && <Notice error>{error}</Notice>}
    </View>
  );
}
