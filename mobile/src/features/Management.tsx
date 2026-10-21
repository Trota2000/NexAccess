import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useDemo } from "../stores/demo";
import { can, credentialStatus, dateTime } from "../utils/domain";
import { AccessPermission } from "../types";
import {
  Card,
  Choice,
  ConfirmDialog,
  DateRangePicker,
  Detail,
  EmptyState,
  FormInput,
  NavRow,
  PrimaryButton,
  ScreenContainer,
  SearchInput,
  Sheet,
  StatCard,
} from "../components/ui";
import {
  AccessEventCard,
  DeviceCard,
  EmployeeCard,
  CredentialCard,
} from "../components/cards";
import { s } from "../theme";
import EmployeeEditor from "./EmployeeEditor";
type Collection =
  | "employees"
  | "users"
  | "accessRoles"
  | "areas"
  | "devices"
  | "credentials"
  | "permissions"
  | "audit";
const names: Record<Collection, string> = {
  employees: "Empleados",
  users: "Usuarios del sistema",
  accessRoles: "Roles de acceso físico",
  areas: "Áreas",
  devices: "Dispositivos",
  credentials: "Credenciales",
  permissions: "Permisos de acceso",
  audit: "Auditoría",
};
export function WorkPanel({ scope }: { scope: "security" | "hr" | "admin" }) {
  const { data } = useDemo();
  const links: Collection[] =
    scope === "security"
      ? ["areas", "devices", "credentials", "permissions", "accessRoles"]
      : scope === "hr"
        ? ["employees"]
        : [
            "users",
            "employees",
            "accessRoles",
            "areas",
            "credentials",
            "devices",
            "permissions",
            "audit",
          ];
  return (
    <ScreenContainer
      title={
        scope === "security"
          ? "Seguridad"
          : scope === "hr"
            ? "Recursos Humanos"
            : "Administración"
      }
      back
    >
      <Text style={s.title}>
        {scope === "hr"
          ? "Cada jornada cuenta."
          : scope === "security"
            ? "Un vistazo al entorno."
            : "Gestión a mano."}
      </Text>
      <Text style={s.muted}>Entorno de demostración · cambios locales</Text>
      <View style={s.wrap}>
        {scope === "hr" ? (
          <>
            <StatCard label="Empleados" value={data.employees.length} />
            <StatCard
              label="Entradas registradas"
              value={data.attendance.filter((m) => m.type === "ENTRADA").length}
            />
            <StatCard
              label="Salidas registradas"
              value={data.attendance.filter((m) => m.type === "SALIDA").length}
            />
          </>
        ) : (
          <>
            <StatCard label="Accesos registrados" value={data.events.length} />
            <StatCard
              label="Rechazados"
              value={data.events.filter((e) => e.result === "RECHAZADO").length}
            />
            <StatCard
              label="Áreas activas"
              value={data.areas.filter((a) => a.active).length}
            />
            <StatCard
              label="Lectores activos"
              value={data.devices.filter((d) => d.active).length}
            />
          </>
        )}
      </View>
      {scope === "hr" || scope === "admin" ? (
        <NavRow
          title="Asistencia general"
          subtitle="Consultar y simular correcciones"
          onPress={() => router.push("/hr/attendance")}
        />
      ) : null}
      {scope !== "hr" && (
        <NavRow
          title="Historial de accesos"
          onPress={() => router.push("/security/events")}
        />
      )}
      {links.map((resource) => (
        <NavRow
          key={resource}
          title={names[resource]}
          onPress={() =>
            router.push({
              pathname: "/manage/[resource]",
              params: { resource },
            })
          }
        />
      ))}
      {scope !== "hr" && (
        <>
          <Text style={s.h}>Alertas de dispositivos</Text>
          {data.devices
            .filter((d) => !d.active)
            .map((d) => (
              <DeviceCard key={d.id} device={d} />
            ))}
          <Text style={s.h}>Accesos recientes</Text>
          {[...data.events]
            .sort((a, b) => b.at.localeCompare(a.at))
            .slice(0, 3)
            .map((e) => (
              <AccessEventCard key={e.id} event={e} />
            ))}
        </>
      )}
    </ScreenContainer>
  );
}
export function PermissionEditor({
  value,
  onClose,
}: {
  value?: AccessPermission;
  onClose: () => void;
}) {
  const { data, savePermission } = useDemo();
  const [role, setRole] = useState(
    value?.accessRoleId || data.accessRoles[0].id,
  );
  const [area, setArea] = useState(value?.areaId || data.areas[0].id);
  const [start, setStart] = useState(value?.start || "08:00");
  const [end, setEnd] = useState(value?.end || "17:00");
  const [days, setDays] = useState(value?.days || [1, 2, 3, 4, 5]);
  const [active, setActive] = useState(value?.active !== false);
  const [error, setError] = useState("");
  return (
    <Sheet
      title={value ? "Editar permiso" : "Nuevo permiso"}
      visible
      onClose={onClose}
    >
      <Text style={s.muted}>
        Permiso de acceso físico por rol. No cambia el rol administrativo de
        ningún usuario.
      </Text>
      <Choice
        label="Rol físico"
        value={role}
        options={data.accessRoles.map((r) => ({ value: r.id, label: r.name }))}
        onChange={setRole}
      />
      <Choice
        label="Área"
        value={area}
        options={data.areas.map((a) => ({ value: a.id, label: a.name }))}
        onChange={setArea}
      />
      <Text style={s.label}>Días permitidos</Text>
      <View style={s.wrap}>
        {["D", "L", "M", "X", "J", "V", "S"].map((label, i) => (
          <PrimaryButton
            key={i}
            title={label}
            secondary={!days.includes(i)}
            onPress={() =>
              setDays(
                days.includes(i) ? days.filter((d) => d !== i) : [...days, i],
              )
            }
          />
        ))}
      </View>
      <FormInput
        label="Hora de inicio (HH:mm)"
        value={start}
        onChangeText={setStart}
      />
      <FormInput label="Hora final (HH:mm)" value={end} onChangeText={setEnd} />
      <Choice
        label="Estado"
        value={active ? "yes" : "no"}
        options={[
          { value: "yes", label: "Activo" },
          { value: "no", label: "Inactivo" },
        ]}
        onChange={(v) => setActive(v === "yes")}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <PrimaryButton
        title="Guardar simulación"
        onPress={() => {
          const e = savePermission({
            id: value?.id || `p${Date.now()}`,
            accessRoleId: role,
            areaId: area,
            start,
            end,
            days,
            active,
          });
          if (e) setError(e);
          else onClose();
        }}
      />
    </Sheet>
  );
}
export function managementAllowed(
  role: Parameters<typeof can>[0],
  resource: string,
) {
  return resource === "users" || resource === "audit"
    ? can(role, "admin")
    : resource === "employees"
      ? can(role, "hr") || can(role, "security")
      : ["areas", "accessRoles"].includes(resource)
        ? can(role, "hr") || can(role, "security")
        : ["devices", "credentials", "permissions"].includes(resource)
          ? can(role, "security")
          : false;
}
export default function Management({ resource }: { resource: string }) {
  const { data, user, toggle } = useDemo();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [action, setAction] = useState("all");
  const [confirm, setConfirm] = useState<string>();
  const [message, setMessage] = useState("");
  const [employeeEditor, setEmployeeEditor] = useState<string>();
  const [editing, setEditing] = useState<AccessPermission | "new">();
  if (!managementAllowed(user?.role, resource))
    return (
      <ScreenContainer title="Acceso restringido" back>
        <Text style={s.text}>Tu perfil no tiene acceso a este módulo.</Text>
      </ScreenContainer>
    );
  const r = resource as Collection;
  const editAllowed =
    r === "users"
      ? can(user?.role, "admin")
      : r === "employees"
        ? can(user?.role, "hr")
        : can(user?.role, "security");
  const items = data[r]
    .filter((item) =>
      JSON.stringify(item).toLowerCase().includes(query.toLowerCase()),
    )
    .filter(
      (item) =>
        state === "all" ||
        (r === "credentials"
          ? credentialStatus(item as (typeof data.credentials)[number]) ===
            state
          : "active" in item
            ? item.active === (state === "active")
            : true),
    )
    .filter(
      (item) =>
        r !== "permissions" ||
        ((roleFilter === "all" ||
          (item as AccessPermission).accessRoleId === roleFilter) &&
          (areaFilter === "all" ||
            (item as AccessPermission).areaId === areaFilter)),
    )
    .filter(
      (item) =>
        r !== "audit" ||
        ("at" in item &&
          (!from || String(item.at).slice(0, 10) >= from) &&
          (!to || String(item.at).slice(0, 10) <= to) &&
          (action === "all" || ("action" in item && item.action === action))),
    );
  return (
    <ScreenContainer title={names[r]} back>
      <SearchInput value={query} onChangeText={setQuery} />
      {r === "employees" && editAllowed && (
        <PrimaryButton
          title="Nuevo empleado"
          onPress={() => setEmployeeEditor("new")}
        />
      )}
      {r !== "audit" && (
        <Choice
          label="Estado"
          value={state}
          onChange={setState}
          options={[
            { value: "all", label: "Todos" },
            ...(r === "credentials"
              ? ["ACTIVA", "INACTIVA", "VENCIDA", "REVOCADA"].map((value) => ({
                  value,
                  label: value,
                }))
              : [
                  { value: "active", label: "Activos" },
                  { value: "inactive", label: "Inactivos" },
                ]),
          ]}
        />
      )}
      {r === "permissions" && (
        <>
          <Choice
            label="Rol físico"
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: "all", label: "Todos" },
              ...data.accessRoles.map((x) => ({ value: x.id, label: x.name })),
            ]}
          />
          <Choice
            label="Área"
            value={areaFilter}
            onChange={setAreaFilter}
            options={[
              { value: "all", label: "Todas" },
              ...data.areas.map((x) => ({ value: x.id, label: x.name })),
            ]}
          />
          <PrimaryButton
            title="Crear permiso"
            onPress={() => setEditing("new")}
          />
        </>
      )}
      {r === "audit" && (
        <>
          <DateRangePicker from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <Choice
            label="Acción"
            value={action}
            onChange={setAction}
            options={[
              { value: "all", label: "Todas" },
              ...Array.from(new Set(data.audit.map((a) => a.action))).map(
                (value) => ({ value, label: value }),
              ),
            ]}
          />
          <Text style={s.muted}>
            Registro de solo lectura. Las acciones nuevas de la demo aparecen
            como SIMULADO.
          </Text>
        </>
      )}
      {!!message && (
        <Text accessibilityRole="alert" style={s.text}>
          {message}
        </Text>
      )}
      <Text style={s.muted}>{items.length} registros</Text>
      {items.map((item) => (
        <Card key={item.id}>
          {r === "employees" && (
            <>
              <EmployeeCard
                employee={item as (typeof data.employees)[number]}
              />
              {editAllowed && (
                <PrimaryButton
                  title="Editar empleado"
                  secondary
                  onPress={() => setEmployeeEditor(item.id)}
                />
              )}
            </>
          )}
          {r === "devices" && (
            <DeviceCard device={item as (typeof data.devices)[number]} />
          )}
          {r === "credentials" && (
            <>
              <CredentialCard
                credential={item as (typeof data.credentials)[number]}
              />
              <Detail
                title="Detalles de credencial"
                lines={[
                  ["Tipo", (item as (typeof data.credentials)[number]).type],
                  [
                    "Estado",
                    credentialStatus(item as (typeof data.credentials)[number]),
                  ],
                  [
                    "Identificador enmascarado",
                    (item as (typeof data.credentials)[number]).maskedCode,
                  ],
                ]}
              />
            </>
          )}
          {r === "areas" &&
            (() => {
              const a = item as (typeof data.areas)[number];
              return (
                <Detail
                  title={a.name}
                  lines={[
                    ["Código", a.code],
                    ["Estado", a.active ? "ACTIVA" : "INACTIVA"],
                    ["Restringida", a.restricted ? "Sí" : "No"],
                    ["Descripción", a.description],
                  ]}
                />
              );
            })()}
          {r === "accessRoles" &&
            (() => {
              const x = item as (typeof data.accessRoles)[number];
              return (
                <Detail
                  title={x.name}
                  lines={[
                    ["Código", x.code],
                    ["Estado", x.active ? "ACTIVO" : "INACTIVO"],
                    [
                      "Tipo",
                      "Rol de acceso físico. No otorga privilegios del sistema.",
                    ],
                  ]}
                />
              );
            })()}
          {r === "users" &&
            (() => {
              const x = item as (typeof data.users)[number];
              return (
                <Detail
                  title={x.username}
                  lines={[
                    ["Rol del sistema", x.role],
                    ["Estado", x.active ? "ACTIVO" : "INACTIVO"],
                    [
                      "Empleado vinculado",
                      data.employees.find((e) => e.id === x.employeeId)?.name ||
                        x.employeeId,
                    ],
                  ]}
                />
              );
            })()}
          {r === "permissions" &&
            (() => {
              const x = item as AccessPermission;
              return (
                <>
                  <Detail
                    title={`${data.accessRoles.find((t) => t.id === x.accessRoleId)?.name} · ${data.areas.find((a) => a.id === x.areaId)?.name}`}
                    lines={[
                      ["Horario", `${x.start} a ${x.end}`],
                      [
                        "Días",
                        x.days
                          .map(
                            (d) =>
                              ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][
                                d
                              ],
                          )
                          .join(", "),
                      ],
                      ["Estado", x.active ? "ACTIVO" : "INACTIVO"],
                    ]}
                  />
                  <PrimaryButton
                    title="Editar permiso"
                    secondary
                    onPress={() => setEditing(x)}
                  />
                </>
              );
            })()}
          {r === "audit" &&
            (() => {
              const x = item as (typeof data.audit)[number];
              return (
                <Detail
                  title={`${x.action} · ${x.resource}`}
                  lines={[
                    ["Fecha y hora", dateTime(x.at)],
                    ["Usuario responsable", x.actor],
                    ["Acción", x.action],
                    ["Recurso", x.resource],
                    ["Resultado", x.result],
                    ["Detalle", x.detail],
                  ]}
                />
              );
            })()}
          {r !== "audit" && r !== "permissions" && editAllowed && (
            <PrimaryButton
              title="Cambiar estado (demo)"
              secondary
              onPress={() => setConfirm(item.id)}
            />
          )}
        </Card>
      ))}
      {!items.length && <EmptyState />}
      <ConfirmDialog
        title="Cambiar estado"
        visible={!!confirm}
        description="Se activará o desactivará este registro solo en los datos locales. La acción quedará en la auditoría de demostración."
        onCancel={() => setConfirm(undefined)}
        onConfirm={() => {
          if (confirm) {
            const error = toggle(r as "employees", confirm);
            setMessage(error || "Estado actualizado solo en este dispositivo.");
          }
          setConfirm(undefined);
        }}
      />
      {employeeEditor && (
        <EmployeeEditor
          employee={data.employees.find((e) => e.id === employeeEditor)}
          onClose={() => setEmployeeEditor(undefined)}
        />
      )}
      {editing && (
        <PermissionEditor
          value={editing === "new" ? undefined : editing}
          onClose={() => {
            setEditing(undefined);
            setMessage(
              "Formulario cerrado. Los cambios confirmados se guardan solo en este dispositivo.",
            );
          }}
        />
      )}
      <Text style={s.muted}>Prototipo móvil. Sin conexión al servidor.</Text>
    </ScreenContainer>
  );
}
