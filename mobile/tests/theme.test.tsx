import { fireEvent, render, screen, act } from "@testing-library/react-native";
import { ThemeToggle, setTheme } from "../src/api/Theme";
import CalendarField from "../src/api/CalendarField";
jest.setTimeout(20000);
afterEach(async () => {
  await act(async () => setTheme("light"));
});
test("theme toggle updates open calendar layers without changing their selected date", async () => {
  await act(async () => setTheme("light"));
  const change = jest.fn();
  await render(
    <>
      <ThemeToggle />
      <CalendarField
        label="Desde"
        value="2026-10-26T03:00:00Z"
        onChange={change}
        edge="from"
      />
    </>,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Activar modo oscuro" }),
  );
  expect(
    screen.getByRole("button", { name: "Activar modo claro" }),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "Calendario: Desde" }),
  );
  expect(
    screen.getByRole("button", { name: "Elegir 2026-10-26" }).props
      .accessibilityState.selected,
  ).toBe(true);
  expect(change).not.toHaveBeenCalled();
  await fireEvent.press(
    screen.getByRole("button", { name: "Confirmar fecha" }),
  );
  expect(change).toHaveBeenCalledWith("2026-10-26T03:00:00.000Z");
});
