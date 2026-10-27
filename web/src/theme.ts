import { StyleSheet } from 'react-native';

export const colors = {
  "background": "var(--nx-bg)",
  "surface": "var(--nx-card)",
  "sidebar": "var(--nx-sidebar)",
  "text": "var(--nx-ink)",
  "muted": "var(--nx-muted)",
  "line": "var(--nx-border)",
  "primary": "var(--nx-primary)",
  "primarySoft": "var(--nx-soft)",
  "lavender": "var(--nx-raised)",
  "blue": "var(--nx-infoBg)",
  "peach": "var(--nx-warningBg)",
  "danger": "var(--nx-error)",
  "dangerSoft": "var(--nx-errorBg)"
};
export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 22, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.6 },
  heading: { fontSize: 18, fontWeight: '600', color: colors.text },
  text: { fontSize: 15, color: colors.text, lineHeight: 23 },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  input: { backgroundColor: colors.surface, color: colors.text, borderColor: colors.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15, minHeight: 48 },
});
