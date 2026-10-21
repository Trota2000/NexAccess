import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, pagePadding } from '../../components/Screen';
import { Avatar, Badge, Button, Chips, Empty, Icon } from '../../components/ui';
import { colors, ui } from '../../theme';
import { useUsers } from '../../state/UsersProvider';
import { filterUsers, normalize } from '../../domain/users';
import { Role, ROLES } from '../../domain/types';

export default function Directory() {
  const { users, credentials, formatDate, settings } = useUsers();
  const { width } = useWindowDimensions();
  const table = width >= 1000;
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | 'Todos'>('Todos');
  const [status, setStatus] = useState('Todos');
  const [order, setOrder] = useState('Recientes');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => filterUsers(users, search, role, status).sort((a, b) => order === 'Nombre A–Z' ? normalize(`${a.nombre} ${a.apellido}`).localeCompare(normalize(`${b.nombre} ${b.apellido}`)) : b.createdAt.localeCompare(a.createdAt)), [users, search, role, status, order]);
  const pages = Math.max(1, Math.ceil(filtered.length / settings.pageSize));
  const current = Math.min(page, pages);
  function reset() { setSearch(''); setRole('Todos'); setStatus('Todos'); setPage(1); }
  const stat = (label: string, count: number, icon: 'people-outline' | 'checkmark-circle-outline' | 'card-outline', background: string) => <View key={label} style={{ flex: 1, minWidth: table ? 180 : 90, backgroundColor: background, padding: table ? 22 : 16, borderRadius: 18, gap: 12 }}>
    <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={{ color: colors.muted, fontSize: table ? 13 : 11 }}>{label}</Text>{table && <Icon name={icon} color={colors.text} />}</View>
    <Text style={{ fontSize: table ? 32 : 25, color: colors.text, fontWeight: '600' }}>{String(count).padStart(2, '0')}</Text>
  </View>;
  return <Screen><FlatList data={filtered.slice((current - 1) * settings.pageSize, current * settings.pageSize)} keyExtractor={u => u.id}
    contentContainerStyle={{ padding: pagePadding(width), paddingBottom: 24, maxWidth: 1500, width: '100%', alignSelf: 'center' }}
    ListHeaderComponent={<View>
      <View style={[ui.wrap, { justifyContent: 'space-between', marginBottom: 26 }]}><View style={{ gap: 8 }}><Text style={[ui.label, { fontSize: 11, letterSpacing: 2, color: colors.primary }]}>DIRECTORIO DE PERSONAS</Text><Text style={ui.title}>Gestión de empleados</Text><Text style={ui.muted}>Personas con credenciales. Este directorio no crea cuentas de inicio de sesión.</Text></View><Button title="Nuevo empleado" icon="add-outline" onPress={() => router.push('/usuarios/nuevo')} /></View>
      <View style={[ui.row, { alignItems: 'stretch', marginBottom: 26 }]}>{stat('Registrados', users.length, 'people-outline', colors.blue)}{stat('Empleados activos', users.filter(u => u.activo).length, 'checkmark-circle-outline', colors.primarySoft)}{stat('Sin credencial', users.filter(u => !credentials.some(c => c.employeeId === u.id)).length, 'card-outline', colors.lavender)}</View>
      <View style={[ui.card, { marginBottom: 20 }]}><View style={[ui.wrap, { justifyContent: 'space-between' }]}><View style={{ gap: 3 }}><Text style={ui.heading}>Directorio de empleados</Text><Text style={ui.muted}>{filtered.length} {filtered.length === 1 ? 'persona encontrada' : 'personas encontradas'}</Text></View><Chips options={['Recientes', 'Nombre A–Z']} selected={order} onChange={v => { setOrder(v); setPage(1); }} /></View>
        <View style={[ui.row, ui.input, { paddingVertical: 0 }]}><Icon name="search-outline" /><TextInput accessibilityLabel="Buscar empleados" value={search} onChangeText={v => { setSearch(v); setPage(1); }} placeholder="Buscar por nombre, cédula, correo o ID" placeholderTextColor={colors.muted} style={{ flex: 1, minWidth: 0, minHeight: 48, color: colors.text, fontSize: 14 }} />{search.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={() => { setSearch(''); setPage(1); }} style={{ padding: 8 }}><Icon name="close-outline" /></Pressable>}</View>
        <View style={{ gap: 8 }}><Text style={ui.label}>Rol de acceso físico</Text><Chips options={['Todos', ...ROLES]} selected={role} onChange={v => { setRole(v as Role | 'Todos'); setPage(1); }} /></View>
        <View style={[ui.wrap, { justifyContent: 'space-between' }]}><Chips options={['Todos', 'Activos', 'Inactivos']} selected={status} onChange={v => { setStatus(v); setPage(1); }} />{(search || role !== 'Todos' || status !== 'Todos') && <Button title="Limpiar filtros" variant="secondary" icon="refresh-outline" onPress={reset} />}</View>
      </View>
      {table && <View style={[ui.row, { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.sidebar, borderTopLeftRadius: 14, borderTopRightRadius: 14, gap: 18 }]}><Text style={[ui.label, { flex: 3 }]}>PERSONA</Text><Text style={[ui.label, { flex: 2 }]}>DEPARTAMENTO / ROL</Text><Text style={[ui.label, { flex: 1 }]}>TARJETAS</Text><Text style={[ui.label, { flex: 1 }]}>ESTADO</Text><Text style={[ui.label, { width: 65 }]}>PERFIL</Text></View>}
    </View>}
    renderItem={({ item, index }) => {
      const count = credentials.filter(c => c.employeeId === item.id).length;
      const fullName = `${item.nombre} ${item.apellido}`;
      return <Pressable accessibilityRole="button" accessibilityLabel={`Ver perfil de ${fullName}`} onPress={() => router.push(`/usuarios/${item.id}`)} style={({ pressed }) => [{ padding: table ? 20 : 18, marginBottom: table ? 0 : 10, borderRadius: table ? 0 : 16, borderBottomWidth: 1, borderColor: colors.line, backgroundColor: pressed ? colors.primarySoft : colors.surface }]}>
        <View style={[table ? ui.row : { gap: 14 }, { gap: table ? 18 : 14 }]}><View style={[ui.row, { flex: table ? 3 : undefined }]}><Avatar name={fullName} index={index} /><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{fullName}</Text><Text style={{ fontSize: 12, color: colors.muted }}>{item.id} · CI {item.cedula}</Text></View>{!table && <Icon name="chevron-forward-outline" />}</View>
          <View style={{ flex: table ? 2 : undefined, gap: 4 }}><Text style={{ fontSize: 14, color: colors.text }}>{item.departamento}</Text><Text style={{ fontSize: 12, color: colors.muted }}>{item.roles.join(' · ')}</Text></View>
          {table ? <><Text style={{ flex: 1, fontSize: 14, color: colors.muted }}>{count} {count === 1 ? 'tarjeta' : 'tarjetas'}</Text><View style={{ flex: 1 }}><Badge active={item.activo} /></View><View style={{ width: 65, alignItems: 'center' }}><Icon name="arrow-forward-outline" /></View></> : <View style={[ui.row, { justifyContent: 'space-between' }]}><Badge active={item.activo} /><Text style={ui.muted}>{count} {count === 1 ? 'tarjeta' : 'tarjetas'} · {formatDate(item.createdAt)}</Text></View>}
        </View>
      </Pressable>;
    }}
    ListEmptyComponent={<View style={ui.card}><Empty title="No encontramos empleados" description="Probá con otro nombre o quitá los filtros para ver el directorio completo." action={<Button title="Limpiar filtros" variant="secondary" onPress={reset} />} /></View>}
    ListFooterComponent={<View style={{ gap: 20, marginTop: 20 }}><View style={[ui.wrap, { justifyContent: 'space-between' }]}><Text style={ui.muted}>Página {current} de {pages} · {filtered.length} registros</Text><View style={ui.row}><Button title="Anterior" variant="secondary" disabled={current === 1} onPress={() => setPage(current - 1)} /><Button title="Siguiente" variant="secondary" disabled={current === pages} onPress={() => setPage(current + 1)} /></View></View><Text style={{ fontSize: 12, color: colors.muted }}>Datos de demostración · Los cambios se conservan durante esta sesión.</Text></View>}
  /></Screen>;
}
