import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { ShieldCheck, Eye, EyeOff } from "lucide-react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Choice,
  FormInput,
  PrimaryButton,
  ScreenContainer,
  Sheet,
} from "../components/ui";
import { useDemo } from "../stores/demo";
import { roleNames } from "../data/mocks";
import { SystemRole } from "../types";
import { s, tokens } from "../theme";
const schema = z.object({
  username: z.string().trim().min(1, "Ingresá tu usuario."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});
export default function Login() {
  const [role, setRole] = useState<SystemRole>("EMPLEADO");
  const [visible, setVisible] = useState(false);
  const [recover, setRecover] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const login = useDemo((s) => s.login);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: "empleado", password: "" },
  });
  const submit = handleSubmit(async (values) => {
    setBusy(true);
    setError("");
    await new Promise((r) => setTimeout(r, 450));
    if (!login(values.username, values.password, role))
      setError("Usuario o contraseña incorrectos para este perfil.");
    setBusy(false);
  });
  return (
    <ScreenContainer title="NexAccess">
      <View style={{ paddingVertical: 22, gap: 12 }}>
        <View
          style={{
            backgroundColor: tokens.color.soft,
            padding: 18,
            borderRadius: 22,
            alignSelf: "flex-start",
          }}
        >
          <ShieldCheck size={36} color={tokens.color.primary} />
        </View>
        <Text style={s.title}>Tu jornada, a mano.</Text>
        <Text style={s.text}>
          Credenciales, accesos y asistencia en un solo lugar.
        </Text>
      </View>
      <Choice
        label="Perfil de demostración"
        value={role}
        onChange={(v) => {
          setRole(v as SystemRole);
          setValue("username", v.toLowerCase());
          setError("");
        }}
        options={Object.entries(roleNames).map(([value, label]) => ({
          value,
          label,
        }))}
      />
      <Controller
        control={control}
        name="username"
        render={({ field }) => (
          <FormInput
            label="Usuario"
            autoCapitalize="none"
            autoComplete="username"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.username?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <View style={{ gap: 8 }}>
            <FormInput
              label="Contraseña"
              autoCapitalize="none"
              secureTextEntry={!visible}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.password?.message}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                visible ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              onPress={() => setVisible(!visible)}
              style={[s.row, { minHeight: 44 }]}
            >
              {visible ? (
                <EyeOff color={tokens.color.primary} />
              ) : (
                <Eye color={tokens.color.primary} />
              )}
              <Text style={s.text}>
                {visible ? "Ocultar" : "Mostrar"} contraseña
              </Text>
            </Pressable>
          </View>
        )}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <PrimaryButton title="Iniciar sesión" loading={busy} onPress={submit} />
      <PrimaryButton
        title="¿Olvidaste tu contraseña?"
        secondary
        onPress={() => setRecover(true)}
      />
      <Text style={s.muted}>
        Demo independiente · Contraseña de prueba: NexAccess2026! No ingreses
        credenciales reales.
      </Text>
      <Sheet
        title="Recuperación de contraseña"
        visible={recover}
        onClose={() => setRecover(false)}
      >
        <Text style={s.text}>
          Esta función es una vista de demostración. No se envían correos ni se
          cambia ninguna contraseña. En una integración futura, contactá al
          administrador de tu institución.
        </Text>
        <PrimaryButton title="Entendido" onPress={() => setRecover(false)} />
      </Sheet>
    </ScreenContainer>
  );
}
