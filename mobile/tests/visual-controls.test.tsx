import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import CalendarField from "../src/api/CalendarField";
import MetricChart from "../src/api/MetricChart";
import BusyOverlay from "../src/api/BusyOverlay";
test("calendar selection emits the inclusive end of the day and can be cleared", async () => {
  const change = jest.fn();
  await render(
    <CalendarField
      label="Hasta"
      value="2026-10-25T03:00:00Z"
      onChange={change}
      edge="to"
    />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Calendario: Hasta" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Elegir 2026-10-26" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Confirmar fecha" }),
  );
  expect(change).toHaveBeenCalledWith("2026-10-27T02:59:59.999Z");
  await fireEvent.press(screen.getByRole("button", { name: "Limpiar Hasta" }));
  expect(change).toHaveBeenCalledWith("");
});
test("calendar cancellation does not change the applied value", async () => {
  const change = jest.fn();
  await render(
    <CalendarField
      label="Desde"
      value="2026-10-26T03:00:00Z"
      onChange={change}
      edge="from"
    />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Calendario: Desde" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Mes siguiente" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Cerrar calendario" }),
  );
  expect(change).not.toHaveBeenCalled();
});
test("chart checkboxes hide series and allow an explicit empty selection", async () => {
  await render(
    <MetricChart
      metrics={[
        { label: "Accesos", key: "access-events", query: {}, value: 7 },
      ]}
    />,
  );
  const checkbox = screen.getByRole("checkbox", { name: "Mostrar Accesos" });
  expect(checkbox.props.accessibilityState.checked).toBe(true);
  await fireEvent.press(checkbox);
  expect(screen.getByText("Seleccioná al menos un indicador.")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("checkbox", { name: "Mostrar Accesos" }),
  );
  expect(screen.getByLabelText("Accesos: 7")).toBeTruthy();
});
test("loader is visible only during a process and exits after completion", async () => {
  const { rerender } = await render(<BusyOverlay active />);
  expect(screen.getByLabelText("Cargando proceso")).toBeTruthy();
  await rerender(<BusyOverlay active={false} />);
  await waitFor(() =>
    expect(screen.queryByLabelText("Cargando proceso")).toBeNull(),
  );
});
test('chart selection survives changing the calendar period labels',async()=>{
 const {rerender}=await render(<MetricChart metrics={[{label:'Accesos · 24 h',key:'access-events',query:{result:'RECHAZADO'},value:3}]}/>);
 await fireEvent.press(screen.getByRole('checkbox',{name:'Mostrar Accesos · 24 h'}));
 await rerender(<MetricChart metrics={[{label:'Accesos · período',key:'access-events',query:{result:'RECHAZADO'},value:8}]}/>);
 expect(screen.getByRole('checkbox',{name:'Mostrar Accesos · período'}).props.accessibilityState.checked).toBe(false);
});
