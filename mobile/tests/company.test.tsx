import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import CompanySettings from "../src/api/CompanySettings";
import { ApiClient, ApiError, Session, SystemRole } from "../src/api/client";
import { getCompanyLogo } from "../src/api/company";
import { setTheme } from "../src/api/Theme";
import * as Picker from "expo-document-picker";
jest.setTimeout(20000);
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({
  File: class {
    size = 8;
    async bytes() {
      return Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    }
  },
}));
jest.mock("../src/api/company", () => ({
  ...jest.requireActual("../src/api/company"),
  getCompanyLogo: jest.fn(),
}));
const initial = {
  id: 1,
  razonSocial: "Empresa Demo S.A.",
  nombreFantasia: null,
  ruc: null,
  direccion: null,
  telefono: null,
  email: null,
  activo: true,
  tieneLogo: false,
};
const session = (role: SystemRole) =>
  ({
    user: {
      id: 1,
      username: "fixture",
      role,
      isActive: true,
      employeeId: null,
    },
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  }) as Session;
describe.each(["light", "dark"] as const)("company settings in %s", (mode) => {
  beforeEach(() => {
    setTheme(mode);
    jest.clearAllMocks();
    jest
      .mocked(getCompanyLogo)
      .mockResolvedValue("data:image/png;base64,iVBORw0KGgo=");
    jest
      .mocked(Picker.getDocumentAsync)
      .mockResolvedValue({ canceled: true, assets: null });
  });
  test("company contact fields reject letters in numeric data and block an invalid email before PUT", async () => {
    const request = jest.fn(async () => initial);
    await render(
      <CompanySettings
        client={{ request } as unknown as ApiClient}
        session={session("ADMIN")}
      />,
    );
    await screen.findByDisplayValue(initial.razonSocial);
    await fireEvent.changeText(screen.getByLabelText("Teléfono"), "123abc456");
    expect(screen.getByLabelText("Teléfono").props.value).toBe("");
    await fireEvent.changeText(
      screen.getByLabelText("Teléfono"),
      "+595 (21) 123456",
    );
    await fireEvent.changeText(screen.getByLabelText("RUC"), "ABC-1");
    expect(screen.getByLabelText("RUC").props.value).toBe("");
    await fireEvent.changeText(screen.getByLabelText("RUC"), "80000000-1");
    await fireEvent.changeText(
      screen.getByLabelText("Correo institucional"),
      "contacto@empresa",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Guardar datos de la empresa" }),
    );
    expect(
      screen.getByLabelText("Correo institucional").props["aria-invalid"],
    ).toBe(true);
    expect(request.mock.calls.some((call) => (call as unknown[])[1])).toBe(
      false,
    );
  });
  test("ADMIN configures a missing company with only documented fields", async () => {
    let configured = false;
    const request = jest.fn(
      async (_path: string, options?: { method?: string; body?: unknown }) => {
        if (options?.method === "PUT") {
          configured = true;
          return initial;
        }
        if (!configured)
          throw new ApiError("Sin empresa", 404, "EMPRESA_NOT_CONFIGURED");
        return initial;
      },
    );
    await render(
      <CompanySettings
        client={{ request } as unknown as ApiClient}
        session={session("ADMIN")}
      />,
    );
    await screen.findByText(/Configurá los datos/);
    expect(
      screen.getByRole("button", { name: "Subir logotipo" }).props
        .accessibilityState.disabled,
    ).toBe(true);
    await fireEvent.changeText(
      screen.getByLabelText("Razón social"),
      "Empresa Demo S.A.",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Guardar datos de la empresa" }),
    );
    await screen.findByText("Datos de la empresa guardados.");
    expect(request).toHaveBeenCalledWith("/empresa", {
      method: "PUT",
      body: {
        razonSocial: "Empresa Demo S.A.",
        nombreFantasia: null,
        ruc: null,
        direccion: null,
        telefono: null,
        email: null,
      },
    });
  });
  test.each(["RRHH", "SEGURIDAD"] as const)(
    "%s sees institutional data with no write controls",
    async (role) => {
      await render(
        <CompanySettings
          client={
            { request: jest.fn(async () => initial) } as unknown as ApiClient
          }
          session={session(role)}
        />,
      );
      await screen.findByText("Empresa Demo S.A.");
      expect(
        screen.queryByRole("button", { name: "Guardar datos de la empresa" }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Subir logotipo" }),
      ).toBeNull();
    },
  );
  test("uploads via logo FormData then only deletes after confirmation, retaining company fields", async () => {
    let hasLogo = false;
    const request = jest.fn(
      async (
        path: string,
        options?: { method?: string; formData?: FormData },
      ) => {
        if (options?.method === "POST") {
          expect(path).toBe("/empresa/logo");

          hasLogo = true;
        }
        if (options?.method === "DELETE") {
          hasLogo = false;
          return undefined;
        }
        return { ...initial, tieneLogo: hasLogo };
      },
    );
    jest.mocked(Picker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: "logo.png",
          lastModified: 0,
          uri: "file:///synthetic/logo.png",
          mimeType: "image/png",
          size: 8,
        },
      ],
    });
    await render(
      <CompanySettings
        client={{ request } as unknown as ApiClient}
        session={session("ADMIN")}
      />,
    );
    await screen.findByDisplayValue("Empresa Demo S.A.");
    await fireEvent.press(
      screen.getByRole("button", { name: "Subir logotipo" }),
    );
    await screen.findByText("Logotipo actualizado.");
    expect(getCompanyLogo).toHaveBeenCalled();
    await fireEvent.press(
      screen.getByRole("button", { name: "Eliminar logotipo" }),
    );
    expect(request.mock.calls.some(([, o]) => o?.method === "DELETE")).toBe(
      false,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(request.mock.calls.some(([, o]) => o?.method === "DELETE")).toBe(
      false,
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Eliminar logotipo" }),
    );
    await fireEvent.press(
      screen.getByRole("button", {
        name: "Confirmar eliminación del logotipo",
      }),
    );
    await screen.findByText(/Logotipo eliminado/);
    expect(screen.getByLabelText("Razón social").props.value).toBe(
      "Empresa Demo S.A.",
    );
  });
  test("uncertain writes block retries until a successful refresh", async () => {
    const request = jest.fn(async (_p: string, o?: { method?: string }) => {
      if (o?.method === "PUT")
        throw new ApiError("Tiempo agotado", 0, "TIMEOUT");
      return initial;
    });
    await render(
      <CompanySettings
        client={{ request } as unknown as ApiClient}
        session={session("ADMIN")}
      />,
    );
    await screen.findByDisplayValue("Empresa Demo S.A.");
    await fireEvent.press(
      screen.getByRole("button", { name: "Guardar datos de la empresa" }),
    );
    await screen.findByText(/No se pudo confirmar/);
    expect(
      screen.getByRole("button", { name: "Guardar datos de la empresa" }).props
        .accessibilityState.disabled,
    ).toBe(true);
    await fireEvent.press(
      screen.getByRole("button", { name: "Actualizar datos empresariales" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Guardar datos de la empresa" })
          .props.accessibilityState.disabled,
      ).toBe(false),
    );
  });
});
