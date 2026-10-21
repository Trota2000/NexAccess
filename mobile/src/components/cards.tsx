import { Text, View } from "react-native";
import { CreditCard, ShieldCheck } from "lucide-react-native";
import { useDemo } from "../stores/demo";
import {
  AccessEvent,
  AttendanceRecord,
  Credential,
  AppNotification,
  Employee,
  Device,
} from "../types";
import { credentialStatus, dateTime, reasonLabels } from "../utils/domain";
import { Card, Detail, PrimaryButton, StatusBadge } from "./ui";
import { s, tokens } from "../theme";
export function CredentialCard({ credential }: { credential: Credential }) {
  const e = useDemo((x) =>
    x.data.employees.find((e) => e.id === credential.employeeId),
  );
  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: tokens.color.soft,
          padding: 24,
          minHeight: 240,
          justifyContent: "space-between",
        },
      ]}
    >
      <View style={s.row}>
        <ShieldCheck color={tokens.color.primary} />
        <Text style={[s.h, { flex: 1 }]}>NexAccess · Institución demo</Text>
        <CreditCard color={tokens.color.primary} />
      </View>
      <View style={{ gap: 6 }}>
        <View accessibilityLabel={`Avatar de ${e?.name}`} style={{width:48,height:48,borderRadius:24,backgroundColor:tokens.color.surface,alignItems:'center',justifyContent:'center'}}><Text style={s.h}>{e?.name.split(' ').map(p=>p[0]).slice(0,2).join('')}</Text></View>
        <Text style={s.title}>{e?.name}</Text>
        <Text style={s.text}>
          {e?.id.toUpperCase()} · {e?.department || "Sin sector"}
        </Text>
      </View>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={s.muted}>
          {credential.type} · {credential.maskedCode}
        </Text>
        <StatusBadge value={credentialStatus(credential)} />
      </View>
      <Text style={s.muted}>
        Vence:{" "}
        {credential.expiresAt
          ? dateTime(credential.expiresAt)
          : "Sin vencimiento"}
      </Text>
    </View>
  );
}
export function AccessEventCard({ event }: { event: AccessEvent }) {
  const d = useDemo((s) => s.data);
  return (
    <Detail
      title={`${event.result === "AUTORIZADO" ? "Acceso autorizado" : "Acceso rechazado"} · ${d.areas.find((a) => a.id === event.areaId)?.name}`}
      lines={[
        ["Fecha y hora", dateTime(event.at)],
        [
          "Empleado",
          d.employees.find((e) => e.id === event.employeeId)?.name ||
            event.employeeId,
        ],
        [
          "Área",
          d.areas.find((a) => a.id === event.areaId)?.name || event.areaId,
        ],
        [
          "Lector",
          d.devices.find((x) => x.id === event.deviceId)?.name ||
            event.deviceId,
        ],
        ["Evento", event.type],
        ["Resultado", event.result],
        ["Motivo", reasonLabels[event.reason] || event.reason],
        [
          "Credencial",
          d.credentials.find((c) => c.id === event.credentialId)?.maskedCode ||
            "Enmascarada",
        ],
        ["Registro", event.id],
      ]}
    />
  );
}
export function AttendanceCard({ record }: { record: AttendanceRecord }) {
  const d = useDemo((s) => s.data);
  return (
    <Detail
      title={`${record.type === "ENTRADA" ? "Entrada" : "Salida"} · ${dateTime(record.at)}`}
      lines={[
        [
          "Empleado",
          d.employees.find((e) => e.id === record.employeeId)?.name ||
            record.employeeId,
        ],
        ["Fecha y hora", dateTime(record.at)],
        ["Tipo", record.type],
        [
          "Dispositivo",
          d.devices.find((x) => x.id === record.deviceId)?.name ||
            "No aplica (manual)",
        ],
        ["Origen", record.source],
        ["Observación", record.note || "Sin observaciones"],
        ["Registro", record.id],
      ]}
    />
  );
}
export function NotificationCard({
  notification: n,
}: {
  notification: AppNotification;
}) {
  const user = useDemo((s) => s.user)!;
  const mark = useDemo((s) => s.markRead);
  const read = n.readBy.includes(user.id);
  return (
    <Card>
      <StatusBadge value={read ? "LEÍDA" : "PENDIENTE"} />
      <Detail
        title={n.title}
        lines={[
          ["Fecha y hora", dateTime(n.at)],
          ["Descripción", n.description],
          ["Tipo", n.type],
          ["Lectura", read ? "Leída" : "Pendiente"],
        ]}
      />
      {!read && (
        <PrimaryButton
          title="Marcar como leída"
          secondary
          onPress={() => mark([n.id])}
        />
      )}
    </Card>
  );
}
export function EmployeeCard({ employee: e }: { employee: Employee }) {
  return (
    <Detail
      title={e.name}
      lines={[
        ["Identificador", e.id.toUpperCase()],
        ["Estado", e.active ? "ACTIVO" : "INACTIVO"],
        ["Documento", e.document],
        ["Correo", e.email],
        ["Teléfono", e.phone || "No informado"],
        ["Sector (demo)", e.department || "No informado"],
      ]}
    />
  );
}
export function DeviceCard({ device: d }: { device: Device }) {
  const area = useDemo((s) => s.data.areas.find((a) => a.id === d.areaId));
  return (
    <Detail
      title={d.name}
      lines={[
        ["Estado", d.active ? "ACTIVO" : "INACTIVO"],
        ["Código", d.code],
        ["Tipo", d.type],
        ["Área", area?.name || d.areaId],
        ["Última conexión", dateTime(d.lastSeen)],
      ]}
    />
  );
}
