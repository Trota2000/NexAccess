import {
  Colors,
  spacing,
  useDesign,
  ThemeToggle,
  useReducedMotion,
} from "./Theme";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import {
  Plus,
  RefreshCw,
  SlidersHorizontal,
  FileDown,
  Search,
  ChevronRight,
  X,
  Check,
  LogOut,
  LogIn,
  Wifi,
  LucideIcon,
  LayoutDashboard,
  Users,
  CreditCard,
  Cpu,
  ShieldCheck,
  History,
  CalendarCheck,
  UserCog,
  ClipboardList,
  ContactRound,
  ChartColumn,
  Bell,
  Settings,
  MapPin,
  Layers,
} from "lucide-react-native";
import CalendarField from "./CalendarField";
import BusyOverlay from "./BusyOverlay";
import { exportPdf } from "./pdf";
import { loadCompanyBranding } from "./company";
import { ApiClient, ApiError, id, Page, Row, Session } from "./client";
import Overview, { extraModules } from "./Overview";
import {
  createLabels,
  formErrorMap,
  relatedFlows,
  RelatedFlow,
  writeReceipt,
} from "./workflows";
import {
  authorize,
  accountAccessBody,
  bodyFor,
  checkReportSize,
  display,
  Field,
  fieldError,
  inputError,
  labels,
  pageOf,
  queryFor,
  resource,
  Resource,
  resources,
} from "./resources";

const moduleIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  employees: Users,
  credentials: CreditCard,
  areas: MapPin,
  roles: Layers,
  devices: Cpu,
  "access-permissions": ShieldCheck,
  "access-events": History,
  attendance: CalendarCheck,
  users: UserCog,
  audit: ClipboardList,
  enrollments: ContactRound,
  reportes: ChartColumn,
  alertas: Bell,
  configuracion: Settings,
};
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "web"
    ? "/api/v1"
    : "https://nexaccess.rattenkoenig.net/api/v1");
