import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useUsers } from '../../state/UsersProvider';
import { ROLES } from '../../domain/types';
import { colors, ui } from '../../theme';

export default function PermissionMatrix() {
  const { records, permissions } = useUsers();
  return <View style={ui.card}><Text style={ui.heading}>Matriz de roles de acceso físico</Text><Text style={ui.muted}>Indica permisos configurados y vigentes, no una autorización de entrada en este instante. El backend evalúa además día, hora, empleado, credencial y área. Estos roles no conceden privilegios de administración.</Text><ScrollView horizontal><View><View style={ui.row}><Text style={[ui.label, { width: 130 }]}>ROL / ÁREA</Text>{records.areas.map(a => <Text key={a.id} style={[ui.label, { width: 140, textAlign: 'center' }]}>{a.fields.name}</Text>)}</View>{ROLES.map(role => <View key={role} style={[ui.row, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }]}><Text style={[ui.text, { width: 130 }]}>{role}</Text>{records.areas.map(a => { const allowed = permissions.some(p => !p.employeeId && p.role === role && p.area === a.fields.name && p.activa); return <Text key={a.id} style={{ width: 140, textAlign: 'center', color: allowed ? colors.primary : colors.muted, backgroundColor: allowed ? colors.primarySoft : colors.peach, paddingVertical: 8, borderRadius: 8, fontSize: 12 }}>{allowed ? 'Configurado' : 'Sin permiso por rol'}</Text>; })}</View>)}</View></ScrollView></View>;
}
