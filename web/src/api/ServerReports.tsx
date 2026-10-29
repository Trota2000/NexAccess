import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  Check,
  FileDown,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import { ApiClient, id, Row, Session } from "./client";
import { Colors, useDesign, useReducedMotion } from "./Theme";
import { labels } from "./resources";
import { reportBody, reportOptions, ReportOptions } from "./reportContract";
import { downloadReport } from "./reportDownload";
import CalendarField from "./CalendarField";

const captions: Record<string, string> = {
  EMPLOYEE: "Empleado",
  DAY: "Día",
  WEEK: "Semana",
  MONTH: "Mes",
  AREA: "Área",
  DEVICE: "Lector",
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  DISPOSITIVO: "Dispositivo",
  MANUAL: "Manual",
  AUTORIZADO: "Autorizado",
  RECHAZADO: "Rechazado",
  attendanceTypes: "Tipos de marcación",
  attendanceSources: "Origen de marcación",
  accessResults: "Resultado de acceso",
  employeeIds: "Empleados",
  areaIds: "Áreas",
  deviceIds: "Lectores",
};
const lookupPaths: Record<string, string> = {
  employeeIds: "/employees",
  areaIds: "/areas",
  deviceIds: "/reports/devices",
};
export default function ServerReports({
  client,
  session,
}: {
  client: ApiClient;
  session: Session;
}) {
  const { color, styles: s } = useDesign(styles);
  const reduced = useReducedMotion();
  const [options, setOptions] = useState<ReportOptions>();
  const [revision, reload] = useState(0);
  const [type, setType] = useState("");
  const [draft, setDraft] = useState<Row>(() => ({
    from: new Date(Date.now() - 7 * 86400000).toISOString(),
    to: new Date().toISOString(),
    format: "PDF",
    includeSummary: true,
    includeDetails: true,
  }));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [lookup, setLookup] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const mounted = useRef(true),
    locked = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    void client
      .request("/reports/options")
      .then((value) => {
        const next = reportOptions(value, session.user.role);
        if (active) {
          setOptions(next);
          setType(next.reports[0]?.type ?? "");
          setDraft((d) => ({
            from: d.from,
            to: d.to,
            format: next.reports[0]?.formats.includes("PDF") ? "PDF" : "JSON",
            includeSummary: next.supportsSummary,
            includeDetails: next.supportsDetails,
          }));
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar los reportes.",
          );
      });
    return () => {
      active = false;
    };
  }, [client, session.user.role, revision]);
  useEffect(() => {
    if (!lookup) return;
    let active = true;
    void client
      .request(lookupPaths[lookup], { query: { page, pageSize: 20 } })
      .then((value) => {
        const data = value as Row;
        if (!data || typeof data !== "object")
          throw new Error("La lista de selección no cumple el contrato.");
        const count = lookup === "deviceIds" ? data.total : data.totalItems;
        if (
          !Array.isArray(data.items) ||
          !Number.isSafeInteger(count) ||
          Number(count) < 0
        )
          throw new Error("La lista de selección no cumple el contrato.");
        const items = (data.items as Row[]).map((row) => {
          id(row.id);
          return row;
        });
        if (active) {
          setRows(items);
          setTotal(Number(count));
        }
      })
      .catch((e) => {
        if (active)
          setLookupError(
            e instanceof Error ? e.message : "No se pudo cargar la lista.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, lookup, page]);
  const report = options?.reports.find((r) => r.type === type);
  function lookupPage(next: number) {
    setLoading(true);
    setRows([]);
    setTotal(0);
    setLookupError("");
    setPage(next);
  }
  const selected = (key: string) =>
    (draft[key] as (string | number)[] | undefined) ?? [];
  function toggle(key: string, value: string | number) {
    setDraft((d) => {
      const values = (d[key] as (string | number)[] | undefined) ?? [];
      return {
        ...d,
        [key]: values.includes(value)
          ? values.filter((v) => v !== value)
          : [...values, value],
      };
    });
    setNotice("");
  }
  function button(
    title: string,
    onPress: () => void,
    disabled = false,
    icon: "download" | "filter" | "refresh" | "close" = "filter",
  ) {
    const Icon =
      icon === "download"
        ? FileDown
        : icon === "refresh"
          ? RefreshCw
          : icon === "close"
            ? X
            : SlidersHorizontal;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[s.button, disabled && s.disabled]}
      >
        <Icon size={18} color={color.primary} />
        <Text style={s.action}>{title}</Text>
      </Pressable>
    );
  }
  function choice(key: string, value: string, title: string) {
    const checked = selected(key).includes(value);
    return (
      <Pressable
        key={value}
        accessibilityRole="checkbox"
        accessibilityLabel={
          key === "groupBy"
            ? `Agrupar por ${title}`
            : key === "columns"
              ? `Columna ${title}`
              : title
        }
        accessibilityState={{ checked, disabled: busy }}
        aria-checked={checked}
        disabled={busy}
        onPress={() => toggle(key, value)}
        style={[s.choice, checked && s.selected]}
      >
        {checked && <Check size={16} color={color.primary} />}
        <Text style={s.text}>{title}</Text>
      </Pressable>
    );
  }
  async function generate() {
    if (locked.current || !options || !report) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = reportBody(options, report, draft),
        format = body.format as "PDF" | "JSON";
      const result = await client.request("/reports/generate", {
        method: "POST",
        body,
        pdf: format === "PDF",
      });
      if (!mounted.current) return;
      await downloadReport(result, format);
      if (mounted.current)
        setNotice(
          "Reporte generado. Revisá las descargas o el menú para guardarlo.",
        );
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : "No se pudo generar el reporte.",
        );
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text accessibilityRole="header" style={s.title}>
          Generador de reportes
        </Text>
        {button(
          "Actualizar opciones",
          () => {
            setOptions(undefined);
            setError("");
            reload((v) => v + 1);
          },
          busy,
          "refresh",
        )}
      </View>
      <Text style={s.muted}>
        Para incluir el membrete de tu empresa, usá Exportar PDF desde
        Asistencia o Historial de accesos. Este generador descarga el PDF con el
        encabezado actual del servicio.
      </Text>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          {notice}
        </Text>
      )}
      {!options && !error && (
        <ActivityIndicator
          accessibilityLabel="Cargando opciones de reportes"
          color={color.primary}
        />
      )}
      {options && !options.reports.length && (
        <Text style={s.muted}>No hay reportes disponibles para tu perfil.</Text>
      )}
      {!!report && (
        <>
          <View style={s.row}>
            {options!.reports.map((option) => (
              <Pressable
                key={option.type}
                accessibilityRole="radio"
                accessibilityLabel={option.name}
                accessibilityState={{
                  checked: type === option.type,
                  disabled: busy,
                }}
                aria-checked={type === option.type}
                disabled={busy}
                onPress={() => {
                  setType(option.type);
                  setDraft((d) => ({
                    from: d.from,
                    to: d.to,
                    format: option.formats.includes("PDF") ? "PDF" : "JSON",
                    includeSummary: options!.supportsSummary,
                    includeDetails: options!.supportsDetails,
                  }));
                  setError("");
                  setNotice("");
                }}
                style={[s.choice, type === option.type && s.selected]}
              >
                <Text style={s.text}>{option.name}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.muted}>{report.description}</Text>
          <View style={s.row}>
            {["from", "to"].map((key) => (
              <View key={key} style={s.date}>
                <CalendarField
                  label={key === "from" ? "Desde" : "Hasta"}
                  value={draft[key]}
                  edge={key as "from" | "to"}
                  onChange={(value) => {
                    if (!busy) setDraft((d) => ({ ...d, [key]: value }));
                  }}
                />
              </View>
            ))}
          </View>
          <Text style={s.muted}>
            Máximo {options!.maxReportDays} días. Las fechas se interpretan en
            Asunción.
          </Text>
          <View style={s.row}>
            {Object.keys(lookupPaths)
              .filter((key) => report.filters.includes(key))
              .map((key) => (
                <View key={key} style={s.selection}>
                  {button(
                    `${captions[key]}: ${selected(key).length ? `${selected(key).length} seleccionados` : "todos"}`,
                    () => {
                      setLookup(key);
                      lookupPage(1);
                    },
                    busy,
                  )}
                  {!!selected(key).length &&
                    button(
                      `Limpiar ${captions[key].toLowerCase()}`,
                      () => setDraft((d) => ({ ...d, [key]: [] })),
                      busy,
                      "close",
                    )}
                </View>
              ))}
          </View>
          {Object.keys(options!.filterValues)
            .filter((key) => report.filters.includes(key))
            .map((key) => (
              <View key={key} style={s.section}>
                <Text style={s.label}>{captions[key]}</Text>
                <View style={s.row}>
                  {options!.filterValues[key].map((value) =>
                    choice(key, value, captions[value] ?? value),
                  )}
                </View>
              </View>
            ))}
          <View style={s.section}>
            <Text style={s.label}>Agrupar por</Text>
            <View style={s.row}>
              {report.groupBy.map((value) =>
                choice("groupBy", value, captions[value] ?? value),
              )}
            </View>
          </View>
          <View style={s.section}>
            <Text style={s.label}>
              Columnas · sin selección se usa la configuración del servidor
            </Text>
            <View style={s.row}>
              {report.columns.map((value) =>
                choice("columns", value, labels[value] ?? value),
              )}
            </View>
          </View>
          <View style={s.row}>
            {[
              ["includeSummary", "Incluir resumen", options!.supportsSummary],
              ["includeDetails", "Incluir detalle", options!.supportsDetails],
            ]
              .filter(([, , supported]) => supported)
              .map(([key, title]) => (
                <View key={String(key)} style={s.row}>
                  <Text style={s.text}>{String(title)}</Text>
                  <Switch
                    accessibilityLabel={String(title)}
                    value={draft[String(key)] === true}
                    disabled={busy}
                    onValueChange={(value) =>
                      setDraft((d) => ({ ...d, [String(key)]: value }))
                    }
                    trackColor={{ true: color.primary }}
                  />
                </View>
              ))}
          </View>
          <View style={s.row}>
            {report.formats.map((format) => (
              <Pressable
                key={format}
                accessibilityRole="radio"
                accessibilityLabel={`Formato ${format}`}
                accessibilityState={{
                  checked: draft.format === format,
                  disabled: busy,
                }}
                aria-checked={draft.format === format}
                disabled={busy}
                onPress={() => setDraft((d) => ({ ...d, format }))}
                style={[s.choice, draft.format === format && s.selected]}
              >
                <Text style={s.text}>{format}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                busy ? "Generando reporte…" : "Descargar reporte"
              }
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => void generate()}
              style={[s.button, busy && s.disabled]}
            >
              <FileDown size={18} color={color.primary} />
              <Text style={s.action}>
                {busy ? "Generando reporte…" : "Descargar reporte"}
              </Text>
            </Pressable>
          </View>
        </>
      )}
      <Modal
        visible={!!lookup}
        transparent
        animationType={reduced ? "none" : "fade"}
        onRequestClose={() => setLookup("")}
      >
        <View style={s.overlay}>
          <View
            accessibilityViewIsModal
            aria-modal
            accessibilityLabel={`Seleccionar ${captions[lookup] ?? "filtro"}`}
            style={s.sheet}
          >
            <View style={s.row}>
              <Text accessibilityRole="header" style={s.title}>
                {captions[lookup]}
              </Text>
              {button("Cerrar selección", () => setLookup(""), false, "close")}
            </View>
            <ScrollView contentContainerStyle={s.section}>
              {loading ? (
                <ActivityIndicator
                  accessibilityLabel="Cargando selección"
                  color={color.primary}
                />
              ) : lookupError ? (
                <Text accessibilityRole="alert" style={s.error}>
                  {lookupError}
                </Text>
              ) : (
                <>
                  {!rows.length && (
                    <Text style={s.muted}>
                      No hay registros en esta página.
                    </Text>
                  )}
                  {rows.map((row) => {
                    const value = id(row.id),
                      checked = selected(lookup).includes(value),
                      title = String(
                        row.fullName ?? row.name ?? row.code ?? value,
                      );
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="checkbox"
                        accessibilityLabel={`Seleccionar ${title}`}
                        accessibilityState={{ checked }}
                        aria-checked={checked}
                        onPress={() => toggle(lookup, value)}
                        style={[s.choice, checked && s.selected]}
                      >
                        {checked && <Check size={18} color={color.primary} />}
                        <Text style={s.text}>{title}</Text>
                      </Pressable>
                    );
                  })}
                </>
              )}
            </ScrollView>
            <View style={s.row}>
              {button(
                "Página anterior",
                () => lookupPage(page - 1),
                loading || page <= 1,
              )}
              <Text style={s.muted}>
                {page} / {Math.max(1, Math.ceil(total / 20))}
              </Text>
              {button(
                "Página siguiente",
                () => lookupPage(page + 1),
                loading || page * 20 >= total,
              )}
              {button("Listo", () => setLookup(""))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
function styles(c: Colors) {
  return StyleSheet.create({
    card: {
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      gap: 16,
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 12,
    },
    section: { gap: 8 },
    date: { flexBasis: "44%", flexGrow: 1, minWidth: 220 },
    selection: { gap: 4 },
    title: { fontSize: 18, fontWeight: "600", color: c.ink, flexGrow: 1 },
    label: { fontSize: 14, fontWeight: "600", color: c.ink },
    text: { fontSize: 14, color: c.ink },
    muted: { fontSize: 13, lineHeight: 20, color: c.muted },
    error: { color: c.error, fontSize: 14, lineHeight: 20 },
    button: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 44,
      borderRadius: 10,
      backgroundColor: c.soft,
      alignSelf: "flex-start",
    },
    action: { color: c.primary, fontSize: 14, fontWeight: "600" },
    choice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: c.controlBorder,
      borderRadius: 10,
      padding: 12,
      minHeight: 44,
    },
    selected: { borderColor: c.primary, backgroundColor: c.soft },
    disabled: { opacity: 0.5 },
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    sheet: {
      width: "100%",
      maxWidth: 680,
      maxHeight: "85%",
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 20,
      gap: 16,
    },
  });
}
