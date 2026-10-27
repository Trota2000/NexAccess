import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { AccessEvent } from '../../domain/types';
import { useUsers } from '../../state/UsersProvider';
import { Badge, Button, Empty, Icon } from '../../components/ui';
import { colors, ui } from '../../theme';

export default function EventList({ events }: { events: AccessEvent[] }) {
  const { users, credentials, formatDate } = useUsers();
  const [selected, setSelected] = useState<AccessEvent | null>(null);
  const name = (event: AccessEvent) => { const u = users.find(p => p.id === event.employeeId); return u ? `${u.nombre} ${u.apellido}` : 'Empleado no disponible'; };
  return <View style={{ gap: 12 }}>
    {events.length === 0 && <Empty title="Sin accesos registrados" description="Los eventos relacionados con este registro aparecerán aquí." />}
    {events.map(event => <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`Ver evento ${event.id}`} onPress={() => setSelected(event)} style={({ pressed }) => [ui.card, { padding: 18, gap: 10, backgroundColor: pressed ? colors.primarySoft : colors.surface }]}>
      <View style={[ui.wrap, { justifyContent: 'space-between' }]}><View style={ui.row}><Icon name="log-in-outline" color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>{event.area}</Text></View><Badge active={event.resultado === 'AUTORIZADO'} label={event.resultado === 'AUTORIZADO' ? 'Permitido' : 'Denegado'} /></View>
      <Text style={ui.text}>{name(event)}</Text><Text style={ui.muted}>{event.id} · {credentials.find(c => c.id === event.credentialId)?.maskedUid ?? event.credentialId}</Text><View style={[ui.wrap, { justifyContent: 'space-between' }]}><Text style={ui.muted}>{formatDate(event.date, true)} · {event.lector}</Text><Icon name="chevron-forward-outline" size={16} /></View>
    </Pressable>)}
    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}><View style={{ flex: 1, backgroundColor: 'var(--nx-overlay)', padding: 24, alignItems: 'center', justifyContent: 'center' }}>
      {selected && <View accessibilityViewIsModal style={[ui.card, { width: '100%', maxWidth: 480 }]}><Text style={ui.heading}>Detalle del acceso</Text><Text style={ui.label}>{selected.id} · Evento simulado</Text><Badge active={selected.resultado === 'AUTORIZADO'} label={selected.resultado === 'AUTORIZADO' ? 'Permitido' : 'Denegado'} />
        {[['Persona', name(selected)], ['Fecha y hora', formatDate(selected.date, true)], ['Área', selected.area], ['Dispositivo', selected.lector], ['Credencial', credentials.find(c => c.id === selected.credentialId)?.maskedUid ?? 'Sin credencial'], ['Motivo', selected.motivo]].map(([label, value]) => <View key={label} style={{ gap: 3 }}><Text style={ui.label}>{label}</Text><Text style={ui.text}>{value}</Text></View>)}
        <Text style={ui.muted}>Registro de solo lectura. Un acceso no representa una marcación de asistencia.</Text><Button title="Cerrar detalle" onPress={() => setSelected(null)} />
      </View>}
    </View></Modal>
  </View>;
}
