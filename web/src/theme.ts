import { StyleSheet } from 'react-native';

export const colors = {
  background: '#F3F5F2', surface: '#FAFBF8', sidebar: '#E9EEEA', text: '#293F46',
  muted: '#65797D', line: '#DCE4DF', primary: '#356D6B', primarySoft: '#DDEEE7',
  lavender: '#E8E6F3', blue: '#E1ECF3', peach: '#F4E9DD', danger: '#98534B', dangerSoft: '#F6E5DF',
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
