import { Colors, spacing, useDesign } from "./Theme";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiClient, Row, Session } from "./client";
import {
  RefreshCw,
  ChevronRight,
  SlidersHorizontal,
  Check,
  LucideIcon,
} from "lucide-react-native";
import CalendarField from "./CalendarField";
import CompanySettings from "./CompanySettings";
import BusyOverlay from "./BusyOverlay";
import MetricChart from "./MetricChart";
import { calendarInstant, localParts } from "./dates";
import { display, pageOf, resource } from "./resources";
import { loadMetrics, Metric, RelatedFlow } from "./workflows";
export const extraModules = [
  { key: "dashboard", title: "Dashboard" },
  { key: "reportes", title: "Reportes" },
  { key: "alertas", title: "Alertas" },
  { key: "configuracion", title: "Configuración" },
];
function Action({
  title,
  onPress,
  compact = false,
  icon,
  expanded,
}: {
  title: string;
  onPress: () => void;
  compact?: boolean;
  icon?: LucideIcon;
  expanded?: boolean;
}) {
  const { color, styles: s } = useDesign(makeStyles);

  const Icon = icon ?? (/actualizar/i.test(title) ? RefreshCw : ChevronRight);
  return (
    <Pressable
      accessibilityRole="button"
      aria-expanded={expanded}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      onPress={onPress}
      style={[s.button, compact && s.compactButton]}
    >
      <Icon size={17} color={color.primary} />
      <Text style={s.action}>{title}</Text>
    </Pressable>
  );
}
function Dashboard({
  client,
  session,
  onOpen,
}: {
  client: ApiClient;
  session: Session;
  onOpen: (f: RelatedFlow) => void;
}) {
  const { styles: s } = useDesign(makeStyles);

  const [metrics, setMetrics] = useState<Metric[]>();
  const [revision, setRevision] = useState(0);
  const [range, setRange] = useState<Row>();
  const [from, setFrom] = useState(() =>
    calendarInstant(
      localParts(new Date(Date.now() - 86400000).toISOString()).day,
      "from",
    ),
  );
  const [to, setTo] = useState(() => calendarInstant(localParts().day, "to"));
  const [rangeError, setRangeError] = useState("");
  const [showPeriod, setShowPeriod] = useState(false);
  useEffect(() => {
    let current = true;
    loadMetrics(client, session.user.role, new Date(), range).then((result) => {
      if (current) setMetrics(result);
    });
    return () => {
      current = false;
    };
  }, [client, session.user.role, revision, range]);
  return (
    <>
      <View style={s.dashboardToolbar}>
        <Text style={s.title}>Dashboard</Text>
        <View style={s.toolbarActions}>
          <Action
            title="Actualizar"
            compact
            onPress={() => {
              setMetrics(undefined);
              setRevision((v) => v + 1);
            }}
          />
          <Action
            title={showPeriod ? "Ocultar período" : "Período"}
            icon={SlidersHorizontal}
            compact
            expanded={showPeriod}
            onPress={() => setShowPeriod((v) => !v)}
          />
        </View>
      </View>
      {!!range && (
        <Text style={s.periodCaption}>
          Período aplicado:{" "}
          {localParts(String(range.from)).day.split("-").reverse().join("/")} –{" "}
          {localParts(String(range.to)).day.split("-").reverse().join("/")}
        </Text>
      )}
      {showPeriod && (
        <View style={s.periodPanel}>
          <View style={s.periodFields}>
            <View style={s.periodField}>
              <Text style={s.muted}>Desde</Text>
              <CalendarField
                label="Desde del dashboard"
                value={from}
                onChange={setFrom}
                edge="from"
              />
            </View>
            <View style={s.periodField}>
              <Text style={s.muted}>Hasta</Text>
              <CalendarField
                label="Hasta del dashboard"
                value={to}
                onChange={setTo}
                edge="to"
              />
            </View>
          </View>
          <Action
            title="Aplicar período"
            icon={Check}
            compact
            onPress={() => {
              if (!from || !to || Date.parse(from) > Date.parse(to)) {
                setRangeError("Seleccioná un rango de fechas válido.");
                return;
              }
              setRangeError("");
              setMetrics(undefined);
              setRange({ from, to });
              setShowPeriod(false);
            }}
          />
          {!!rangeError && (
            <Text accessibilityRole="alert" style={s.error}>
              {rangeError}
            </Text>
          )}
          <Text style={s.muted}>
            Eventos y marcaciones:{" "}
            {range ? "período seleccionado" : "últimas 24 horas"}. Los demás
            indicadores muestran su estado actual.
          </Text>
        </View>
      )}
      <BusyOverlay active={!metrics} />
      {!!metrics && (
        <MetricChart
          metrics={metrics}
          onConsult={(m) =>
            onOpen({
              title: m.label,
              key: m.key,
              query: m.query,
              label: m.label,
            })
          }
        />
      )}
      {!metrics && <View style={{ minHeight: 48 }} />}
    </>
  );
}
function Reports({
  session,
  onOpen,
}: {
  session: Session;
  onOpen: (f: RelatedFlow) => void;
}) {
  const { styles: s } = useDesign(makeStyles);

  const end = new Date(),
    query = {
      from: new Date(end.getTime() - 7 * 86400000).toISOString(),
      to: end.toISOString(),
    };
  const security = ["ADMIN", "SEGURIDAD"].includes(session.user.role),
    hr = ["ADMIN", "RRHH"].includes(session.user.role);
  return (
    <>
      <Text style={s.title}>Reportes</Text>
      <Text style={s.text}>
        Elegí el informe, revisá el rango y aplicá filtros. Los CSV se generan
        en el servidor con el mismo criterio de consulta.
      </Text>
      {security && (
        <View style={s.card}>
          <Text style={s.heading}>Control de accesos</Text>
          <Text style={s.muted}>
            Autorizados, rechazados, empleado, área y lector. Rango inicial:
            últimos 7 días.
          </Text>
          <Action
            title="Preparar reporte de accesos"
            onPress={() =>
              onOpen({
                title: "Reporte de accesos",
                key: "access-events",
                query,
                label: "Últimos 7 días",
              })
            }
          />
        </View>
      )}
      {hr && (
        <View style={s.card}>
          <Text style={s.heading}>Asistencia</Text>
          <Text style={s.muted}>
            Marcaciones de entrada/salida y resumen diario calculado por el
            backend, sin cálculos salariales.
          </Text>
          <Action
            title="Preparar reporte de asistencia"
            onPress={() =>
              onOpen({
                title: "Reporte de asistencia",
                key: "attendance",
                query,
                report: true,
                label: "Últimos 7 días",
              })
            }
          />
        </View>
      )}
      {session.user.role === "ADMIN" && (
        <View style={s.card}>
          <Text style={s.heading}>Auditoría</Text>
          <Text style={s.muted}>
            Consulta filtrada de acciones. La API actual no ofrece exportación
            de auditoría.
          </Text>
          <Action
            title="Consultar auditoría"
            onPress={() => onOpen({ title: "Auditoría", key: "audit", query })}
          />
        </View>
      )}
    </>
  );
}
function Incidents({
  client,
  onOpen,
}: {
  client: ApiClient;
  onOpen: (f: RelatedFlow) => void;
}) {
  const { color, styles: s } = useDesign(makeStyles);

  const [data, setData] = useState<{
    events: Row[];
    total: number;
    error?: string;
  }>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    const to = new Date(),
      from = new Date(to.getTime() - 86400000);
    client
      .request("/access-events", {
        query: {
          result: "RECHAZADO",
          from: from.toISOString(),
          to: to.toISOString(),
          page: 1,
          pageSize: 5,
        },
      })
      .then((v) => {
        const p = pageOf(v, resource("access-events"));
        if (current) setData({ events: p.items, total: p.totalItems });
      })
      .catch((e) => {
        if (current)
          setData({
            events: [],
            total: 0,
            error: e instanceof Error ? e.message : "No se pudo cargar.",
          });
      });
    return () => {
      current = false;
    };
  }, [client, revision]);
  return (
    <>
      <Text style={s.title}>Incidencias observadas</Text>
      <Text style={s.text}>
        Accesos rechazados en las últimas 24 horas. Esta consulta no crea
        alertas ni permite marcarlas como resueltas: esa gestión necesita un
        servicio adicional.
      </Text>
      <Action
        title="Actualizar incidencias"
        onPress={() => {
          setData(undefined);
          setRevision((v) => v + 1);
        }}
      />
      {!data ? (
        <ActivityIndicator
          accessibilityLabel="Cargando incidencias"
          color={color.primary}
        />
      ) : data.error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {data.error}
        </Text>
      ) : (
        <>
          <Text style={s.heading}>{data.total} accesos rechazados</Text>
          {!data.events.length && (
            <Text style={s.muted}>
              No se registraron rechazos en este período.
            </Text>
          )}
          {data.events.map((e) => (
            <View key={String(e.id)} style={s.card}>
              <Text style={s.heading}>
                {String(e.employeeName ?? "Credencial no identificada")}
              </Text>
              <Text style={s.text}>{display("occurredAt", e.occurredAt)}</Text>
              <Text style={s.muted}>
                {String(e.reason ?? "Sin motivo informado")} ·{" "}
                {String(e.areaName ?? "Sin área")}
              </Text>
            </View>
          ))}
          <Action
            title="Abrir historial de rechazos"
            onPress={() => {
              const to = new Date();
              onOpen({
                title: "Accesos rechazados",
                key: "access-events",
                query: {
                  result: "RECHAZADO",
                  from: new Date(to.getTime() - 86400000).toISOString(),
                  to: to.toISOString(),
                },
                label: "Rechazados · últimas 24 horas",
              });
            }}
          />
        </>
      )}
    </>
  );
}
function Settings({
  client,
  session,
}: {
  client: ApiClient;
  session: Session;
}) {
  const { color, styles: s } = useDesign(makeStyles);

  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function check() {
    if (busy) return;
    setBusy(true);
    setStatus("Comprobando…");
    try {
      const health = (await client.request("/health", {
        anonymous: true,
      })) as Row;
      const me = (await client.request("/auth/me")) as Row;
      setStatus(
        health.status === "ok" && me.isActive
          ? "Conexión y sesión verificadas."
          : "La verificación devolvió un estado inesperado.",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "No se pudo comprobar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Text style={s.title}>Configuración y sesión</Text>
      <View style={s.card}>
        <Text style={s.heading}>Tu cuenta</Text>
        <Text style={s.text}>Usuario: {session.user.username}</Text>
        <Text style={s.text}>Perfil del sistema: {session.user.role}</Text>
        <Text style={s.text}>
          Vencimiento: {display("expiresAt", session.expiresAt)}
        </Text>
        <Text style={s.muted}>
          El token permanece en memoria y se elimina al cerrar sesión o
          recargar.
        </Text>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Servicio</Text>
        <Text selectable style={s.text}>
          {client.baseUrl.startsWith("/")
            ? "API a través de este servidor: "
            : ""}
          {client.baseUrl}
        </Text>
        <Text style={s.muted}>
          Se requiere bearer token para los módulos de operadores. Las claves
          del ESP32 no se usan para iniciar sesión.
        </Text>
        <Action
          title="Verificar conexión y sesión"
          onPress={() => void check()}
        />
        {busy && <ActivityIndicator color={color.primary} />}
        {!!status && (
          <Text accessibilityLiveRegion="polite" style={s.text}>
            {status}
          </Text>
        )}
      </View>
      <CompanySettings client={client} session={session} />
    </>
  );
}
export default function Overview({
  view,
  client,
  session,
  onOpen,
}: {
  view: string;
  client: ApiClient;
  session: Session;
  onOpen: (f: RelatedFlow) => void;
}) {
  if (view === "dashboard")
    return <Dashboard client={client} session={session} onOpen={onOpen} />;
  if (view === "reportes") return <Reports session={session} onOpen={onOpen} />;
  if (view === "alertas" && ["ADMIN", "SEGURIDAD"].includes(session.user.role))
    return <Incidents client={client} onOpen={onOpen} />;
  return <Settings client={client} session={session} />;
}
function makeStyles(color: Colors) {
  return StyleSheet.create({
    title: { fontSize: 26, fontWeight: "700", color: color.ink },
    dashboardToolbar: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    toolbarActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: spacing.sm,
    },
    compactButton: {
      alignSelf: "flex-start",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    periodPanel: {
      backgroundColor: color.card,
      borderWidth: 1,
      borderColor: color.border,
      borderRadius: 16,
      padding: spacing.lg,
      gap: spacing.md,
    },
    periodFields: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    periodField: { flex: 1, minWidth: 190, maxWidth: 320, gap: spacing.xs },
    periodCaption: { fontSize: 13, color: color.muted },
    heading: { fontSize: 18, fontWeight: "600", color: color.ink },
    text: { fontSize: 15, lineHeight: 23, color: color.ink },
    muted: { fontSize: 14, lineHeight: 21, color: color.muted },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
    card: {
      backgroundColor: color.card,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: color.border,
      gap: spacing.md,
      flexGrow: 1,
      minWidth: 240,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: 44,
      backgroundColor: color.soft,
      padding: spacing.md,
      borderRadius: 12,
      justifyContent: "center",
    },
    action: { color: color.primary, fontWeight: "600" },
    error: {
      color: color.error,
      padding: spacing.md,
      backgroundColor: color.errorBg,
      borderRadius: 10,
    },
  });
}
