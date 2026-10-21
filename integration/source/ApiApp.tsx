import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { ApiClient, ApiError, id, Page, Row, Session } from "./client";
import {
  authorize,
  bodyFor,
  checkReportSize,
  display,
  Field,
  labels,
  pageOf,
  queryFor,
  resource,
  Resource,
  resources,
} from "./resources";

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
const color = {
  bg: "#eef3f1",
  card: "#f8faf8",
  ink: "#263e45",
  muted: "#586e74",
  primary: "#286c64",
  soft: "#dcebe5",
  border: "#cedcd7",
  error: "#8e343c",
  errorBg: "#f7e8e7",
};
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
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary ? s.secondary : s.primary,
        (disabled || pressed) && { opacity: 0.55 },
      ]}
    >
      <Text
        style={{
          color: secondary ? color.primary : "#f4faf7",
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
function ErrorNotice({ message }: { message: string }) {
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
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={s.overlay}>
        <SafeAreaView style={s.sheet}>
          <View style={s.row}>
            <Text accessibilityRole="header" style={[s.title, { flex: 1 }]}>
              {title}
            </Text>
            <Button title="Cerrar" secondary onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16, paddingBottom: 30 }}
          >
            {children}
          </ScrollView>
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
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  client: ApiClient;
  filter?: boolean;
}) {
  const [lookup, setLookup] = useState(false);
  const [caption, setCaption] = useState("");
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>
        {field.label}
        {field.required && !filter ? " *" : ""}
      </Text>
      {field.type === "boolean" ? (
        <Switch
          accessibilityLabel={field.label}
          value={value === true}
          onValueChange={onChange}
          trackColor={{ true: color.primary }}
        />
      ) : field.choices ? (
        <View style={s.row}>
          {[...(filter ? [""] : []), ...field.choices].map((v) => (
            <Pressable
              key={v}
              accessibilityRole="radio"
              accessibilityState={{ checked: String(value ?? "") === v }}
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
                      : v}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <TextInput
          accessibilityLabel={field.label}
          value={String(value ?? "")}
          onChangeText={onChange}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={field.type === "password"}
          keyboardType={
            field.type === "id"
              ? "number-pad"
              : field.key === "email"
                ? "email-address"
                : "default"
          }
          maxLength={field.type === "id" ? 16 : (field.max ?? 500)}
          placeholder={
            field.type === "datetime"
              ? "2026-10-21T09:00:00-03:00"
              : field.type === "time"
                ? "08:00"
                : undefined
          }
          style={s.input}
        />
      )}
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
  submit: (body: Row) => void;
}
function EditForm({
  form,
  client,
  onClose,
}: {
  form: FormSpec;
  client: ApiClient;
  onClose: () => void;
}) {
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
  return (
    <Sheet title={form.title} onClose={onClose}>
      <Text style={s.muted}>
        Los campos con * son obligatorios. Revisá los cambios antes de
        confirmarlos.
      </Text>
      {form.fields
        .filter((f) => !form.edit || !f.createOnly)
        .map((f) => (
          <Input
            key={f.key}
            field={f}
            value={draft[f.key]}
            client={client}
            onChange={(value) => setDraft((d) => ({ ...d, [f.key]: value }))}
          />
        ))}
      <ErrorNotice message={error} />
      <Button
        title="Revisar cambios"
        onPress={() => {
          try {
            setError("");
            form.submit(bodyFor(form.fields, draft, form.edit));
          } catch (e) {
            setError(errorText(e));
          }
        }}
      />
    </Sheet>
  );
}
function Details({ row, columns }: { row: Row; columns: string[] }) {
  return (
    <View style={{ gap: 10 }}>
      {columns.map((key) => (
        <View key={key} style={{ gap: 2 }}>
          <Text style={s.muted}>{labels[key] ?? key}</Text>
          <Text selectable style={s.text}>
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
  const available = resources.filter((r) => r.read.includes(session.user.role));
  const [key, setKey] = useState("employees");
  const r = resource(key);
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
  const [uncertain, setUncertain] = useState(false);
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
  const canWrite = r.write.includes(session.user.role) && !uncertain;
  useEffect(() => {
    const serial = ++requestSerial.current;
    let current = true;
    const load = async () => {
      await Promise.resolve();
      if (!current) return emptyPage;
      setBusy(true);
      setError("");
      setData(emptyPage);
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
          if (r.key !== "enrollments" || applied.id) setUncertain(false);
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
  ]);
  function navigate(next: string) {
    if (writing) return;
    detailSerial.current++;
    setDeviceScope(undefined);
    setKey(next);
    setFilters({});
    setApplied({});
    setPage(1);
    setReport(false);
    setSelected(undefined);
    setForm(undefined);
    setPending(undefined);
    setSecret(undefined);
    setNotice("");
    setError("");
    setShowFilters(false);
  }
  function prepare(m: Mutation) {
    authorize(session.user.role, m.resource, true);
    if (uncertain)
      throw new ApiError(
        "Actualizá la lista y verificá el resultado antes de repetir una escritura.",
      );
    setPending(m);
  }
  function successSecret(result: unknown) {
    const v = result as Row;
    if (typeof v?.deviceKey === "string") setSecret(v.deviceKey);
  }
  function createOrEdit(row?: Row) {
    setForm({
      title: row
        ? `Editar ${titleOf(row)}`
        : r.key === "attendance"
          ? "Agregar marcación manual"
          : `Nuevo registro: ${r.title}`,
      fields: r.fields,
      row,
      edit: !!row,
      submit: (body) =>
        prepare({
          title: row ? "Guardar cambios" : "Crear registro",
          resource: r,
          path: `/${r.key}${row ? `/${id(row.id)}` : ""}`,
          method: row ? "PUT" : "POST",
          body,
          onSuccess: (result) => {
            successSecret(result);
            if (r.key === "enrollments") {
              const resultId = id((result as Row).id);
              setApplied({ id: resultId });
              setFilters({ id: resultId });
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
      if (
        e instanceof ApiError &&
        (["NETWORK_ERROR", "TIMEOUT"].includes(e.code) || e.status >= 500)
      ) {
        setUncertain(true);
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
  async function exportCsv() {
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
      if (Platform.OS === "web") {
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
        "Exportación generada por el servidor con los filtros aplicados.",
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
          <Text style={s.brand}>NexAccess</Text>
          <Text style={s.muted}>
            {session.user.username} · {session.user.role} · Datos del servidor
          </Text>
        </View>
        <Button title="Cerrar sesión" secondary onPress={onLogout} />
      </View>
      <View
        style={{ flex: 1, flexDirection: width >= 1000 ? "row" : "column" }}
      >
        <View style={width >= 1000 ? s.sidebar : s.nav}>
          <ScrollView
            horizontal={width < 1000}
            contentContainerStyle={{ gap: 8, padding: 12 }}
          >
            {available.map((module) => (
              <Pressable
                key={module.key}
                disabled={writing}
                accessibilityRole="button"
                accessibilityState={{
                  selected: key === module.key,
                  disabled: writing,
                }}
                onPress={() => navigate(module.key)}
                style={[s.chip, key === module.key && s.selected]}
              >
                <Text style={s.text}>{module.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text accessibilityRole="header" style={s.title}>
            {r.title}
          </Text>
          <Text style={s.muted}>{r.description}</Text>
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
            {!!r.filters.length && (
              <Button
                title={showFilters ? "Ocultar filtros" : "Filtros"}
                secondary
                disabled={writing}
                onPress={() => setShowFilters((v) => !v)}
              />
            )}
            {r.create && canWrite && (
              <Button
                title={
                  r.key === "attendance"
                    ? "Agregar marcación manual"
                    : "Nuevo registro"
                }
                disabled={writing || busy}
                onPress={() => createOrEdit()}
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
                onPress={exportCsv}
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
          {showFilters && (
            <View style={s.card}>
              {r.filters
                .filter((f) => !(deviceScope && f.key === "deviceId"))
                .map((f) => (
                  <Input
                    key={f.key}
                    field={f}
                    filter
                    value={filters[f.key]}
                    client={client}
                    onChange={(v) => setFilters((d) => ({ ...d, [f.key]: v }))}
                  />
                ))}
              <View style={s.row}>
                <Button
                  title="Aplicar filtros"
                  disabled={writing}
                  onPress={() => {
                    try {
                      queryFor(r, filters);
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
            <ErrorNotice message="No se pudo confirmar el resultado de la escritura. Actualizá y revisá los registros antes de repetirla." />
          )}
          {busy ? (
            <ActivityIndicator
              accessibilityLabel="Cargando registros"
              color={color.primary}
              size="large"
            />
          ) : (
            <>
              <Text style={s.label}>
                {data.totalItems} {report ? "resúmenes diarios" : "registros"} ·{" "}
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
                      ? "Abrí Filtros e ingresá el ID, o iniciá un nuevo enrolamiento."
                      : "No hay resultados para los filtros aplicados."}
                  </Text>
                </View>
              )}
              {data.items.map((row, index) => (
                <Pressable
                  key={`${row.id ?? row.employeeId ?? index}-${row.date ?? ""}`}
                  accessibilityRole="button"
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
          <View style={s.card}>
            <Text style={s.heading}>Funciones aún sin servicio</Text>
            <Text style={s.muted}>
              Autoservicio del empleado, notificaciones, gestión de alertas y
              preferencias institucionales requieren endpoints adicionales. No
              se generan datos simulados en esta sesión.
            </Text>
          </View>
        </ScrollView>
      </View>
      {selected && !form && !pending && (
        <Sheet title={titleOf(selected)} onClose={detailClose}>
          <Details row={selected} columns={["id", ...columns]} />
          {canWrite && r.edit && (
            <Button
              title="Editar registro"
              onPress={() => createOrEdit(selected)}
            />
          )}
          {canWrite &&
            r.status &&
            !(r.key === "credentials" && selected.revokedAt) &&
            !(r.key === "users" && selected.id === session.user.id) && (
              <Button
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
              <Button
                title="Ver eventos de este dispositivo"
                secondary
                onPress={() => {
                  const deviceId = id(selected.id);
                  detailClose();
                  setKey("access-events");
                  setDeviceScope(deviceId);
                  setFilters({ deviceId });
                  setApplied({ deviceId });
                  setPage(1);
                  setReport(false);
                }}
              />
            </>
          )}
          {r.key === "employees" &&
            ["ADMIN", "SEGURIDAD"].includes(session.user.role) &&
            !uncertain && (
              <>
                <Button
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
            <Button
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
          )}
          {canWrite &&
            r.key === "enrollments" &&
            selected.status === "PENDIENTE" && (
              <Button
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
    </SafeAreaView>
  );
}

export default function ApiApp() {
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
    if (!client || lock.current) return;
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
      <ScrollView
        contentContainerStyle={s.login}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.loginCard}>
          <Text style={s.brand}>NexAccess</Text>
          <Text accessibilityRole="header" style={s.title}>
            Bienvenido de nuevo
          </Text>
          <Text style={s.muted}>
            Control de accesos y asistencia. Ingresá con tu cuenta de operador.
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
            editable={!busy}
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
            editable={!busy}
            onSubmitEditing={() => void login()}
          />
          <ErrorNotice
            message={
              !client
                ? "Configuración de API inválida. Revisá EXPO_PUBLIC_API_URL."
                : error
            }
          />
          {busy && (
            <ActivityIndicator
              accessibilityLabel="Iniciando sesión"
              color={color.primary}
            />
          )}
          <Button
            title={busy ? "Iniciando sesión…" : "Iniciar sesión"}
            disabled={busy || !client}
            onPress={() => void login()}
          />
          <Text style={s.muted}>
            Si necesitás una cuenta o restablecer tu contraseña, contactá al
            administrador.
          </Text>
          <Button
            title="Comprobar conexión"
            secondary
            disabled={busy || !client}
            onPress={() => {
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
                .catch((e) => setHealth(errorText(e)));
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
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: {
    padding: 18,
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.card,
    borderBottomWidth: 1,
    borderColor: color.border,
  },
  brand: { fontSize: 23, fontWeight: "800", color: color.primary },
  title: { fontSize: 26, fontWeight: "700", color: color.ink },
  heading: { fontSize: 18, fontWeight: "600", color: color.ink },
  text: { fontSize: 15, lineHeight: 23, color: color.ink },
  muted: { fontSize: 14, lineHeight: 21, color: color.muted },
  label: { fontSize: 14, fontWeight: "600", color: color.ink },
  content: {
    padding: 20,
    gap: 18,
    width: "100%",
    maxWidth: 1100,
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
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: color.border,
    gap: 12,
  },
  summary: { gap: 4 },
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    padding: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  selected: { backgroundColor: color.soft, borderColor: color.primary },
  sidebar: {
    width: 245,
    backgroundColor: "#e6eeea",
    borderRightWidth: 1,
    borderColor: color.border,
  },
  nav: { maxHeight: 88, backgroundColor: "#e6eeea" },
  input: {
    borderWidth: 1,
    borderColor: "#a6bbb3",
    backgroundColor: "#f5f8f5",
    borderRadius: 10,
    minHeight: 48,
    padding: 12,
    fontSize: 16,
    color: color.ink,
  },
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
    backgroundColor: "rgba(32,55,53,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  sheet: {
    backgroundColor: color.card,
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 640,
    maxHeight: "95%",
    gap: 20,
  },
  secret: {
    fontSize: 17,
    color: color.ink,
    backgroundColor: color.soft,
    padding: 16,
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
    padding: 26,
    borderRadius: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: color.border,
  },
});
