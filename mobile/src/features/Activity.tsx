import { useState } from "react";
import { Text, View } from "react-native";
import { format, isValid, parseISO } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDemo } from "../stores/demo";
import { today } from "../data/mocks";
import { dateKey } from "../utils/domain";
import { AccessEventCard, AttendanceCard } from "../components/cards";
import {
  Choice,
  DateRangePicker,
  EmptyState,
  FilterSheet,
  FormInput,
  PrimaryButton,
  ScreenContainer,
  SearchInput,
  Sheet,
  StatCard,
} from "../components/ui";
import { Calendar } from "./Personal";
import { s } from "../theme";
const schema = z.object({
  employeeId: z.string().min(1, "Seleccioná un empleado."),
  type: z.enum(["ENTRADA", "SALIDA"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usá AAAA-MM-DD."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usá HH:mm."),
  note: z.string().trim().min(3, "Indicá el motivo (mínimo 3 caracteres)."),
});
export function ManualAttendance() {
  const { data, correct } = useDemo();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: "e1",
      type: "ENTRADA" as "ENTRADA" | "SALIDA",
      date: today(),
      time: format(new Date(), "HH:mm"),
      note: "",
    },
  });
  const save = () => {
    const v = getValues();
    const at = parseISO(`${v.date}T${v.time}:00`);
    const message = !isValid(at)
      ? "Fecha inválida."
      : correct({
          employeeId: v.employeeId,
          type: v.type,
          at: at.toISOString(),
          note: v.note,
        });
    setConfirm(false);
    if (message) setError(message);
    else {
      setOpen(false);
      reset();
      setSuccess("Marcación manual agregada solo en este dispositivo.");
    }
  };
  return (
    <>
      <PrimaryButton
        title="Agregar corrección manual"
        onPress={() => {
          setOpen(true);
          setError("");
          setSuccess("");
        }}
      />
      {!!success && (
        <Text accessibilityRole="alert" style={s.text}>
          {success}
        </Text>
      )}
      <Sheet
        title={confirm ? "Confirmar marcación" : "Corrección manual"}
        visible={open}
        onClose={() => setOpen(false)}
      >
        {confirm ? <>
          <Text style={s.text}>{`${data.employees.find(e=>e.id===getValues('employeeId'))?.name} · ${getValues('type')} · ${getValues('date')} ${getValues('time')}\nMotivo: ${getValues('note')}\nSe guardará como simulación local.`}</Text>
          <PrimaryButton title="Confirmar" onPress={save}/>
          <PrimaryButton title="Cancelar" secondary onPress={()=>setConfirm(false)}/>
        </> : <>
        <Text style={s.muted}>
          Una nueva marcación justificada. No modifica ni elimina registros
          anteriores.
        </Text>
        <Controller
          control={control}
          name="employeeId"
          render={({ field }) => (
            <Choice
              label="Empleado"
              value={field.value}
              options={data.employees
                .filter((e) => e.active)
                .map((e) => ({ value: e.id, label: e.name }))}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Choice
              label="Tipo"
              value={field.value}
              onChange={field.onChange}
              options={["ENTRADA", "SALIDA"].map((value) => ({
                value,
                label: value,
              }))}
            />
          )}
        />
        {(["date", "time", "note"] as const).map((name) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field }) => (
              <FormInput
                label={
                  name === "date"
                    ? "Fecha (AAAA-MM-DD)"
                    : name === "time"
                      ? "Hora (HH:mm)"
                      : "Motivo obligatorio"
                }
                value={field.value}
                onChangeText={field.onChange}
                error={errors[name]?.message}
                multiline={name === "note"}
              />
            )}
          />
        ))}
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        <PrimaryButton
          title="Revisar corrección"
          onPress={handleSubmit(() => setConfirm(true))}
        />
        </>}
      </Sheet>
    </>
  );
}
export default function Activity({
  attendance = false,
  general = false,
}: {
  attendance?: boolean;
  general?: boolean;
}) {
  const { data, user, compact } = useDemo();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState("all");
  const [area, setArea] = useState("all");
  const [employee, setEmployee] = useState("all");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(false);
  if (!user) return null;
  const rangeError =
    (from && (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !isValid(parseISO(from)))) ||
    (to && (!/^\d{4}-\d{2}-\d{2}$/.test(to) || !isValid(parseISO(to))))
      ? "Usá fechas válidas con formato AAAA-MM-DD."
      : from && to && from > to
        ? "La fecha inicial debe ser anterior a la final."
        : "";
  const matches = (r: { employeeId: string; at: string }) =>
    (general || r.employeeId === user.employeeId) &&
    (employee === "all" || r.employeeId === employee) &&
    (!from || dateKey(r.at) >= from) &&
    (!to || dateKey(r.at) <= to) &&
    (!query ||
      data.employees
        .find((e) => e.id === r.employeeId)
        ?.name.toLowerCase()
        .includes(query.toLowerCase()));
  const records = data.attendance
    .filter(matches)
    .filter((r) => result === "all" || r.type === result)
    .sort((a, b) => b.at.localeCompare(a.at));
  const events = data.events
    .filter(matches)
    .filter(
      (e) =>
        (result === "all" || e.result === result) &&
        (area === "all" || e.areaId === area),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  const daily = data.attendance.filter(
    (r) =>
      (general || r.employeeId === user.employeeId) &&
      dateKey(r.at) === today(),
  );
  return (
    <ScreenContainer
      title={
        attendance
          ? general
            ? "Asistencia general"
            : "Mi asistencia"
          : general
            ? "Historial general"
            : "Mis accesos"
      }
      back={attendance || general}
    >
      {attendance && (
        <>
          <View style={s.wrap}>
            <StatCard
              label="Entradas hoy"
              value={daily.filter((r) => r.type === "ENTRADA").length}
            />
            <StatCard
              label="Salidas hoy"
              value={daily.filter((r) => r.type === "SALIDA").length}
            />
          </View>
          {general && <ManualAttendance />}
          <Calendar
            records={data.attendance.filter(
              (r) => general || r.employeeId === user.employeeId,
            )}
            onSelect={(day) => {
              setFrom(day);
              setTo(day);
            }}
          />
        </>
      )}
      {general && <SearchInput value={query} onChangeText={setQuery} />}
      <PrimaryButton
        secondary
        title={`Filtros${from || to || result !== "all" || area !== "all" || employee !== "all" ? " · activos" : ""}`}
        onPress={() => setFilters(true)}
      />
      {!!rangeError && (
        <Text accessibilityRole="alert" style={s.error}>
          {rangeError}
        </Text>
      )}
      <Text style={s.muted}>
        {rangeError ? 0 : attendance ? records.length : events.length} registros
        · Ordenados del más reciente
      </Text>
      {!rangeError &&
        (attendance
          ? records.map((r) => (
              <View
                key={r.id}
                style={compact ? { marginBottom: -10 } : undefined}
              >
                <AttendanceCard record={r} />
              </View>
            ))
          : events.map((e) => <AccessEventCard key={e.id} event={e} />))}
      {!rangeError && !(attendance ? records.length : events.length) && (
        <EmptyState />
      )}
      <FilterSheet
        title="Filtrar registros"
        visible={filters}
        onClose={() => setFilters(false)}
      >
        <DateRangePicker from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <Choice
          label={attendance ? "Tipo" : "Resultado"}
          value={result}
          onChange={setResult}
          options={[
            { value: "all", label: "Todos" },
            ...(attendance
              ? ["ENTRADA", "SALIDA"]
              : ["AUTORIZADO", "RECHAZADO"]
            ).map((value) => ({ value, label: value })),
          ]}
        />
        {!attendance && (
          <Choice
            label="Área"
            value={area}
            onChange={setArea}
            options={[
              { value: "all", label: "Todas" },
              ...data.areas.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        )}
        {general && (
          <Choice
            label="Empleado"
            value={employee}
            onChange={setEmployee}
            options={[
              { value: "all", label: "Todos" },
              ...data.employees.map((e) => ({ value: e.id, label: e.name })),
            ]}
          />
        )}
        <PrimaryButton
          title="Ver resultados"
          onPress={() => setFilters(false)}
        />
        <PrimaryButton
          title="Limpiar filtros"
          secondary
          onPress={() => {
            setFrom("");
            setTo("");
            setResult("all");
            setArea("all");
            setEmployee("all");
            setQuery("");
          }}
        />
      </FilterSheet>
      <Text style={s.muted}>
        {attendance
          ? "Se muestran marcaciones registradas, sin cálculos de tardanzas, horas extras o salarios."
          : "Historial de solo lectura. Identificadores de credenciales enmascarados."}
      </Text>
    </ScreenContainer>
  );
}
