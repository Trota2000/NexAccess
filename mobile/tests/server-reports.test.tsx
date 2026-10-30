import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import ServerReports from "../src/api/ServerReports";
import { ApiClient, Row, Session, SystemRole } from "../src/api/client";
import { downloadReport } from "../src/api/reportDownload";
import { setTheme } from "../src/api/Theme";
jest.mock("../src/api/reportDownload", () => ({
  downloadReport: jest.fn(async () => {}),
}));
const options = {
  reports: [
    {
      type: "Attendance",
      name: "Reporte de asistencia",
      description: "Marcaciones",
      formats: ["Json", "Pdf"],
      filters: [
        "from",
        "to",
        "employeeIds",
        "deviceIds",
        "attendanceTypes",
        "attendanceSources",
      ],
      groupBy: ["Employee", "Day"],
      columns: ["occurredAt", "employeeName"],
    },
    {
      type: "AccessEvents",
      name: "Reporte de accesos",
      formats: ["Json", "Pdf"],
      filters: ["from", "to", "areaIds", "deviceIds", "accessResults"],
      groupBy: ["Area", "Day"],
      columns: ["result"],
    },
  ],
  filterValues: {
    attendanceTypes: ["Entrada", "Salida"],
    attendanceSources: ["Dispositivo", "Manual"],
    accessResults: ["Autorizado", "Rechazado"],
  },
  maxReportDays: 366,
  supportsSummary: true,
  supportsDetails: true,
};
function setup(role: SystemRole = "ADMIN") {
  const request = jest.fn(
    async (
      path: string,
      _args?: { method?: string; body?: Row; pdf?: boolean },
    ) => {
      if (path === "/reports/options") return options;
      if (path === "/reports/devices")
        return {
          items: [{ id: 4, code: "P-01", name: "Portón" }],
          total: 1,
          page: 1,
          pageSize: 20,
        };
      if (path === "/reports/generate") return { fixture: "download" };
      return { items: [], totalItems: 0, page: 1, pageSize: 20 };
    },
  );
  const client = { request } as unknown as ApiClient;
  const session = {
    user: {
      id: 1,
      username: "fixture",
      role,
      isActive: true,
      employeeId: null,
    },
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  } as Session;
  return { request, client, session };
}
describe.each(["light", "dark"] as const)("server reports in %s", (mode) => {
  beforeEach(() => {
    setTheme(mode);
    jest.clearAllMocks();
  });
  test("options, paged reader selection and PDF use the server contract", async () => {
    const { client, session, request } = setup();
    await render(<ServerReports client={client} session={session} />);
    await screen.findByRole("radio", { name: "Reporte de asistencia" });
    await fireEvent.press(
      screen.getByRole("button", { name: "Lectores: todos" }),
    );
    await fireEvent.press(
      await screen.findByRole("checkbox", { name: "Seleccionar Portón" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Listo" }));
    await fireEvent.press(
      screen.getByRole("checkbox", { name: "Agrupar por Empleado" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Descargar reporte" }),
    );
    await waitFor(() =>
      expect(downloadReport).toHaveBeenCalledWith(
        { fixture: "download" },
        "PDF",
      ),
    );
    expect(
      request.mock.calls.find(([p]) => p === "/reports/generate")?.[1],
    ).toMatchObject({
      method: "POST",
      pdf: true,
      body: {
        type: "ATTENDANCE",
        format: "PDF",
        deviceIds: [4],
        groupBy: ["EMPLOYEE"],
      },
    });
  });
  test("report type changes clear incompatible filters and JSON uses the same generation route", async () => {
    const { client, session, request } = setup();
    await render(<ServerReports client={client} session={session} />);
    await fireEvent.press(
      await screen.findByRole("checkbox", { name: "Manual" }),
    );
    await fireEvent.press(
      screen.getByRole("radio", { name: "Reporte de accesos" }),
    );
    expect(screen.queryByRole("checkbox", { name: "Manual" })).toBeNull();
    await fireEvent.press(screen.getByRole("checkbox", { name: "Rechazado" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Formato JSON" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Descargar reporte" }),
    );
    await waitFor(() =>
      expect(downloadReport).toHaveBeenCalledWith(
        { fixture: "download" },
        "JSON",
      ),
    );
    expect(
      request.mock.calls.find(([p]) => p === "/reports/generate")?.[1]?.body,
    ).toMatchObject({
      type: "ACCESS_EVENTS",
      attendanceSources: [],
      accessResults: ["RECHAZADO"],
    });
  });
  test("both summary and detail disabled blocks generation", async () => {
    const { client, session, request } = setup("RRHH");
    await render(<ServerReports client={client} session={session} />);
    await screen.findByRole("radio", { name: "Reporte de asistencia" });
    expect(
      screen.queryByRole("radio", { name: "Reporte de accesos" }),
    ).toBeNull();
    await fireEvent(
      screen.getByLabelText("Incluir resumen"),
      "valueChange",
      false,
    );
    await fireEvent(
      screen.getByLabelText("Incluir detalle"),
      "valueChange",
      false,
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Descargar reporte" }),
    );
    await screen.findByText("Incluí el resumen o el detalle del reporte.");
    expect(request.mock.calls.some(([p]) => p === "/reports/generate")).toBe(
      false,
    );
  });
});
