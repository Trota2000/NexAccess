import { Colors, spacing, useDesign, useReducedMotion } from "./Theme";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react-native";
import { calendarInstant, localParts, monthDays } from "./dates";
const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
export default function CalendarField({
  label,
  value,
  onChange,
  edge = "instant",
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  edge?: "from" | "to" | "instant";
}) {
  const { color, styles: s } = useDesign(makeStyles);

  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false),
    [day, setDay] = useState(""),
    [month, setMonth] = useState(0),
    [year, setYear] = useState(2026),
    [hour, setHour] = useState("00"),
    [minute, setMinute] = useState("00"),
    [error, setError] = useState("");
  function show() {
    const p = localParts(value ? String(value) : undefined);
    setDay(p.day);
    setMonth(+p.day.slice(5, 7) - 1);
    setYear(+p.day.slice(0, 4));
    setHour(p.hour);
    setMinute(p.minute);
    setError("");
    setOpen(true);
  }
  function move(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  }
  const shown = value ? localParts(String(value)) : undefined;
  return (
    <>
      <View style={s.inline}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Calendario: ${label}`}
          onPress={show}
          style={s.field}
        >
          <CalendarDays size={19} color={color.primary} />
          <Text style={s.text}>
            {shown
              ? shown.day.split("-").reverse().join("/") +
                (edge === "instant" ? ` · ${shown.hour}:${shown.minute}` : "")
              : "Seleccionar fecha"}
          </Text>
        </Pressable>
        {!!value && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Limpiar ${label}`}
            onPress={() => onChange("")}
            style={s.clear}
          >
            <X size={18} color={color.muted} />
          </Pressable>
        )}
      </View>
      {open && (
        <Modal
          transparent
          animationType={reduced ? "none" : "fade"}
          onRequestClose={() => setOpen(false)}
        >
          <View style={s.overlay}>
            <View
              role="dialog"
              accessibilityLabel={label}
              accessibilityViewIsModal
              style={s.calendar}
            >
              <View style={s.inline}>
                <Text style={[s.heading, { flex: 1 }]}>{label}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar calendario"
                  onPress={() => setOpen(false)}
                  style={s.clear}
                >
                  <X size={20} color={color.primary} />
                </Pressable>
              </View>
              <ScrollView
                style={{ flexShrink: 1 }}
                contentContainerStyle={{ gap: spacing.md }}
              >
                <View style={s.inline}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Mes anterior"
                    onPress={() => move(-1)}
                    style={s.clear}
                  >
                    <ChevronLeft size={20} color={color.primary} />
                  </Pressable>
                  <Text style={[s.heading, { flex: 1, textAlign: "center" }]}>
                    {months[month]} {year}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Mes siguiente"
                    onPress={() => move(1)}
                    style={s.clear}
                  >
                    <ChevronRight size={20} color={color.primary} />
                  </Pressable>
                </View>
                <View style={s.grid}>
                  {["L", "M", "X", "J", "V", "S", "D"].map((name, i) => (
                    <View key={i} style={s.weekday}>
                      <Text style={s.muted}>{name}</Text>
                    </View>
                  ))}
                  {monthDays(year, month).map((d) => (
                    <Pressable
                      key={d.day}
                      accessibilityRole="button"
                      accessibilityLabel={`Elegir ${d.day}`}
                      
                      accessibilityState={{ selected: day === d.day }}
                      aria-selected={day === d.day}
                      onPress={() => setDay(d.day)}
                      style={[s.day, day === d.day && s.selected]}
                    >
                      <Text
                        style={{
                          color:
                            day === d.day
                              ? color.onPrimary
                              : d.current
                                ? color.ink
                                : color.muted,
                        }}
                      >
                        {d.number}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {edge === "instant" && (
                  <View style={s.inline}>
                    <Text style={s.text}>Hora</Text>
                    <TextInput
                      accessibilityLabel="Hora del calendario"
                      keyboardType="number-pad"
                      maxLength={2}
                      value={hour}
                      onChangeText={setHour}
                      style={s.time}
                    />
                    <Text style={s.text}>:</Text>
                    <TextInput
                      accessibilityLabel="Minutos del calendario"
                      keyboardType="number-pad"
                      maxLength={2}
                      value={minute}
                      onChangeText={setMinute}
                      style={s.time}
                    />
                  </View>
                )}
                <Text style={s.muted}>
                  Asunción
                  {edge === "from"
                    ? " · inicio del día"
                    : edge === "to"
                      ? " · fin del día"
                      : ""}
                </Text>
                {!!error && (
                  <Text
                    accessibilityRole="alert"
                    style={{ color: color.error }}
                  >
                    {error}
                  </Text>
                )}
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirmar fecha"
                onPress={() => {
                  try {
                    onChange(calendarInstant(day, edge, hour, minute));
                    setOpen(false);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Fecha inválida");
                  }
                }}
                style={s.confirm}
              >
                <Text style={{ color: color.onPrimary, fontWeight: "600" }}>
                  Confirmar fecha
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
function makeStyles(color: Colors) {
  return StyleSheet.create({
    inline: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    field: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 46,
      borderWidth: 1,
      borderColor: color.controlBorder,
      backgroundColor: color.input,
      borderRadius: 10,
      padding: spacing.md,
    },
    clear: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
    },
    text: { fontSize: 15, color: color.ink },
    heading: { fontSize: 17, fontWeight: "600", color: color.ink },
    muted: { fontSize: 13, color: color.muted },
    overlay: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      backgroundColor: color.overlay,
    },
    calendar: {
      width: "100%",
      maxWidth: 370,
      maxHeight: "85%",
      padding: spacing.lg,
      gap: spacing.md,
      borderRadius: 16,
      backgroundColor: color.card,
      borderWidth: 1,
      borderColor: color.border,
    },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    weekday: {
      width: "14.2857%",
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    day: {
      width: "14.2857%",
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
    },
    selected: { backgroundColor: color.primary },
    time: {
      width: 52,
      minHeight: 44,
      borderWidth: 1,
      borderColor: color.controlBorder,
      borderRadius: 8,
      textAlign: "center",
      color: color.ink,
    },
    confirm: {
      minHeight: 46,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: color.primary,
    },
  });
}