const emptyPage: Page = {
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
};
const reportColumns = [
  "employeeName",
  "date",
  "firstEntry",
  "lastExit",
  "totalMarks",
  "incomplete",
];
function errorText(error: unknown): string {
  if (error instanceof ApiError)
    return [
      error.message,
      ...Object.entries(error.errors ?? {}).flatMap(([key, values]) =>
        (Array.isArray(values) ? values : [String(values)]).map(
          (v) => `${labels[key] ?? key}: ${v}`,
        ),
      ),
    ].join("\n");
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación.";
}
function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}) {
  const { color, styles: s } = useDesign(makeStyles);

  const destructive = /revocar definitivamente|quitar rol|desactivar/i.test(
    title,
  );
  const Icon: LucideIcon =
    icon ??
    (/crear|nuevo|agregar|registrar|iniciar enrolamiento/i.test(title)
      ? Plus
      : /actualizar/i.test(title)
        ? RefreshCw
        : /filtro/i.test(title)
          ? SlidersHorizontal
          : /csv|pdf/i.test(title)
            ? FileDown
            : /cerrar sesión/i.test(title)
              ? LogOut
              : /cerrar|limpiar/i.test(title)
                ? X
                : /confirmar|guardar|revisar/i.test(title)
                  ? Check
                  : /seleccionar|buscar|consultar/i.test(title)
                    ? Search
                    : ChevronRight);
  return (
    <Pressable
      testID={`nx-action-${title}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary ? s.secondary : s.primary,
        destructive && {
          backgroundColor: color.errorBg,
          borderColor: color.error,
        },
        style,
        (disabled || pressed) && { opacity: 0.55 },
      ]}
    >
      <Icon
        size={18}
        color={
          destructive
            ? color.error
            : secondary
              ? color.primary
              : color.onPrimary
        }
      />
      <Text
        style={{
          color: destructive
            ? color.error
            : secondary
              ? color.primary
              : color.onPrimary,
          flexShrink: 1,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
function ErrorNotice({ message }: { message: string }) {
  const { styles: s } = useDesign(makeStyles);

  return message ? (
    <Text accessibilityRole="alert" style={s.error}>
      {message}
    </Text>
  ) : null;
}
function Sheet({
  title,
  children,
  onClose,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const { color, styles: s } = useDesign(makeStyles);

  const reduced = useReducedMotion();
  const body = React.Children.toArray(children);
  const actions: React.ReactNode[] = [];
  while (
    body.length &&
    React.isValidElement(body[body.length - 1]) &&
    (body[body.length - 1] as React.ReactElement).type === Button
  )
    actions.unshift(body.pop());
  return (
    <Modal
      transparent
      animationType={reduced ? "none" : "fade"}
      visible
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <SafeAreaView
          testID="nx-dialog"
          role="dialog"
          accessibilityLabel={title}
          accessibilityViewIsModal
          style={s.sheet}
        >
          <View style={s.sheetHeader}>
            <Text accessibilityRole="header" style={[s.heading, { flex: 1 }]}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onClose}
              style={s.closeButton}
            >
              <X size={20} color={color.muted} />
            </Pressable>
          </View>
          <ScrollView
            style={s.sheetBody}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.sheetContent}
          >
            {body}
          </ScrollView>
          {(footer || actions.length > 0) && (
            <View testID="nx-dialog-footer" style={s.sheetFooter}>
              {footer}
              {actions}
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function titleOf(row: Row): string {
  return String(
    row.fullName ??
      row.name ??
      row.username ??
      row.employeeName ??
      row.code ??
      `Registro ${row.id ?? ""}`,
  );
}
function Lookup({
  client,
  resourceKey,
  onSelect,
  onClose,
}: {
  client: ApiClient;
  resourceKey: string;
  onSelect: (row: Row) => void;
  onClose: () => void;
}) {
  const { color, styles: s } = useDesign(makeStyles);

  const r = resource(resourceKey);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [data, setData] = useState(emptyPage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    Promise.resolve()
      .then(() => {
        if (!current) return;
        setBusy(true);
        setData(emptyPage);
        setError("");
        return client.request(`/${r.key}`, {
          query: {
            ...(r.paged ? { page, pageSize: 20 } : {}),
            ...(applied && r.filters.some((f) => f.key === "search")
              ? { search: applied }
              : {}),
          },
        });
      })
      .then((v) => {
        if (current) setData(pageOf(v, r));
      })
      .catch((e) => {
        if (current) setError(errorText(e));
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [client, r, page, applied]);
  return (
    <Sheet title={`Seleccionar: ${r.title}`} onClose={onClose}>
      {r.filters.some((f) => f.key === "search") && (
        <>
          <TextInput
            accessibilityLabel="Buscar referencia"
            placeholder="Nombre, documento o código"
            style={s.input}
            value={search}
            onChangeText={setSearch}
          />
          <Button
            title="Buscar"
            disabled={busy}
            onPress={() => {
              setPage(1);
              setApplied(search.trim());
            }}
          />
        </>
      )}
      <ErrorNotice message={error} />
      {busy ? (
        <ActivityIndicator
          accessibilityLabel="Cargando opciones"
          color={color.primary}
        />
      ) : (
        <>
          {!data.items.length && (
            <Text style={s.text}>No se encontraron registros.</Text>
          )}
          {data.items.map((row) => (
            <Pressable
              key={String(row.id)}
              accessibilityRole="button"
              onPress={() => onSelect(row)}
              style={s.card}
            >
              <Text style={s.heading}>{titleOf(row)}</Text>
              <Text style={s.muted}>
                ID {String(row.id)} ·{" "}
                {row.isActive === false ? "Inactivo" : "Activo"}
              </Text>
            </Pressable>
          ))}
          <Pagination data={data} onPage={setPage} disabled={busy} />
        </>
      )}
    </Sheet>
  );
}
function Input({
  field,
  value,
  onChange,
  client,
  filter = false,
  error = "",
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  client: ApiClient;
  filter?: boolean;
  error?: string;
}) {
  const { color, styles: s } = useDesign(makeStyles);

  const [lookup, setLookup] = useState(false);
  const [caption, setCaption] = useState("");
  const [touched, setTouched] = useState(false);
  const [rejected, setRejected] = useState("");
  const invalid =
    rejected ||
    error ||
    (touched
      ? fieldError({ ...field, required: !filter && field.required }, value)
      : "");
  if (field.type === "boolean")
    return (
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={s.label}>{field.label}</Text>
        <Switch
          accessibilityLabel={field.label}
          value={value === true}
          onValueChange={onChange}
          trackColor={{ true: color.primary }}
        />
      </View>
    );
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={s.label}>
        {field.label}
        {field.required && !filter ? " *" : ""}
      </Text>
      <View
        style={{
          flexDirection: field.reference ? "row" : "column",
          alignItems: field.reference ? "flex-end" : undefined,
          gap: spacing.sm,
        }}
      >
        <View style={{ flex: 1 }}>
          {field.type === "datetime" ? (
            <CalendarField
              label={field.label}
              value={value}
              onChange={onChange}
              edge={
                field.key === "from"
                  ? "from"
                  : field.key === "to"
                    ? "to"
                    : "instant"
              }
            />
          ) : field.choices ? (
            <View style={s.row}>
              {[...(filter ? [""] : []), ...field.choices].map((v) => (
                <Pressable
                  key={v}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: String(value ?? "") === v }}
                  aria-checked={String(value ?? "") === v}
                  onPress={() => onChange(v)}
                  style={[s.chip, String(value ?? "") === v && s.selected]}
                >
                  <Text style={s.text}>
                    {v === ""
                      ? "Todos"
                      : v === "true"
                        ? "Activo"
                        : v === "false"
                          ? "Inactivo"
                          : field.key === "role" && v === "EMPLEADO"
                            ? "EMPLEADO · app NFC"
                            : v}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <TextInput
              accessibilityLabel={field.label}
              aria-invalid={!!invalid}
              value={String(value ?? "")}
              onChangeText={(next) => {
                const message = inputError(field, next);
                setRejected(message);
                if (!message) onChange(next);
              }}
              onBlur={() => {
                setTouched(true);
                setRejected("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={field.type === "password"}
              keyboardType={
                field.type === "id"
                  ? "number-pad"
                  : field.key === "email"
                    ? "email-address"
                    : field.format === "phone"
                      ? "phone-pad"
                      : field.format === "document" || field.format === "taxId"
                        ? "number-pad"
                        : "default"
              }
              maxLength={field.type === "id" ? 16 : (field.max ?? 500)}
              placeholder={field.type === "time" ? "08:00" : undefined}
              style={[s.input, !!invalid && s.invalidInput]}
            />
          )}
        </View>
        {field.reference && (
          <>
            <Button
              title={
                caption
                  ? `Cambiar: ${caption}`
                  : `Seleccionar ${field.label.toLowerCase()}`
              }
              secondary
              onPress={() => setLookup(true)}
            />
            {lookup && (
              <Lookup
                client={client}
                resourceKey={field.reference}
                onClose={() => setLookup(false)}
                onSelect={(row) => {
                  onChange(row.id);
                  setCaption(titleOf(row));
                  setLookup(false);
                }}
              />
            )}
          </>
        )}
      </View>
      {!!invalid && (
        <Text accessibilityRole="alert" style={s.fieldError}>
          {invalid}
        </Text>
      )}
      {!invalid && !!field.hint && !filter && (
        <Text style={s.muted}>{field.hint}</Text>
      )}
    </View>
  );
}
function Pagination({
  data,
  onPage,
  disabled,
}: {
  data: Page;
  onPage: (p: number) => void;
  disabled: boolean;
}) {
  const { styles: s } = useDesign(makeStyles);

  return (
    <View style={s.row}>
      <Button
        title="Anterior"
        secondary
        disabled={disabled || data.page <= 1}
        onPress={() => onPage(data.page - 1)}
      />
      <Text style={s.muted}>
        Página {data.page} de {Math.max(1, data.totalPages)}
      </Text>
      <Button
        title="Siguiente"
        secondary
        disabled={disabled || data.page >= data.totalPages}
        onPress={() => onPage(data.page + 1)}
      />
    </View>
  );
}
interface Mutation {
  title: string;
  path: string;
  method: string;
  body?: Row;
  resource: Resource;
  onSuccess?: (result: unknown) => void;
}
interface FormSpec {
  title: string;
  fields: Field[];
  row?: Row;
  edit?: boolean;
  hint?: string;
  submit: (body: Row) => void;
}
function EditForm({
  form,
  client,
  onClose,
  serverError = "",
  fieldErrors = {},
}: {
  form: FormSpec;
  client: ApiClient;
  onClose: () => void;
  serverError?: string;
  fieldErrors?: Record<string, string>;
}) {
  const { styles: s } = useDesign(makeStyles);

  const [draft, setDraft] = useState<Row>(() =>
    Object.fromEntries(
      form.fields
        .filter((f) => !form.edit || !f.createOnly)
        .map((f) => [
          f.key,
          form.row?.[f.key] ?? f.default ?? (f.type === "boolean" ? false : ""),
        ]),
    ),
  );
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  return (
    <Sheet
      title={form.title}
      onClose={onClose}
      footer={
        <Button
          title="Revisar cambios"
          onPress={() => {
            try {
              setError("");
              const invalid = Object.fromEntries(
                form.fields
                  .filter((f) => !form.edit || !f.createOnly)
                  .map((f) => [f.key, fieldError(f, draft[f.key])])
                  .filter(([, message]) => !!message),
              );
              setValidationErrors(invalid);
              if (Object.keys(invalid).length) {
                setError("Revisá los campos señalados antes de continuar.");
                return;
              }
              form.submit(bodyFor(form.fields, draft, form.edit));
            } catch (e) {
              setError(errorText(e));
            }
          }}
        />
      }
    >
      {!!form.hint && <Text style={s.muted}>{form.hint}</Text>}
      <View style={s.formGrid}>
        {form.fields
          .filter((f) => !form.edit || !f.createOnly)
          .map((f) => (
            <View
              key={f.key}
              style={{
                gap: 6,
                flexGrow: 1,
                flexBasis:
                  f.type === "boolean"
                    ? "28%"
                    : f.type === "time"
                      ? "44%"
                      : (f.max && f.max > 255) ||
                          ["reason", "note", "description"].includes(f.key)
                        ? "100%"
                        : "46%",
                minWidth:
                  f.type === "boolean" ? 100 : f.type === "time" ? 140 : 220,
              }}
            >
              <Input
                key={f.key}
                field={f}
                value={draft[f.key]}
                error={validationErrors[f.key] || fieldErrors[f.key]}
                client={client}
                onChange={(value) => {
                  setValidationErrors((errors) => ({ ...errors, [f.key]: "" }));
                  setDraft((d) => {
                    const next = { ...d, [f.key]: value };
                    if (
                      f.key === "role" &&
                      form.fields.some(
                        (field) => field.key === "webAccessEnabled",
                      )
                    ) {
                      next.webAccessEnabled = value !== "EMPLEADO";
                      if (value === "EMPLEADO") next.mobileAccessEnabled = true;
                    }
                    return next;
                  });
                }}
              />
            </View>
          ))}
      </View>
      <ErrorNotice message={error || serverError} />
    </Sheet>
  );
}
function statusStyle(key: string, value: unknown, color: Colors) {
  if (key === "isActive" && typeof value === "boolean")
    return {
      color: value ? color.success : color.muted,
      backgroundColor: value ? color.successBg : color.raised,
    };
  if (key === "result" && value === "AUTORIZADO")
    return { color: color.success, backgroundColor: color.successBg };
  if (key === "result" && value === "RECHAZADO")
    return { color: color.error, backgroundColor: color.errorBg };
  if (key === "status" && value === "COMPLETADO")
    return { color: color.success, backgroundColor: color.successBg };
  if (
    key === "status" &&
    ["PENDIENTE", "EXPIRADO", "CANCELADO"].includes(String(value))
  )
    return { color: color.warning, backgroundColor: color.warningBg };
  return undefined;
}
function Details({ row, columns }: { row: Row; columns: string[] }) {
  const { color, styles: s } = useDesign(makeStyles);

  return (
    <View style={s.detailsGrid}>
      {columns.map((key) => (
        <View
          key={key}
          style={[
            s.detailCell,
            typeof row[key] === "object" && row[key] !== null && s.detailWide,
          ]}
        >
          <Text style={s.muted}>{labels[key] ?? key}</Text>
          <Text
            selectable
            style={[
              s.detailValue,
              typeof row[key] === "object" &&
                row[key] !== null &&
                s.technicalValue,
              statusStyle(key, row[key], color),
            ]}
          >
            {display(key, row[key])}
          </Text>
        </View>
      ))}
    </View>
  );
}
function Workspace({
  client,
  session,
  onLogout,
}: {
  client: ApiClient;
  session: Session;
  onLogout: () => void;
}) {
  const { color, styles: s } = useDesign(makeStyles);

  const available = resources.filter((r) => r.read.includes(session.user.role));
  const supplements = extraModules.filter(
    (m) =>
      m.key !== "alertas" || ["ADMIN", "SEGURIDAD"].includes(session.user.role),
  );
  const navigation = [supplements[0], ...available, ...supplements.slice(1)];
  const [key, setKey] = useState("dashboard");
  const supplemental = supplements.some((m) => m.key === key);
  const r = resource(supplemental ? "employees" : key);
  const [filters, setFilters] = useState<Row>({});
  const [applied, setApplied] = useState<Row>({});
  const [page, setPage] = useState(1);
  const [report, setReport] = useState(false);
  const [storedData, setData] = useState(emptyPage);
  const [fetching, setBusy] = useState(false);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Row>();
  const [form, setForm] = useState<FormSpec>();
  const [pending, setPending] = useState<Mutation>();
  const [writing, setWriting] = useState(false);
  const [uncertain, setUncertain] = useState<{
    key: string;
    title: string;
    reviewed: boolean;
  }>();
  const [contextLabel, setContextLabel] = useState("");
  const [saved, setSaved] = useState<{ key: string; row: Row }>();
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [recentEnrollments, setRecentEnrollments] = useState<number[]>([]);
  const [secret, setSecret] = useState<string>();
  const requestSerial = useRef(0);
  const writeLock = useRef(false);
  const detailSerial = useRef(0);
  const [showFilters, setShowFilters] = useState(false);
  const [deviceScope, setDeviceScope] = useState<number>();
  const requestKey = JSON.stringify([
    key,
    applied,
    page,
    report,
    revision,
    deviceScope,
  ]);
  const data = loadedKey === requestKey ? storedData : emptyPage;
  const busy = fetching || loadedKey !== requestKey;
  const { width } = useWindowDimensions();
  const [detailActionWidth, setDetailActionWidth] = useState(0);
  const queryColumns = detailActionWidth < 540 ? 1 : 2;
  const recordColumns = detailActionWidth < 420 ? 1 : 3;
  const queryButtonStyle: StyleProp<ViewStyle> = [
    s.detailUniformButton,
    {
      width: detailActionWidth
        ? (detailActionWidth - 1 - spacing.sm * (queryColumns - 1)) /
          queryColumns
        : "100%",
    },
  ];
  const recordButtonStyle: StyleProp<ViewStyle> = [
    s.detailUniformButton,
    {
      width: detailActionWidth
        ? (detailActionWidth - 1 - spacing.sm * (recordColumns - 1)) /
          recordColumns
        : "100%",
    },
  ];
  const canWrite = r.write.includes(session.user.role) && !uncertain;
  const [transition, setTransition] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(transitionTimer.current), []);
  function showTransition() {
    setTransition(true);
    clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => setTransition(false), 320);
  }
  useEffect(() => {
    const serial = ++requestSerial.current;
    let current = true;
    const load = async () => {
      await Promise.resolve();
      if (!current) return emptyPage;
      setBusy(true);
      setError("");
      setData(emptyPage);
      if (supplemental) return emptyPage;
      authorize(session.user.role, r);
      const query = queryFor(r, applied, page);
      if (r.key === "access-events" && deviceScope)
        query.deviceId = deviceScope;
      if (r.key === "enrollments") {
        if (!query.id) return emptyPage;
        const row = await client.request(`/enrollments/${id(query.id)}`);
        return {
          ...emptyPage,
          items: [row as Row],
          totalItems: 1,
          totalPages: 1,
        };
      }
      if (report && (!query.from || !query.to))
        throw new ApiError("Indicá desde y hasta para el reporte diario.", 400);
      if (report) await checkReportSize(client, r, query);
      const path =
        r.key === "access-events" && deviceScope
          ? `/devices/${deviceScope}/events`
          : `/${r.key}${report ? "/report" : ""}`;
      const result = await client.request(path, { query });
      return pageOf(result, r, report);
    };
    load()
      .then((p) => {
        if (current && serial === requestSerial.current) {
          setData(p);
          if (!supplemental && (r.key !== "enrollments" || applied.id))
            setUncertain((current) =>
              current?.key === r.key ? { ...current, reviewed: true } : current,
            );
        }
      })
      .catch((e) => {
        if (current && serial === requestSerial.current) setError(errorText(e));
      })
      .finally(() => {
        if (current && serial === requestSerial.current) {
          setBusy(false);
          setLoadedKey(requestKey);
        }
      });
    return () => {
      current = false;
    };
  }, [
    client,
    r,
    applied,
    page,
    report,
    revision,
    session.user.role,
    deviceScope,
    requestKey,
    supplemental,
  ]);
  const enrollmentToWatch =
    key === "enrollments" && selected?.status === "PENDIENTE"
      ? selected.id
      : undefined;
  useEffect(() => {
    if (!enrollmentToWatch || form || pending) return;
    let active = true,
      inFlight = false;
    const enrollmentId = id(enrollmentToWatch);
    const timer = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const row = (await client.request(
          `/enrollments/${enrollmentId}`,
        )) as Row;
        if (active) {
          setSelected(row);
          setData((current) => ({
            ...current,
            items: current.items.map((item) =>
              item.id === row.id ? row : item,
            ),
          }));
        }
      } catch (e) {
        if (active) setError(errorText(e));
      } finally {
        inFlight = false;
      }
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [client, enrollmentToWatch, form, pending]);
  function navigate(next: string, flow?: RelatedFlow) {
    if (writing) return;
    showTransition();
    detailSerial.current++;
    setDeviceScope(flow?.deviceScope);
    setKey(next);
    setFilters(flow?.query ?? {});
    setApplied(flow?.query ?? {});
    setPage(1);
    setReport(flow?.report ?? false);
    setSelected(undefined);
    setForm(undefined);
    setPending(undefined);
    setSecret(undefined);
    setNotice("");
    setError("");
    setShowFilters(!!flow?.query);
    setContextLabel(flow?.label ?? "");
    setSaved(undefined);
    setServerFields({});
    if (flow?.seed) createOrEdit(undefined, flow.seed, resource(next));
  }
  function prepare(m: Mutation) {
    authorize(session.user.role, m.resource, true);
    if (uncertain)
      throw new ApiError(
        "Actualizá la lista y verificá el resultado antes de repetir una escritura.",
      );
    setError("");
    setServerFields({});
    setPending(m);
  }
  function successSecret(result: unknown) {
    const v = result as Row;
    if (typeof v?.deviceKey === "string") setSecret(v.deviceKey);
  }
  function createOrEdit(row?: Row, seed?: Row, target: Resource = r) {
    showTransition();
    setError("");
    setServerFields({});
    setForm({
      title: row
        ? `Editar ${titleOf(row)}`
        : (createLabels[target.key] ?? `Nuevo registro: ${target.title}`),
      fields: target.fields,
      row: row ?? seed,
      edit: !!row,
      hint:
        target.key === "users"
          ? "EMPLEADO: app NFC sin panel web. ADMIN, SEGURIDAD o RRHH: panel web y, si se habilita, también la app personal con un empleado vinculado."
          : undefined,
      submit: (body) =>
        prepare({
          title: row ? "Guardar cambios" : "Crear registro",
          resource: target,
          path: `/${target.key}${row ? `/${id(row.id)}` : ""}`,
          method: row ? "PUT" : "POST",
          body,
          onSuccess: (result) => {
            successSecret(result);
            const receipt = writeReceipt(target.key, result);
            setSaved({ key: target.key, row: receipt });
            if (target.key === "enrollments") {
              const resultId = id((result as Row).id);
              setApplied({ id: resultId });
              setFilters({ id: resultId });
              setRecentEnrollments((current) =>
                [
                  resultId,
                  ...current.filter((value) => value !== resultId),
                ].slice(0, 10),
              );
            }
          },
        }),
    });
  }
  function actionForm(
    title: string,
    fields: Field[],
    path: string,
    method = "POST",
  ) {
    setForm({
      title,
      fields,
      submit: (body) => prepare({ title, resource: r, path, method, body }),
    });
  }
  async function commit() {
    if (!pending || writeLock.current) return;
    writeLock.current = true;
    setWriting(true);
    setError("");
    const mutation = pending;
    try {
      authorize(session.user.role, mutation.resource, true);
      const result = await client.request(mutation.path, {
        method: mutation.method,
        body: mutation.body,
      });
      mutation.onSuccess?.(result);
      setSelected(undefined);
      setForm(undefined);
      setPending(undefined);
      setNotice("El servidor confirmó la operación.");
      setRevision((n) => n + 1);
    } catch (e) {
      setPending(undefined);
      setError(errorText(e));
      if (e instanceof ApiError)
        setServerFields(formErrorMap(e.errors, mutation.resource.key));
      if (
        e instanceof ApiError &&
        ([
          "NETWORK_ERROR",
          "TIMEOUT",
          "WRITE_RECEIPT_INVALID",
          "CONTRACT_ERROR",
          "UNSAFE_NUMBER",
          "API_ROUTE_NOT_CONFIGURED",
        ].includes(e.code) ||
          e.status >= 500)
      ) {
        setUncertain({
          key: mutation.resource.key,
          title: mutation.title,
          reviewed: false,
        });
        setForm(undefined);
        setSelected(undefined);
      }
    } finally {
      writeLock.current = false;
      setWriting(false);
    }
  }
  async function openDetails(row: Row) {
    const serial = ++detailSerial.current;
    setSelected(row);
    setError("");
    const hasGet = [
      "employees",
      "areas",
      "roles",
      "credentials",
      "devices",
      "access-permissions",
      "enrollments",
    ].includes(r.key);
    if (!hasGet) return;
    try {
      const detail = (await client.request(`/${r.key}/${id(row.id)}`)) as Row;
      if (r.key === "employees")
        detail.roles = await client.request(`/employees/${id(row.id)}/roles`);
      if (serial === detailSerial.current) setSelected(detail);
    } catch (e) {
      if (serial === detailSerial.current) {
        setSelected(undefined);
        setError(errorText(e));
      }
    }
  }
  async function exportCsv(asPdf = false) {
    if (writeLock.current) return;
    writeLock.current = true;
    setWriting(true);
    setError("");
    try {
      const query = queryFor(r, applied);
      if (r.key === "access-events" && deviceScope)
        query.deviceId = deviceScope;
      delete query.page;
      delete query.pageSize;
      if (!query.from || !query.to)
        throw new ApiError(
          "Indicá y aplicá un rango desde/hasta antes de exportar.",
          400,
        );
      await checkReportSize(client, r, query);
      const csv = (await client.request(`/${r.key}/export`, {
        query,
        csv: true,
      })) as string;
      if (asPdf)
        await exportPdf(csv, r.title, query, await loadCompanyBranding(client));
      else if (Platform.OS === "web") {
        const url = URL.createObjectURL(
          new Blob([csv], { type: "text/csv;charset=utf-8" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `nexaccess-${r.key}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else await Share.share({ title: `NexAccess ${r.title}`, message: csv });
      setNotice(
        asPdf
          ? Platform.OS === "web"
            ? "Reporte preparado: elegí Guardar como PDF en el diálogo de impresión."
            : "PDF preparado con los filtros aplicados."
          : "Exportación generada por el servidor con los filtros aplicados.",
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      writeLock.current = false;
      setWriting(false);
    }
  }
  const columns = report ? reportColumns : r.columns;
  const detailClose = () => {
    detailSerial.current++;
    setSelected(undefined);
  };
  return (
    <SafeAreaView style={s.root}>
      <View style={s.top}>
        <View style={{ flex: 1 }}>
          <Image
            source={require("../../assets/brand/nexaccess-logo.png")}
            accessibilityLabel="NexAccess"
            resizeMode="contain"
            style={s.headerLogo}
          />
        </View>
        <ThemeToggle />
        <Button title="Cerrar sesión" secondary onPress={onLogout} />
      </View>
      <View
        style={{ flex: 1, flexDirection: width >= 1000 ? "row" : "column" }}
      >
        <View style={width >= 1000 ? s.sidebar : s.nav}>
          <ScrollView
            horizontal={width < 1000}
            contentContainerStyle={{ gap: spacing.sm, padding: spacing.md }}
          >
            {navigation.map((module) => {
              const NavIcon = moduleIcons[module.key] ?? Layers;
              return (
                <Pressable
                  testID={`nx-nav-${module.key}`}
                  aria-current={key === module.key ? "page" : undefined}
                  aria-selected={key === module.key}
                  aria-disabled={writing}
                  key={module.key}
                  disabled={writing}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: key === module.key,
                    disabled: writing,
                  }}
                  onPress={() => navigate(module.key)}
                  style={[s.navItem, key === module.key && s.navActive]}
                >
                  <NavIcon
                    size={19}
                    strokeWidth={1.8}
                    color={
                      key === module.key ? color.activeText : color.primary
                    }
                  />
                  <Text
                    style={[
                      s.navLabel,
                      key === module.key && {
                        color: color.activeText,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {module.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {supplemental ? (
            <Overview
              key={key}
              view={key}
              client={client}
              session={session}
              onOpen={(flow) => navigate(flow.key, flow)}
            />
          ) : (
            <>
              <Text accessibilityRole="header" style={s.title}>
                {r.title}
              </Text>

              {!!contextLabel && (
                <View style={s.card}>
                  <Text style={s.label}>Consulta: {contextLabel}</Text>
                  <Button
                    title="Quitar contexto y filtros"
                    secondary
                    onPress={() => navigate(key)}
                  />
                </View>
              )}
              {saved?.key === key && (
                <View style={s.card}>
                  <Text style={s.heading}>
                    Registro guardado · ID {String(saved.row.id)}
                  </Text>
                  <Text style={s.muted}>
                    Confirmado por el servidor. Puede quedar fuera de los
                    filtros actuales.
                  </Text>
                  <Button
                    title="Ver registro guardado"
                    secondary
                    onPress={() => void openDetails(saved.row)}
                  />
                </View>
              )}
              <View style={s.row}>
                <Button
                  title="Actualizar"
                  secondary
                  disabled={busy || writing}
                  onPress={() => {
                    setSelected(undefined);
                    detailSerial.current++;
                    setRevision((n) => n + 1);
                  }}
                />
                {!!r.filters.length && r.key !== "enrollments" && (
                  <Button
                    title={showFilters ? "Ocultar filtros" : "Filtros"}
                    secondary
                    disabled={writing}
                    onPress={() => setShowFilters((v) => !v)}
                  />
                )}
                {r.create && canWrite && (
                  <Button
                    title={createLabels[r.key] ?? "Nuevo registro"}
                    disabled={writing || busy}
                    onPress={() => createOrEdit()}
                  />
                )}
                {r.key === "credentials" && canWrite && (
                  <Button
                    title="Emitir credencial digital"
                    icon={Plus}
                    disabled={writing || busy}
                    onPress={() =>
                      setForm({
                        title: "Emitir credencial digital",
                        fields: r.fields.filter((f) =>
                          ["employeeId", "name", "expiresAt"].includes(f.key),
                        ),
                        hint: "El servidor genera el código. La apertura con el teléfono requiere completar la integración NFC nativa y el protocolo del lector.",
                        submit: (body) =>
                          prepare({
                            title: "Emitir credencial digital",
                            resource: r,
                            path: `/credentials/digital/${id(body.employeeId)}`,
                            method: "POST",
                            body: {
                              name: body.name,
                              expiresAt: body.expiresAt,
                            },
                            onSuccess: (result) =>
                              setSaved({
                                key: r.key,
                                row: writeReceipt(r.key, result),
                              }),
                          }),
                      })
                    }
                  />
                )}
                {r.export && (
                  <Button
                    title={
                      Platform.OS === "web"
                        ? "Descargar CSV"
                        : "Compartir CSV como texto"
                    }
                    secondary
                    disabled={writing || busy}
                    onPress={() => void exportCsv()}
                  />
                )}
                {r.export && (
                  <Button
                    title="Exportar PDF"
                    secondary
                    disabled={writing || busy}
                    onPress={() => void exportCsv(true)}
                  />
                )}
                {r.key === "attendance" && (
                  <Button
                    title={report ? "Ver marcaciones" : "Reporte diario"}
                    secondary
                    disabled={writing || busy}
                    onPress={() => {
                      setPage(1);
                      setReport((v) => !v);
                      setSelected(undefined);
                    }}
                  />
                )}
              </View>
              {r.key === "enrollments" && (
                <View style={s.card}>
                  <Text style={s.heading}>Seguimiento por ID</Text>
                  <Text style={s.muted}>
                    Iniciá un enrolamiento y acercá la tarjeta al lector
                    indicado. Abrí su detalle para actualizar el estado cada 5
                    segundos mientras esté pendiente.
                  </Text>
                  <Input
                    field={{
                      key: "id",
                      label: "ID de enrolamiento",
                      type: "id",
                      required: true,
                    }}
                    value={filters.id}
                    client={client}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, id: value }))
                    }
                  />
                  <Button
                    title="Consultar enrolamiento"
                    disabled={writing}
                    onPress={() => {
                      try {
                        const value = id(filters.id);
                        setApplied({ id: value });
                        setPage(1);
                        setRevision((n) => n + 1);
                        setRecentEnrollments((current) =>
                          [value, ...current.filter((v) => v !== value)].slice(
                            0,
                            10,
                          ),
                        );
                      } catch (e) {
                        setError(errorText(e));
                      }
                    }}
                  />
                  {!!recentEnrollments.length && (
                    <>
                      <Text style={s.muted}>
                        IDs consultados en esta sesión
                      </Text>
                      <View style={s.row}>
                        {recentEnrollments.map((value) => (
                          <Button
                            key={value}
                            title={`Consultar ID ${value}`}
                            secondary
                            onPress={() => {
                              setFilters({ id: value });
                              setApplied({ id: value });
                              setRevision((n) => n + 1);
                            }}
                          />
                        ))}
                      </View>
                    </>
                  )}
                </View>
              )}
              {showFilters && r.key !== "enrollments" && (
                <View style={s.card}>
                  <View style={s.formGrid}>
                    {r.filters
                      .filter((f) => !(deviceScope && f.key === "deviceId"))
                      .map((f) => (
                        <View
                          key={f.key}
                          style={{
                            flexGrow: 1,
                            flexBasis: f.type === "datetime" ? "44%" : "100%",
                          }}
                        >
                          <Input
                            key={f.key}
                            field={f}
                            filter
                            value={filters[f.key]}
                            client={client}
                            onChange={(v) =>
                              setFilters((d) => ({ ...d, [f.key]: v }))
                            }
                          />
                        </View>
                      ))}
                  </View>
                  <View style={s.row}>
                    <Button
                      title="Aplicar filtros"
                      disabled={writing}
                      onPress={() => {
                        try {
                          queryFor(r, filters);
                          showTransition();
                          setPage(1);
                          setApplied({ ...filters });
                          setSelected(undefined);
                          detailSerial.current++;
                          setError("");
                        } catch (e) {
                          setError(errorText(e));
                        }
                      }}
                    />
                    <Button
                      title="Limpiar filtros"
                      secondary
                      disabled={writing}
                      onPress={() => {
                        setContextLabel("");
                        setDeviceScope(undefined);
                        setFilters({});
                        setApplied({});
                        setPage(1);
                      }}
                    />
                  </View>
                </View>
              )}
              {!!notice && (
                <Text accessibilityLiveRegion="polite" style={s.notice}>
                  {notice}
                </Text>
              )}
              <ErrorNotice message={error} />
              {uncertain && (
                <View style={s.card}>
                  <ErrorNotice
                    message={`No se pudo confirmar: ${uncertain.title}. Actualizá y revisá ${resource(uncertain.key).title} antes de volver a escribir.`}
                  />
                  {uncertain.key !== key ? (
                    <Button
                      title="Ir al módulo para revisar"
                      secondary
                      onPress={() => navigate(uncertain.key)}
                    />
                  ) : (
                    <Button
                      title="Ya revisé el resultado; habilitar operaciones"
                      secondary
                      disabled={!uncertain.reviewed || busy}
                      onPress={() => {
                        setUncertain(undefined);
                        setError("");
                      }}
                    />
                  )}
                </View>
              )}
              {busy ? (
                <View style={{ minHeight: 48 }} />
              ) : (
                <>
                  <Text style={s.label}>
                    {data.totalItems}{" "}
                    {report ? "resúmenes diarios" : "registros"} ·{" "}
                    {report
                      ? "Zona del reporte: configurada en el servidor"
                      : "Paginación del servidor"}
                  </Text>
                  {!data.items.length && (
                    <View style={s.card}>
                      <Text style={s.heading}>
                        {r.key === "enrollments"
                          ? "Consultar un enrolamiento"
                          : "Sin registros"}
                      </Text>
                      <Text style={s.muted}>
                        {r.key === "enrollments"
                          ? "Ingresá el ID en Seguimiento o iniciá un nuevo enrolamiento."
                          : "No hay resultados para los filtros aplicados."}
                      </Text>
                    </View>
                  )}
                  {data.items.map((row, index) => (
                    <Pressable
                      key={`${row.id ?? row.employeeId ?? index}-${row.date ?? ""}`}
                      accessibilityRole="button"
                      testID="nx-record"
                      accessibilityLabel={`Ver detalle de ${titleOf(row)}`}
                      onPress={() => void openDetails(row)}
                      style={s.card}
                    >
                      <Text style={s.heading}>{titleOf(row)}</Text>
                      <Text style={s.muted}>
                        {row.id !== undefined
                          ? `ID ${row.id}`
                          : String(row.date ?? "")}
                      </Text>
                      <View style={s.summary}>
                        {columns.slice(0, 5).map((k) => (
                          <Text key={k} style={s.text}>
                            {labels[k] ?? k}: {display(k, row[k])}
                          </Text>
                        ))}
                      </View>
                      <Text style={{ color: color.primary, fontWeight: "600" }}>
                        Ver detalle →
                      </Text>
                    </Pressable>
                  ))}
                  {r.paged && !report && (
                    <Pagination
                      data={data}
                      onPage={setPage}
                      disabled={busy || writing}
                    />
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
      {selected && !form && !pending && (
        <Sheet title={titleOf(selected)} onClose={detailClose}>
          <Details row={selected} columns={["id", ...columns]} />
          <ErrorNotice message={error} />
          {r.key === "enrollments" && selected.status === "PENDIENTE" && (
            <Text accessibilityLiveRegion="polite" style={s.muted}>
              Esperando al lector. Actualización automática cada 5 segundos.
            </Text>
          )}
          <View
            testID="nx-detail-related-actions"
            style={s.detailActionRow}
            onLayout={(event) =>
              setDetailActionWidth(event.nativeEvent.layout.width)
            }
          >
            {relatedFlows(r.key, selected, session.user.role).map((flow) => (
              <Button
                style={queryButtonStyle}
                key={flow.title}
                title={flow.title}
                secondary
                disabled={writing || !!(flow.seed && uncertain)}
                onPress={() => navigate(flow.key, flow)}
              />
            ))}
          </View>
          <View testID="nx-detail-record-actions" style={s.detailRecordActions}>
            {canWrite && r.edit && (
              <Button
                style={recordButtonStyle}
                title="Editar registro"
                onPress={() => createOrEdit(selected)}
              />
            )}
            {canWrite &&
              r.status &&
              !(r.key === "credentials" && selected.revokedAt) &&
              !(r.key === "users" && selected.id === session.user.id) && (
                <Button
                  style={recordButtonStyle}
                  title={selected.isActive ? "Desactivar" : "Activar"}
                  secondary
                  disabled={writing}
                  onPress={() =>
                    prepare({
                      title: selected.isActive
                        ? "Desactivar registro"
                        : "Activar registro",
                      resource: r,
                      path: `/${r.key}/${id(selected.id)}/status`,
                      method: "PATCH",
                      body: { isActive: !selected.isActive },
                    })
                  }
                />
              )}
            {canWrite && r.key === "credentials" && !selected.revokedAt && (
              <Button
                style={recordButtonStyle}
                title="Revocar definitivamente"
                secondary
                onPress={() =>
                  actionForm(
                    "Revocar credencial",
                    [
                      {
                        key: "reason",
                        label: "Motivo de revocación",
                        required: true,
                        min: 3,
                        max: 255,
                      },
                    ],
                    `/credentials/${id(selected.id)}/revoke`,
                  )
                }
              />
            )}
            {canWrite && r.key === "devices" && (
              <>
                <Button
                  style={recordButtonStyle}
                  title="Rotar clave del dispositivo"
                  secondary
                  onPress={() =>
                    prepare({
                      title:
                        "Rotar clave: el dispositivo deberá actualizar su configuración",
                      resource: r,
                      path: `/devices/${id(selected.id)}/rotate-key`,
                      method: "POST",
                      onSuccess: successSecret,
                    })
                  }
                />
              </>
            )}
            {r.key === "employees" &&
              ["ADMIN", "SEGURIDAD"].includes(session.user.role) &&
              !uncertain && (
                <>
                  <Button
                    style={recordButtonStyle}
                    title="Asignar rol físico"
                    onPress={() =>
                      setForm({
                        title: "Asignar rol físico",
                        fields: [
                          {
                            key: "roleId",
                            label: "Rol físico",
                            type: "id",
                            reference: "roles",
                            required: true,
                          },
                        ],
                        submit: (body) =>
                          prepare({
                            title: "Asignar rol físico",
                            resource: { ...r, write: ["ADMIN", "SEGURIDAD"] },
                            path: `/employees/${id(selected.id)}/roles/${id(body.roleId)}`,
                            method: "POST",
                          }),
                      })
                    }
                  />
                  {Array.isArray(selected.roles) &&
                    selected.roles.map((physicalRole: Row) => (
                      <Button
                        style={recordButtonStyle}
                        key={String(physicalRole.id)}
                        title={`Quitar rol: ${String(physicalRole.name ?? physicalRole.code)}`}
                        secondary
                        onPress={() =>
                          prepare({
                            title: `Quitar rol físico ${String(physicalRole.name ?? physicalRole.code)}`,
                            resource: { ...r, write: ["ADMIN", "SEGURIDAD"] },
                            path: `/employees/${id(selected.id)}/roles/${id(physicalRole.id)}`,
                            method: "DELETE",
                          })
                        }
                      />
                    ))}
                </>
              )}
            {canWrite && r.key === "users" && (
              <>
                <Button
                  style={recordButtonStyle}
                  title="Administrar acceso web / NFC"
                  icon={UserCog}
                  disabled={writing}
                  secondary
                  onPress={() =>
                    setForm({
                      title: "Administrar acceso web / NFC",
                      hint: `Perfil actual: ${String(selected.role)}. El backend permite habilitar o retirar el canal móvil, pero no cambiar el perfil ni vincular otro empleado desde esta operación.`,
                      fields: r.fields.filter((f) =>
                        ["webAccessEnabled", "mobileAccessEnabled"].includes(
                          f.key,
                        ),
                      ),
                      row: {
                        webAccessEnabled:
                          selected.webAccessEnabled ??
                          selected.role !== "EMPLEADO",
                        mobileAccessEnabled:
                          selected.mobileAccessEnabled ?? false,
                      },
                      submit: (body) =>
                        prepare({
                          title: "Guardar acceso web / NFC",
                          resource: r,
                          path: `/users/${id(selected.id)}/access`,
                          method: "PUT",
                          body: accountAccessBody(
                            body,
                            selected.role,
                            selected.employeeId,
                          ),
                        }),
                    })
                  }
                />
                <Button
                  style={recordButtonStyle}
                  title="Cambiar contraseña"
                  secondary
                  onPress={() =>
                    actionForm(
                      "Cambiar contraseña",
                      [
                        {
                          key: "newPassword",
                          label: "Nueva contraseña",
                          type: "password",
                          required: true,
                          min: 10,
                          max: 200,
                        },
                      ],
                      `/users/${id(selected.id)}/password`,
                      "PUT",
                    )
                  }
                />
              </>
            )}
            {canWrite &&
              r.key === "enrollments" &&
              selected.status === "PENDIENTE" && (
                <Button
                  style={recordButtonStyle}
                  title="Cancelar enrolamiento"
                  secondary
                  onPress={() =>
                    prepare({
                      title: "Cancelar enrolamiento",
                      resource: r,
                      path: `/enrollments/${id(selected.id)}/cancel`,
                      method: "POST",
                    })
                  }
                />
              )}
          </View>
        </Sheet>
      )}
      {form && !pending && (
        <EditForm
          form={{
            ...form,
            submit: (body) => {
              setForm((current) =>
                current ? { ...current, row: body } : current,
              );
              form.submit(body);
            },
          }}
          client={client}
          serverError={error}
          fieldErrors={serverFields}
          onClose={() => setForm(undefined)}
        />
      )}
      {pending && (
        <Sheet
          title="Confirmar operación"
          onClose={() => {
            if (!writing) setPending(undefined);
          }}
        >
          <Text style={s.heading}>{pending.title}</Text>
          <Text style={s.muted}>
            Esta acción modifica los datos del sistema. Los cambios solo se
            mostrarán cuando el servidor los confirme.
          </Text>
          {pending.body &&
            Object.entries(pending.body).map(([k, v]) => (
              <Text key={k} style={s.text}>
                {labels[k] ??
                  pending.resource.fields.find((f) => f.key === k)?.label ??
                  k}
                : {/password/i.test(k) ? "••••••••" : display(k, v)}
              </Text>
            ))}
          <ErrorNotice message={error} />
          <Button
            title={writing ? "Guardando…" : "Confirmar"}
            disabled={writing}
            onPress={() => void commit()}
          />
          <Button
            title="Volver"
            secondary
            disabled={writing}
            onPress={() => setPending(undefined)}
          />
        </Sheet>
      )}
      {secret && (
        <Sheet
          title="Clave del dispositivo"
          onClose={() => setSecret(undefined)}
        >
          <Text style={s.text}>
            Guardá esta clave en la configuración segura del dispositivo. Solo
            se muestra en esta respuesta y no se almacena en el frontend.
          </Text>
          <Text selectable style={s.secret}>
            {secret}
          </Text>
          <Button
            title="Ya guardé la clave"
            onPress={() => setSecret(undefined)}
          />
        </Sheet>
      )}
      <BusyOverlay
        active={
          (!supplemental && busy) ||
          writing ||
          (transition && !["dashboard", "alertas"].includes(key))
        }
      />
    </SafeAreaView>
  );
}

export default function ApiApp() {
  const { color, styles: s } = useDesign(makeStyles);

  const [client] = useState(() => {
    try {
      return new ApiClient(apiUrl);
    } catch {
      return undefined;
    }
  });
  const [session, setSession] = useState<Session>();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState("");
  const lock = useRef(false);
  const logout = useCallback(() => {
    client?.logout();
    setSession(undefined);
    setPassword("");
    setError("");
  }, [client]);
  useEffect(() => {
    if (!client) return;
    const unsubscribe = client.subscribeExpiration(() => {
      setSession(undefined);
      setPassword("");
      setError("La sesión venció o fue invalidada. Iniciá sesión nuevamente.");
    });
    return () => {
      unsubscribe();
      client.logout();
    };
  }, [client]);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(
      () => client?.logout(true),
      Math.min(
        Math.max(0, Date.parse(session.expiresAt) - Date.now()),
        2147483647,
      ),
    );
    return () => clearTimeout(timer);
  }, [client, session]);
  async function login() {
    if (!client || lock.current || checking) return;
    if (!username.trim() || !password) {
      setError("Ingresá tu usuario y contraseña.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setSession(await client.login(username, password));
      setPassword("");
    } catch (e) {
      setError(errorText(e));
      setPassword("");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (session && client)
    return <Workspace client={client} session={session} onLogout={logout} />;
  return (
    <SafeAreaView style={s.root}>
      <View style={s.loginTools}>
        <ThemeToggle />
      </View>
      <ScrollView
        contentContainerStyle={s.login}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.loginCard}>
          <Image
            source={require("../../assets/brand/nexaccess-logo.png")}
            accessibilityLabel="NexAccess"
            resizeMode="contain"
            style={s.loginLogo}
          />
          <Text accessibilityRole="header" style={s.title}>
            Bienvenido de nuevo
          </Text>
          <Text style={s.label}>Usuario</Text>
          <TextInput
            accessibilityLabel="Usuario"
            style={s.input}
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect={false}
            value={username}
            maxLength={100}
            onChangeText={setUsername}
            editable={!busy && !checking}
          />
          <Text style={s.label}>Contraseña</Text>
          <TextInput
            accessibilityLabel="Contraseña"
            style={s.input}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            value={password}
            maxLength={200}
            onChangeText={setPassword}
            editable={!busy && !checking}
            onSubmitEditing={() => void login()}
          />
          <ErrorNotice
            message={
              !client
                ? "Configuración de API inválida. Revisá EXPO_PUBLIC_API_URL."
                : error
            }
          />
          <Button
            title={busy ? "Iniciando sesión…" : "Iniciar sesión"}
            icon={LogIn}
            disabled={busy || checking || !client}
            onPress={() => void login()}
          />
          <Text style={s.muted}>
            Si necesitás una cuenta o restablecer tu contraseña, contactá al
            administrador.
          </Text>
          <Button
            title="Comprobar conexión"
            icon={Wifi}
            secondary
            disabled={busy || checking || !client}
            onPress={() => {
              setChecking(true);
              setHealth("Comprobando…");
              client
                ?.request("/health", { anonymous: true })
                .then((v) =>
                  setHealth(
                    (v as Row).status === "ok"
                      ? "Servicio disponible."
                      : "Respuesta de salud inesperada.",
                  ),
                )
                .catch((e) => setHealth(errorText(e)))
                .finally(() => setChecking(false));
            }}
          />
          {!!health && (
            <Text accessibilityLiveRegion="polite" style={s.muted}>
              {health}
            </Text>
          )}
          <Link
            href="/demo"
            style={{
              color: color.primary,
              paddingVertical: 14,
              textDecorationLine: "underline",
            }}
          >
            Abrir demostración con datos ficticios
          </Link>
        </View>
      </ScrollView>
      <BusyOverlay active={busy || checking} />
    </SafeAreaView>
  );
}
function makeStyles(color: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: color.bg },
    top: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: color.card,
      borderBottomWidth: 1,
      borderColor: color.border,
    },
    headerLogo: {
      width: 156,
      maxWidth: "100%",
      height: 48,
      tintColor: color.logoTint || undefined,
      borderRadius: 8,
    },
    loginLogo: {
      width: 260,
      maxWidth: "100%",
      height: 104,
      alignSelf: "center",
      tintColor: color.logoTint || undefined,
      borderRadius: 12,
    },
    title: { fontSize: 26, fontWeight: "700", color: color.ink },
    heading: { fontSize: 18, fontWeight: "600", color: color.ink },
    text: { fontSize: 15, lineHeight: 23, color: color.ink },
    muted: { fontSize: 14, lineHeight: 21, color: color.muted },
    label: { fontSize: 14, fontWeight: "600", color: color.ink },
    content: {
      padding: spacing.xl,
      gap: spacing.lg,
      width: "100%",
      maxWidth: 1200,
      alignSelf: "center",
      paddingBottom: 60,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    },
    card: {
      backgroundColor: color.card,
      padding: spacing.lg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: color.border,
      gap: spacing.md,
    },
    summary: { gap: spacing.sm, flexDirection: "row", flexWrap: "wrap" },
    navItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "transparent",
    },
    navLabel: { color: color.ink, fontSize: 14, lineHeight: 20, flexShrink: 1 },
    navActive: { backgroundColor: color.active, borderColor: color.active },
    loginTools: { alignSelf: "flex-end", padding: spacing.lg },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.lg,
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderColor: color.border,
      flexShrink: 0,
    },
    closeButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
    },
    sheetBody: { flexShrink: 1, minHeight: 0 },
    sheetContent: { gap: spacing.lg, padding: 20 },
    sheetFooter: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: spacing.sm,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderColor: color.border,
      flexShrink: 0,
    },
    detailUniformButton: { minHeight: 56, alignSelf: "stretch", flexShrink: 0 },
    detailActionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: spacing.sm,
    },
    detailRecordActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: spacing.sm,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderColor: color.border,
    },
    detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
    detailCell: {
      flexBasis: "46%",
      flexGrow: 1,
      minWidth: 200,
      gap: spacing.xs,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderColor: color.border,
    },
    detailWide: { flexBasis: "100%" },
    detailValue: {
      color: color.ink,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "500",
      alignSelf: "flex-start",
      maxWidth: "100%",
      paddingHorizontal: spacing.xs,
      borderRadius: 4,
    },
    technicalValue: {
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      fontSize: 12,
      lineHeight: 20,
      backgroundColor: color.raised,
      padding: spacing.md,
      width: "100%",
    },
    formGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md,
      alignItems: "center",
    },
    button: {
      alignSelf: "flex-start",
      maxWidth: "100%",
      flexShrink: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    primary: { backgroundColor: color.primary },
    secondary: { backgroundColor: color.soft },
    chip: {
      borderWidth: 1,
      borderColor: color.border,
      borderRadius: 12,
      padding: spacing.md,
      minHeight: 44,
      justifyContent: "center",
    },
    selected: { backgroundColor: color.soft, borderColor: color.primary },
    sidebar: {
      width: 260,
      backgroundColor: color.sidebar,
      borderRightWidth: 1,
      borderColor: color.border,
    },
    nav: { maxHeight: 80, backgroundColor: color.sidebar },
    input: {
      borderWidth: 1,
      borderColor: color.controlBorder,
      backgroundColor: color.input,
      borderRadius: 10,
      minHeight: 48,
      padding: spacing.md,
      fontSize: 16,
      color: color.ink,
    },
    invalidInput: { borderColor: color.error },
    fieldError: { color: color.error, fontSize: 13, lineHeight: 20 },
    error: {
      padding: 14,
      borderRadius: 10,
      backgroundColor: color.errorBg,
      color: color.error,
      fontSize: 14,
      lineHeight: 22,
    },
    notice: {
      padding: 14,
      borderRadius: 10,
      backgroundColor: color.soft,
      color: color.primary,
    },
    overlay: {
      flex: 1,
      backgroundColor: color.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.md,
    },
    sheet: {
      backgroundColor: color.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: color.border,
      width: "100%",
      maxWidth: 760,
      maxHeight: "85%",
      overflow: "hidden",
    },
    secret: {
      fontSize: 17,
      color: color.ink,
      backgroundColor: color.soft,
      padding: spacing.lg,
      borderRadius: 12,
    },
    login: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 22,
    },
    loginCard: {
      width: "100%",
      maxWidth: 460,
      backgroundColor: color.card,
      padding: spacing.xl,
      borderRadius: 16,
      gap: spacing.lg,
      borderWidth: 1,
      borderColor: color.border,
    },
  });
}
