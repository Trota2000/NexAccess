import React, { useState } from "react";
import {
  Modal,
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
          <CalendarDays size={19} color="#286c64" />
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
            <X size={18} color="#586e74" />
          </Pressable>
        )}
      </View>
      {open && (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <View style={s.overlay}>
            <View accessibilityViewIsModal style={s.calendar}>
              <View style={s.inline}>
                <Text style={[s.heading, { flex: 1 }]}>{label}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar calendario"
                  onPress={() => setOpen(false)}
                  style={s.clear}
                >
                  <X size={20} color="#286c64" />
                </Pressable>
              </View>
              <View style={s.inline}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mes anterior"
                  onPress={() => move(-1)}
                  style={s.clear}
                >
                  <ChevronLeft size={20} color="#286c64" />
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
                  <ChevronRight size={20} color="#286c64" />
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
                    onPress={() => setDay(d.day)}
                    style={[s.day, day === d.day && s.selected]}
                  >
                    <Text
                      style={{
                        color:
                          day === d.day
                            ? "#f4faf7"
                            : d.current
                              ? "#263e45"
                              : "#93a39e",
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
                <Text accessibilityRole="alert" style={{ color: "#8e343c" }}>
                  {error}
                </Text>
              )}
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
                <Text style={{ color: "#f4faf7", fontWeight: "600" }}>
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
const s = StyleSheet.create({
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#a6bbb3",
    backgroundColor: "#f5f8f5",
    borderRadius: 10,
    padding: 12,
  },
  clear: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  text: { fontSize: 15, color: "#263e45" },
  heading: { fontSize: 17, fontWeight: "600", color: "#263e45" },
  muted: { fontSize: 13, color: "#586e74" },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "rgba(32,55,53,.24)",
  },
  calendar: {
    width: "100%",
    maxWidth: 370,
    padding: 18,
    gap: 14,
    borderRadius: 20,
    backgroundColor: "#f8faf8",
    borderWidth: 1,
    borderColor: "#cedcd7",
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
  selected: { backgroundColor: "#286c64" },
  time: {
    width: 52,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#a6bbb3",
    borderRadius: 8,
    textAlign: "center",
    color: "#263e45",
  },
  confirm: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#286c64",
  },
});
