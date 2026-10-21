import { fireEvent, render, screen } from "@testing-library/react-native";
import Login from "../src/features/Login";
import Management from "../src/features/Management";
import { useDemo } from "../src/stores/demo";
import { makeDemo } from "../src/data/mocks";
beforeEach(() => useDemo.setState({ data: makeDemo(), user: undefined }));
test("login valida campos y no muestra registro público", async () => {
  await render(<Login />);
  await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
  expect(await screen.findByText("Ingresá tu contraseña.")).toBeTruthy();
  expect(screen.queryByText("Registrarse")).toBeNull();
}, 20000);
test("oculta y muestra la contraseña", async () => {
  await render(<Login />);
  expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(true);
  await fireEvent.press(screen.getByLabelText("Mostrar contraseña"));
  expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(false);
});
test("bloquea consulta administrativa por enlace directo a un empleado", async () => {
  useDemo.getState().login("empleado", "NexAccess2026!", "EMPLEADO");
  await render(<Management resource="audit" />);
  expect(
    screen.getByText("Tu perfil no tiene acceso a este módulo."),
  ).toBeTruthy();
  expect(screen.queryByText("Usuario responsable")).toBeNull();
});
test("buscador muestra estado vacío cuando no hay coincidencias", async () => {
  useDemo.getState().login("rrhh", "NexAccess2026!", "RRHH");
  await render(<Management resource="employees" />);
  await fireEvent.changeText(screen.getByLabelText("Buscar"), "NoExiste999");
  expect(screen.getByText("No hay registros para estos filtros.")).toBeTruthy();
});
