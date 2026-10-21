import { useState } from "react";
import { Text, View, Switch, Pressable } from "react-native";
import { router } from "expo-router";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { useDemo } from "../stores/demo";
import { roleNames, today } from "../data/mocks";
import { can, credentialStatus, dateKey, dateTime } from "../utils/domain";
import { SystemRole } from "../types";
import {
  Card,
  Choice,
  ConfirmDialog,
  EmptyState,
  NavRow,
  PrimaryButton,
  ScreenContainer,
  Sheet,
  StatCard,
  StatusBadge,
} from "../components/ui";
import {
  AccessEventCard,
  CredentialCard,
  NotificationCard,
} from "../components/cards";
import { s, tokens } from "../theme";
export function Home() {
  const { data, user, storageError } = useDemo();
  if (!user) return null;
  const employee = data.employees.find((e) => e.id === user.employeeId)!;
  const credential = data.credentials.find(
    (c) => c.employeeId === employee.id && c.type === "DIGITAL",
  )!;
  const events = data.events
    .filter((e) => e.employeeId === employee.id)
    .sort((a, b) => b.at.localeCompare(a.at));
  const marks = data.attendance
    .filter((a) => a.employeeId === employee.id)
    .sort((a, b) => b.at.localeCompare(a.at));
  const unread = data.notifications.filter(
    (n) =>
      (n.employeeId === employee.id || n.roles?.includes(user.role)) &&
      !n.readBy.includes(user.id),
  ).length;
  const daily = marks.filter((m) => dateKey(m.at) === today());
  return (
    <ScreenContainer title="Inicio">
      {!!storageError&&<Text accessibilityRole="alert" style={s.error}>{storageError}</Text>}
      <Text style={s.muted}>
        {format(new Date(), "EEEE d MMMM", { locale: es })} · DEMO
      </Text>
      <Text style={s.title}>Hola, {employee.name.split(" ")[0]}.</Text>
      <Text style={s.text}>
        {employee.name} · {roleNames[user.role]}
      </Text>
      <CredentialCard credential={credential} />
      <View style={s.wrap}>
        <StatCard label="Marcaciones hoy" value={daily.length} />
        <StatCard label="Por leer" value={unread} />
      </View>
      <Card>
        <Text style={s.h}>Tu última actividad</Text>
        <Text style={s.text}>Credencial: {credentialStatus(credential)}</Text>
        <Text style={s.text}>
          Último acceso: {events[0] ? dateTime(events[0].at) : "Sin registros"}
        </Text>
        <Text style={s.text}>
          Última entrada:{" "}
          {marks.find((m) => m.type === "ENTRADA")
            ? dateTime(marks.find((m) => m.type === "ENTRADA")!.at)
            : "Sin registros"}
        </Text>
        <Text style={s.text}>
          Última salida:{" "}
          {marks.find((m) => m.type === "SALIDA")
            ? dateTime(marks.find((m) => m.type === "SALIDA")!.at)
            : "Sin registros"}
        </Text>
      </Card>
      <Text style={s.h}>A un toque</Text>
      <NavRow
        title="Mi credencial"
        onPress={() => router.push("/credential")}
      />
      <NavRow title="Mis accesos" onPress={() => router.push("/activity")} />
      <NavRow
        title="Mi asistencia"
        onPress={() => router.push("/attendance")}
      />
      <NavRow
        title="Notificaciones"
        subtitle={`${unread} pendientes`}
        onPress={() => router.push("/notifications")}
      />
      {user.role !== "EMPLEADO" && (
        <NavRow
          title="Herramientas de trabajo"
          subtitle={roleNames[user.role]}
          onPress={() => router.push("/tools")}
        />
      )}
      <Text style={s.h}>Accesos recientes</Text>
      {events.slice(0, 2).map((e) => (
        <AccessEventCard key={e.id} event={e} />
      ))}
      {!events.length && <EmptyState />}
      <Text style={s.muted}>
        Datos ficticios. Las consultas personales son una propuesta móvil,
        pendiente de API.
      </Text>
    </ScreenContainer>
  );
}
export function Credentials() {
  const { data, user } = useDemo();
  if (!user) return null;
  const credentials = data.credentials.filter(
    (c) => c.employeeId === user.employeeId,
  );
  return (
    <ScreenContainer title="Mi credencial">
      {credentials.map((c) => (
        <View key={c.id} style={{ gap: 12 }}>
          <CredentialCard credential={c} />
          <NavRow
            title="Consultar detalles"
            subtitle={`${c.name} · ${credentialStatus(c)}`}
            onPress={() =>
              router.push({
                pathname: "/credential-detail",
                params: { id: c.id },
              })
            }
          />
        </View>
      ))}
      <Card>
        <Text style={s.h}>Representación visual</Text>
        <Text style={s.text}>
          La compatibilidad con lectores NFC requiere una integración futura.
          Esta pantalla no emula tarjetas ni abre puertas.
        </Text>
      </Card>
    </ScreenContainer>
  );
}
export function Notifications() {
  const { data, user, markRead } = useDemo();
  const [filter, setFilter] = useState("all");
  if (!user) return null;
  const relevant = data.notifications.filter(
    (n) => n.employeeId === user.employeeId || n.roles?.includes(user.role),
  );
  const items = relevant
    .filter(
      (n) =>
        filter === "all" ||
        (filter === "unread" ? !n.readBy.includes(user.id) : n.type === filter),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  return (
    <ScreenContainer title="Notificaciones">
      <Choice
        label="Mostrar"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Todas" },
          { value: "unread", label: "Sin leer" },
          ...["CREDENCIAL", "ACCESO", "PERMISO", "AVISO", "DISPOSITIVO"].map(
            (value) => ({ value, label: value }),
          ),
        ]}
      />
      <PrimaryButton
        title="Marcar todas como leídas"
        secondary
        onPress={() => markRead(relevant.map((n) => n.id))}
      />
      {items.map((n) => (
        <NotificationCard key={n.id} notification={n} />
      ))}
      {!items.length && (
        <EmptyState message="No tenés notificaciones en esta categoría." />
      )}
    </ScreenContainer>
  );
}
export function Profile() {
  const { data, user, logout, switchRole, compact, setCompact, reset } =
    useDemo();
  const [confirm, setConfirm] = useState<"logout" | "reset" | undefined>();
  const [about, setAbout] = useState(false);
  if (!user) return null;
  const e = data.employees.find((e) => e.id === user.employeeId)!;
  return (
    <ScreenContainer title="Mi perfil">
      <Text style={s.title}>{e.name}</Text>
      <StatusBadge value={user.active ? "CUENTA ACTIVA" : "CUENTA INACTIVA"} />
      <Card>
        {[
          ["Identificador", e.id.toUpperCase()],
          ["Documento", e.document],
          ["Correo", e.email],
          ["Teléfono", e.phone || "No informado"],
          ["Rol del sistema", roleNames[user.role]],
          [
            "Roles físicos",
            e.accessRoleIds
              .map((id) => data.accessRoles.find((r) => r.id === id)?.name)
              .join(", "),
          ],
        ].map(([k, v]) => (
          <View key={k}>
            <Text style={s.label}>{k}</Text>
            <Text style={s.text}>{v}</Text>
          </View>
        ))}
      </Card>
      <NavRow
        title="Credenciales asociadas"
        subtitle={`${data.credentials.filter((c) => c.employeeId === e.id).length} credenciales`}
        onPress={() => router.push("/credential")}
      />
      <Card>
        <Text style={s.h}>Preferencias de demostración</Text>
        <View style={s.row}>
          <Text style={[s.text, { flex: 1 }]}>Listas compactas</Text>
          <Switch
            accessibilityLabel="Listas compactas"
            value={compact}
            onValueChange={setCompact}
          />
        </View>
        <Text style={s.muted}>
          Se guardan en este dispositivo, junto con los cambios ficticios. La
          sesión y la contraseña no se guardan.
        </Text>
      </Card>
      <Choice
        label="Cambiar perfil de demostración"
        value={user.role}
        options={Object.entries(roleNames).map(([value, label]) => ({
          value,
          label,
        }))}
        onChange={(v) => {
          switchRole(v as SystemRole);
          router.replace("/");
        }}
      />
      <NavRow title="Acerca de NexAccess" onPress={() => setAbout(true)} />
      <PrimaryButton
        title="Cerrar sesión"
        onPress={() => setConfirm("logout")}
      />
      <PrimaryButton
        title="Restablecer datos de demostración"
        secondary
        onPress={() => setConfirm("reset")}
      />
      <ConfirmDialog
        title={confirm === "reset" ? "Restablecer demo" : "Cerrar sesión"}
        visible={!!confirm}
        description={
          confirm === "reset"
            ? "Se borrarán los cambios locales de esta demo y se cerrará la sesión."
            : "Los datos ficticios quedarán guardados en este dispositivo."
        }
        onCancel={() => setConfirm(undefined)}
        onConfirm={() => {
          if (confirm === "reset") {
            reset();
          } else {
            logout();
          }
          setConfirm(undefined);
        }}
      />
      <Sheet
        title="Acerca de NexAccess"
        visible={about}
        onClose={() => setAbout(false)}
      >
        <Text style={s.text}>
          NexAccess Mobile 1.0 · Prototipo independiente de control de accesos y
          consulta de marcaciones.
        </Text>
        <Text style={s.muted}>
          Sin conexión al servidor, JWT, NFC ni notificaciones push. No se
          calculan salarios ni cumplimiento de horarios.
        </Text>
      </Sheet>
    </ScreenContainer>
  );
}
export function Tools() {
  const role = useDemo((s) => s.user?.role);
  return (
    <ScreenContainer title="Herramientas" back>
      <Text style={s.title}>Tu espacio de trabajo</Text>
      {can(role, "security") && (
        <NavRow
          title="Seguridad"
          subtitle="Accesos, áreas, lectores y credenciales"
          onPress={() => router.push("/security")}
        />
      )}
      {can(role, "hr") && (
        <NavRow
          title="Recursos Humanos"
          subtitle="Empleados y marcaciones"
          onPress={() => router.push("/hr")}
        />
      )}
      {can(role, "admin") && (
        <NavRow
          title="Administración"
          subtitle="Usuarios, roles, permisos y auditoría"
          onPress={() => router.push("/admin")}
        />
      )}
      <Text style={s.muted}>
        Las acciones modifican solamente datos locales. Las restricciones de
        esta demo deberán validarse en el servidor al integrar.
      </Text>
    </ScreenContainer>
  );
}
export function Calendar({
  records,
  onSelect,
}: {
  records: { at: string }[];
  onSelect: (v: string) => void;
}) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const days = eachDayOfInterval({ start: month, end: endOfMonth(month) });
  const offset = (getDay(month) + 6) % 7;
  return (
    <Card>
      <View style={s.row}>
        <PrimaryButton
          title="‹"
          secondary
          onPress={() => setMonth(addMonths(month, -1))}
        />
        <Text style={[s.h, { flex: 1, textAlign: "center" }]}>
          {format(month, "MMMM yyyy", { locale: es })}
        </Text>
        <PrimaryButton
          title="›"
          secondary
          onPress={() => setMonth(addMonths(month, 1))}
        />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
          <Text
            key={i}
            style={[
              s.muted,
              { width: "14.28%", textAlign: "center", padding: 5 },
            ]}
          >
            {d}
          </Text>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <View key={`b${i}`} style={{ width: "14.28%" }} />
        ))}
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const count = records.filter((r) => dateKey(r.at) === key).length;
          return (
            <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${format(d,'d MMMM',{locale:es})}, ${count} marcaciones`} style={{ width: "14.28%", minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:count?tokens.color.soft:tokens.color.surface }}
                onPress={() => onSelect(key)}
              ><Text style={s.text}>{format(d,'d')}</Text><Text style={{color:tokens.color.primary,fontSize:10}}>{count?'•':' '}</Text></Pressable>
          );
        })}
      </View>
      <Text style={s.muted}>
        • Día con marcaciones. Tocá una fecha para filtrar.
      </Text>
    </Card>
  );
}
