import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, ui } from '../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, color = colors.muted, size = 20 }: { name: IconName; color?: string; size?: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}
export function Button({ title, onPress, icon, variant = 'primary', disabled = false }: {
  title: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean;
}) {
  const textColor = variant === 'primary' ? '#F4F8F2' : variant === 'danger' ? colors.danger : colors.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor: variant === 'primary' ? colors.primary : variant === 'danger' ? colors.dangerSoft : colors.sidebar, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}>
    {icon && <Icon name={icon} size={18} color={textColor} />}<Text style={{ fontWeight: '600', fontSize: 14, color: textColor }}>{title}</Text>
  </Pressable>;
}
export function Chip({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => [styles.chip, { backgroundColor: selected ? colors.primarySoft : colors.surface, borderColor: selected ? '#ADCFC1' : colors.line, opacity: pressed ? 0.7 : 1 }]}>
    <Text style={{ color: selected ? colors.primary : colors.muted, fontSize: 13, fontWeight: selected ? '600' : '400' }}>{title}</Text>
  </Pressable>;
}
export function Chips({ options, selected, onChange }: { options: readonly string[]; selected: string; onChange: (value: string) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 3 }}>
    {options.map(title => <Chip key={title} title={title} selected={title === selected} onPress={() => onChange(title)} />)}
  </ScrollView>;
}
export function Badge({ active, label }: { active: boolean; label?: string }) {
  return <View style={[styles.badge, { backgroundColor: active ? colors.primarySoft : colors.peach }]}>
    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: active ? colors.primary : '#916D4D' }} />
    <Text style={{ color: active ? '#35645B' : '#7C6048', fontSize: 12, fontWeight: '600' }}>{label ?? (active ? 'Activo' : 'Inactivo')}</Text>
  </View>;
}
export function Avatar({ name, index = 0, large = false }: { name: string; index?: number; large?: boolean }) {
  return <View style={{ width: large ? 72 : 42, height: large ? 72 : 42, borderRadius: large ? 24 : 14, backgroundColor: [colors.primarySoft, colors.lavender, colors.blue, colors.peach][index % 4], alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color: colors.text, fontWeight: '600', fontSize: large ? 25 : 14 }}>{name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('')}</Text>
  </View>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={{ flexGrow: 1, flexBasis: 250, gap: 8 }}>
    <Text style={ui.label}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props} style={[ui.input, error && { borderColor: colors.danger }, props.style]} />
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}
  </View>;
}
export function Empty({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <View style={{ padding: 38, alignItems: 'center', gap: 12 }}><View style={styles.emptyIcon}><Icon name="people-outline" size={30} color={colors.primary} /></View>
    <Text style={[ui.heading, { textAlign: 'center' }]}>{title}</Text><Text style={[ui.muted, { textAlign: 'center', maxWidth: 330 }]}>{description}</Text>{action}
  </View>;
}
export function Confirm({ visible, title, description, onCancel, onConfirm, action }: { visible: boolean; title: string; description: string; onCancel: () => void; onConfirm: () => void; action: string }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={{ flex: 1, backgroundColor: '#293F4666', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <View accessibilityViewIsModal style={[ui.card, { width: '100%', maxWidth: 430, padding: 28 }]}>
        <Icon name="shield-checkmark-outline" size={32} color={colors.primary} /><Text style={ui.heading}>{title}</Text><Text style={ui.muted}>{description}</Text>
        <View style={[ui.wrap, { justifyContent: 'flex-end', marginTop: 12 }]}><Button title="Cancelar" variant="secondary" onPress={onCancel} /><Button title={action} onPress={onConfirm} /></View>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  button: { minHeight: 46, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  chip: { minHeight: 38, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10 },
  emptyIcon: { backgroundColor: colors.primarySoft, width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
