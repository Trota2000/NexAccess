import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, ui } from '../theme';

export function BarChart({ title, data, onSelect }: { title: string; data: { label: string; value: number }[]; onSelect?: (label: string) => void }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return <View style={[ui.card, { flexGrow: 1, flexBasis: 300 }]}><Text style={ui.heading}>{title}</Text>{data.length ? data.map((d, i) => <Pressable key={d.label} accessibilityRole={onSelect ? 'button' : 'text'} accessibilityLabel={`${d.label}: ${d.value} accesos`} disabled={!onSelect} onPress={() => onSelect?.(d.label)} style={{ gap: 6, paddingVertical: 5 }}><View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.muted}>{d.label}</Text><Text style={ui.label}>{d.value}</Text></View><View style={{ height: 12, backgroundColor: colors.sidebar, borderRadius: 8 }}><View style={{ width: `${Math.max(0, d.value / max * 100)}%`, height: 12, borderRadius: 8, backgroundColor: [colors.primary, '#8DA6B3', '#A89AB9'][i % 3] }} /></View></Pressable>) : <Text style={ui.muted}>Sin actividad para esta selección.</Text>}</View>;
}
