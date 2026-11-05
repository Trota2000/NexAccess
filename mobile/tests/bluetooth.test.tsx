import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import BluetoothAccess from "../src/personal/BluetoothAccess";
import { bluetooth, BluetoothState } from "../src/personal/bluetooth";
jest.mock("../src/personal/bluetooth", () => ({
  bluetooth: { state: jest.fn(), enable: jest.fn(), setMode: jest.fn() },
}));
const base: BluetoothState = {
  available: true,
  permissions: true,
  bluetoothOn: true,
  enabled: false,
  running: false,
  prepared: true,
  mode: "foreground",
  status: "idle",
  message: "Activá Bluetooth.",
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(bluetooth.state).mockResolvedValue({ ...base });
});
test("Bluetooth is opt-in; enabling is explicit and no authorization is fabricated", async () => {
  await render(<BluetoothAccess />);
  const toggle = await screen.findByLabelText(
    "Activar acceso Bluetooth automático",
  );
  await waitFor(() => expect(toggle.props.disabled).toBe(false));
  expect(bluetooth.enable).not.toHaveBeenCalled();
  await fireEvent(toggle, "valueChange", true);
  await waitFor(() => expect(bluetooth.enable).toHaveBeenCalledWith(true));
  expect(screen.queryByText("Acceso autorizado por el lector.")).toBeNull();
});
test("missing credential blocks enabling and unavailable native module remains explicit", async () => {
  jest.mocked(bluetooth.state).mockResolvedValue({ ...base, prepared: false });
  const view = await render(<BluetoothAccess />);
  await waitFor(() =>
    expect(
      screen.getByLabelText("Activar acceso Bluetooth automático").props
        .disabled,
    ).toBe(true),
  );
  expect(
    await screen.findByText(
      "Actualizá Mi tarjeta y seleccioná una credencial vinculada a este teléfono.",
    ),
  ).toBeTruthy();
  await view.unmount();
  jest.mocked(bluetooth.state).mockResolvedValue({
    ...base,
    available: false,
    message: "Instalá el APK Bluetooth.",
  });
  await render(<BluetoothAccess />);
  expect(await screen.findByText("Instalá el APK Bluetooth.")).toBeTruthy();
  expect(bluetooth.enable).not.toHaveBeenCalled();
});
test("permission/start failures are displayed without enabling a fake service", async () => {
  jest.mocked(bluetooth.enable).mockRejectedValue(new Error("Faltan permisos"));
  await render(<BluetoothAccess />);
  const toggle = await screen.findByLabelText(
    "Activar acceso Bluetooth automático",
  );
  await waitFor(() => expect(toggle.props.disabled).toBe(false));
  await fireEvent(toggle, "valueChange", true);
  expect(await screen.findByText("Faltan permisos")).toBeTruthy();
});
