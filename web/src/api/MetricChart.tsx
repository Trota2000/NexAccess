import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, ChevronRight, SlidersHorizontal } from "lucide-react-native";
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
export default function MetricChart({
  metrics,
  onConsult,
}: {
  metrics: Metric[];
  onConsult?: (metric: Metric) => void;
}) {
  const [width, setWidth] = useState(0);
  const columns = width >= 850 ? 3 : width >= 500 ? 2 : 1;
  const [hidden, setHidden] = useState<string[]>([]);
  const chosen = metrics.filter((m) => !hidden.includes(seriesKey(m)));
  const max = Math.max(1, ...chosen.map((m) => m.value ?? 0));
  return (
    <View style={s.card} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={s.row}>
        <SlidersHorizontal size={18} color="#286c64" />
        <Text style={s.heading}>Comparar indicadores</Text>
      </View>
      {!chosen.length ? (
        <Text style={s.text}>Seleccioná al menos un indicador.</Text>
      ) : (
        <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
          <View
            accessibilityLabel="Gráfico de barras con valores"
            style={{
              height: 300,
              minWidth: Math.max(440, metrics.length * 100),
              flex: 1,
              paddingTop: 18,
              paddingHorizontal: 26,
            }}
          >
            <View style={s.plot}>
              {metrics.map((m, index) => {
                if (hidden.includes(seriesKey(m)))
                  return (
                    <View
                      key={seriesKey(m)}
                      style={s.slot}
                      accessible={false}
                    />
                  );
                const height =
                  m.value === undefined ? 0 : (m.value / max) * 180;
                return (
                  <View
                    key={seriesKey(m)}
                    accessibilityLabel={`${m.label}: ${m.value ?? "no disponible"}`}
                    style={s.slot}
                  >
                    <View
                      style={[
                        s.bar,
                        {
                          height,
                          width: "72%",
                          maxWidth: 56,
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
      <View style={s.summary}>
        {metrics.map((m, i) => (
          <View
            key={seriesKey(m)}
            style={{
              width: columns === 3 ? "33.333%" : columns === 2 ? "50%" : "100%",
              padding: 5,
            }}
          >
            <View style={s.indicator}>
              <Pressable
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
                <Text numberOfLines={2} style={s.indicatorLabel}>
                  {m.label}
                </Text>
              </Pressable>
              <View style={s.indicatorFooter}>
                <Text
                  accessibilityLabel={`Total ${m.label}: ${m.value ?? "no disponible"}`}
                  style={s.total}
                >
                  {m.value === undefined
                    ? "—"
                    : m.value.toLocaleString("es-PY")}
                </Text>
                {!!onConsult && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Consultar ${m.label.toLowerCase()}`}
                    onPress={() => onConsult(m)}
                    style={s.consult}
                  >
                    <Text style={s.consultText}>Consultar</Text>
                    <ChevronRight size={16} color="#286c64" />
                  </Pressable>
                )}
              </View>
              {!!m.error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {m.error}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
      {metrics
        .filter((m) => m.hint)
        .map((m) => (
          <Text key={seriesKey(m)} style={s.text}>
            {m.hint}
          </Text>
        ))}
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
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
    justifyContent: "center",
  },
  indicator: {
    flex: 1,
    backgroundColor: "#eef3f1",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  indicatorLabel: { color: "#263e45", fontSize: 13, lineHeight: 18, flex: 1 },
  indicatorFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  total: { fontSize: 24, fontWeight: "700", color: "#286c64" },
  consult: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    minHeight: 40,
    paddingHorizontal: 6,
  },
  consultText: { fontSize: 13, fontWeight: "600", color: "#286c64" },
  error: { fontSize: 13, color: "#8e343c" },
  check: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 42 },
  box: {
    width: 19,
    height: 19,
    borderWidth: 1,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  slot: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
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
