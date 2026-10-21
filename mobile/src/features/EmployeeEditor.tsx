import { useState } from "react";
import { Text } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Employee } from "../types";
import { useDemo } from "../stores/demo";
import { FormInput, PrimaryButton, Sheet } from "../components/ui";
import { s } from "../theme";
const schema = z.object({
  name: z.string().trim().min(3, "Escribí nombre y apellido."),
  email: z.email("Ingresá un correo válido."),
  phone: z.string(),
  department: z.string(),
});
export default function EmployeeEditor({
  employee,
  onClose,
}: {
  employee?: Employee;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const save = useDemo((s) => s.saveEmployee);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: employee?.name || "",
      email: employee?.email || "",
      phone: employee?.phone || "",
      department: employee?.department || "",
    },
  });
  return (
    <Sheet
      title={employee ? "Editar empleado" : "Nuevo empleado"}
      visible
      onClose={onClose}
    >
      <Text style={s.muted}>
        Usá datos ficticios. El sector es un campo de presentación de la demo.
        La asignación de roles físicos se realiza por Seguridad o
        Administración.
      </Text>
      {(["name", "email", "phone", "department"] as const).map((name) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field }) => (
            <FormInput
              label={
                {
                  name: "Nombre y apellido",
                  email: "Correo",
                  phone: "Teléfono (opcional)",
                  department: "Sector (demo)",
                }[name]
              }
              value={field.value}
              onChangeText={field.onChange}
              error={errors[name]?.message}
              autoCapitalize={name === "email" ? "none" : "words"}
              keyboardType={
                name === "email"
                  ? "email-address"
                  : name === "phone"
                    ? "phone-pad"
                    : "default"
              }
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
        title="Guardar empleado (local)"
        onPress={handleSubmit((v) => {
          const result = save({
            ...v,
            id: employee?.id || "new",
            document: employee?.document || "No informado",
            active: employee?.active ?? true,
            accessRoleIds: employee?.accessRoleIds || [],
          });
          if (result) setError(result);
          else onClose();
        })}
      />
    </Sheet>
  );
}
