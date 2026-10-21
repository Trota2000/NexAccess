import React, { useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, Button } from './ui';
import { normalize } from '../domain/users';
import { colors, ui } from '../theme';

export type Option = { value: string; label: string };
export function SelectField({ label, value, options, onChange, error }: { label: string; value: string; options: Option[]; onChange: (value: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  return <View style={{ gap: 8, flexGrow: 1, flexBasis: 240 }}><Text style={ui.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { setSearch(''); setOpen(true); }} style={[ui.row, ui.input, { justifyContent: 'space-between' }, !!error && { borderColor: colors.danger }]}><Text style={[ui.text, { flex: 1, fontSize: 14 }]}>{options.find(o => o.value === value)?.label ?? 'Seleccionar…'}</Text><Icon name="chevron-down-outline" size={16} /></Pressable>{!!error && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}><SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><View style={{ flex: 1, padding: 24, gap: 18, maxWidth: 700, width: '100%', alignSelf: 'center' }}><View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.heading}>{label}</Text><Button title="Cerrar selector" variant="secondary" onPress={() => setOpen(false)} /></View><TextInput accessibilityLabel={`Buscar ${label}`} placeholder="Buscar opción…" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={ui.input} />
      <FlatList keyboardShouldPersistTaps="handled" data={options.filter(o => normalize(o.label).includes(normalize(search)))} keyExtractor={o => o.value} ListEmptyComponent={<Text style={ui.muted}>No hay opciones para esta búsqueda.</Text>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: item.value === value }} onPress={() => { onChange(item.value); setOpen(false); }} style={[ui.row, { padding: 18, marginBottom: 8, borderRadius: 12, backgroundColor: item.value === value ? colors.primarySoft : colors.surface }]}><Text style={[ui.text, { flex: 1 }]}>{item.label}</Text>{item.value === value && <Icon name="checkmark-outline" color={colors.primary} />}</Pressable>} />
    </View></SafeAreaView></Modal>
  </View>;
}
