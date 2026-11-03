import React, { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { Bluetooth, Check } from "lucide-react-native";
import { useDesign } from "../api/Theme";
import { bluetooth, BluetoothState } from "./bluetooth";
import { Action, message, Notice, Sheet, styles } from "./ui";
import { nfcModes } from "./types";

export default function BluetoothAccess() {
  const { color, styles: s } = useDesign(styles);
  const [state, setState] = useState<BluetoothState>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
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
  async function change(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await operation();
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
          onValueChange={(enabled) =>
            void change(() => bluetooth.enable(enabled))
          }
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
      {!!state?.available && (
        <>
          <Action
            title={`Modo Bluetooth: ${nfcModes.find((m) => m.key === state.mode)?.title ?? "Solo con la app abierta"}`}
            secondary
            disabled={busy}
            onPress={() => setOpen(true)}
          />
          <Text style={s.muted}>
            Al acercarte a un lector compatible se presenta la tarjeta
            automáticamente. La proximidad depende de la señal; no requiere
            tocar un botón en cada acceso.
          </Text>
          {state.enabled && (
            <Text style={s.muted}>
              Para otro intento, alejate del lector y volvé a acercarte. Android
              puede detener el servicio por restricciones de batería o cierre
              forzado.
            </Text>
          )}
        </>
      )}
      {!!error && <Notice error>{error}</Notice>}
      {open && (
        <Sheet
          title="Cuándo usar Bluetooth"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          {nfcModes.map((mode) => (
            <Action
              key={mode.key}
              title={mode.title}
              secondary
              icon={state?.mode === mode.key ? Check : Bluetooth}
              disabled={busy}
              onPress={() =>
                void change(async () => {
                  await bluetooth.setMode(mode.key);
                  setOpen(false);
                })
              }
            />
          ))}
          <Text style={s.muted}>
            El segundo plano utiliza una notificación de servicio. El modo «En
            todo momento» depende de Android; no funciona con Bluetooth apagado
            ni con el teléfono apagado.
          </Text>
        </Sheet>
      )}
    </View>
  );
}
