import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, SlidersHorizontal } from "lucide-react-native";
import { Metric } from "./workflows";
const seriesKey = (m: Metric) => m.key + String(m.query.result ?? "");
const palette = [
  "#286c64",
  "#7b9991",
  "#93b5ad",
  "#b5cbb6",
  "#7d9da6",
  "#a5b49c",
  "#c2b69a",
];
export default function MetricChart({ metrics }: { metrics: Metric[] }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const chosen = metrics.filter((m) => !hidden.includes(seriesKey(m)));
  const max = Math.max(1, ...chosen.map((m) => m.value ?? 0));
  return (
    <View style={s.card}>
      <View style={s.row}>
        <SlidersHorizontal size={18} color="#286c64" />
        <Text style={s.heading}>Comparar indicadores</Text>
      </View>
      <View style={s.row}>
        {metrics.map((m, i) => (
          <Pressable
            key={m.label}
            accessibilityRole="checkbox"
            accessibilityLabel={`Mostrar ${m.label}`}
            accessibilityState={{ checked: !hidden.includes(seriesKey(m)) }}
            onPress={() =>
              setHidden((list) =>
                list.includes(seriesKey(m))
                  ? list.filter((v) => v !== seriesKey(m))
                  : [...list, seriesKey(m)],
              )
            }
            style={s.check}
          >
            <View
              style={[
                s.box,
                {
                  borderColor: palette[i % palette.length],
                  backgroundColor: hidden.includes(seriesKey(m))
                    ? "transparent"
                    : palette[i % palette.length],
                },
              ]}
            >
              {!hidden.includes(seriesKey(m)) && (
                <Check size={13} color="#f8faf8" />
              )}
            </View>
            <Text style={s.text}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
      {!chosen.length ? (
        <Text style={s.text}>Seleccioná al menos un indicador.</Text>
      ) : (
        <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
          <View
            accessibilityLabel="Gráfico de barras con valores"
            style={{
              height: 300,
              minWidth: Math.max(440, chosen.length * 100),
              flex: 1,
              paddingTop: 18,
              paddingHorizontal: 26,
            }}
          >
            <View style={s.plot}>
              {chosen.map((m) => {
                const index = metrics.indexOf(m),
                  height = m.value === undefined ? 0 : (m.value / max) * 180;
                return (
                  <View
                    key={m.label}
                    accessibilityLabel={`${m.label}: ${m.value ?? "no disponible"}`}
                    style={{
                      flex: 1,
                      height: "100%",
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    <View
                      style={[
                        s.bar,
                        {
                          height,
                          width: "72%",
                          backgroundColor: palette[index % palette.length],
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.value,
                          { position: "absolute", top: height >= 30 ? 8 : -22 },
                        ]}
                      >
                        {m.value === undefined ? "—" : m.value}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={3}
                      style={{
                        position: "absolute",
                        bottom: -48,
                        height: 42,
                        textAlign: "center",
                        fontSize: 11,
                        color: "#586e74",
                        width: "100%",
                      }}
                    >
                      {m.label.split(" · ")[0]}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={[s.text, { textAlign: "center", marginTop: 54 }]}>
              Conteos del servidor · escala 0–{max}
            </Text>
          </View>
        </ScrollView>
      )}
      {chosen.some((m) => m.value === undefined) && (
        <Text style={s.text}>
          Los indicadores sin datos disponibles no se representan como cero.
        </Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: "#f8faf8",
    borderWidth: 1,
    borderColor: "#cedcd7",
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  heading: { fontSize: 18, fontWeight: "600", color: "#263e45" },
  text: { fontSize: 13, color: "#586e74" },
  check: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 36 },
  box: {
    width: 19,
    height: 19,
    borderWidth: 1,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  plot: {
    flexDirection: "row",
    gap: 12,
    height: 190,
    borderBottomWidth: 1,
    borderColor: "#a6bbb3",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    position: "relative",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: "#eef3f1",
    alignItems: "flex-end",
    paddingRight: 6,
  },
  value: {
    fontSize: 12,
    fontWeight: "700",
    color: "#173e39",
    backgroundColor: "#f8faf8",
    paddingHorizontal: 4,
    borderRadius: 4,
    marginTop: 0,
  },
});
