import React from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Screen, pagePadding } from './Screen';
import { colors, ui } from '../theme';

export default function ModulePage({ title, eyebrow, description, actions, children }: React.PropsWithChildren<{ title: string; eyebrow: string; description: string; actions?: React.ReactNode }>) {
  const { width } = useWindowDimensions();
  return <Screen section={title}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: pagePadding(width), paddingBottom: 40, gap: 22, maxWidth: 1400, width: '100%', alignSelf: 'center' }}>
    <View style={[ui.wrap, { justifyContent: 'space-between', gap: 18 }]}><View style={{ gap: 8, flexShrink: 1 }}><Text style={[ui.label, { fontSize: 11, letterSpacing: 2, color: colors.primary }]}>{eyebrow}</Text><Text style={ui.title}>{title}</Text><Text style={ui.muted}>{description}</Text></View>{actions}</View>
    {children}<Text style={{ color: colors.muted, fontSize: 12 }}>Demostración local · Datos ficticios · Los cambios se conservan hasta cerrar sesión o recargar.</Text>
  </ScrollView></Screen>;
}
export function StatCards({ items }: { items: { label: string; value: number | string; detail?: string }[] }) {
  return <View style={[ui.wrap, { alignItems: 'stretch' }]}>{items.map((item, i) => <View key={item.label} style={{ flexGrow: 1, flexBasis: 150, borderRadius: 18, backgroundColor: [colors.blue, colors.primarySoft, colors.lavender, colors.peach][i % 4], padding: 20, gap: 10 }}><Text style={ui.label}>{item.label}</Text><Text style={{ color: colors.text, fontSize: 30, fontWeight: '600' }}>{item.value}</Text>{!!item.detail && <Text style={ui.muted}>{item.detail}</Text>}</View>)}</View>;
}
