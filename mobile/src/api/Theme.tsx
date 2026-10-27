import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AccessibilityInfo,
  Appearance,
  Platform,
  Pressable,
  Text,
} from "react-native";
import { Moon, Sun } from "lucide-react-native";
import palettes from "./design-tokens.json";
export type Mode = "light" | "dark";
export type Colors = typeof palettes.light;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const themeStorageKey = "nexaccess.theme";
let current: Mode | undefined;
let explicit = false;
const listeners = new Set<() => void>();
function initial(): Mode {
  if (current) return current;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(themeStorageKey);
    } catch {
      /* Storage can be unavailable in private browsing. */
    }
    explicit = saved === "light" || saved === "dark";
    current = explicit
      ? (saved as Mode)
      : window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  } else current = Appearance.getColorScheme() === "dark" ? "dark" : "light";
  return current;
}
function apply(mode: Mode) {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  apply(initial());
  const system =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.matchMedia?.("(prefers-color-scheme: dark)")
      : undefined;
  const update = () => {
    if (!explicit) {
      current = system
        ? system.matches
          ? "dark"
          : "light"
        : Appearance.getColorScheme() === "dark"
          ? "dark"
          : "light";
      apply(current);
      listeners.forEach((fn) => fn());
    }
  };
  system?.addEventListener("change", update);
  const native =
    Platform.OS !== "web" ? Appearance.addChangeListener(update) : undefined;
  const storage = (event: StorageEvent) => {
    if (event.key !== themeStorageKey) return;
    explicit = event.newValue === "light" || event.newValue === "dark";
    current = explicit
      ? (event.newValue as Mode)
      : system?.matches
        ? "dark"
        : "light";
    apply(current);
    listeners.forEach((fn) => fn());
  };
  if (Platform.OS === "web" && typeof window !== "undefined")
    window.addEventListener("storage", storage);
  return () => {
    listeners.delete(listener);
    system?.removeEventListener("change", update);
    native?.remove();
    if (Platform.OS === "web" && typeof window !== "undefined")
      window.removeEventListener("storage", storage);
  };
}
export function setTheme(mode: Mode) {
  current = mode;
  explicit = true;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(themeStorageKey, mode);
    } catch {
      /* Theme still changes without storage. */
    }
  }
  apply(mode);
  listeners.forEach((fn) => fn());
}
export function useTheme() {
  const mode = useSyncExternalStore(subscribe, initial, () => "light" as Mode);
  return {
    mode,
    color: palettes[mode],
    toggle: () => setTheme(mode === "dark" ? "light" : "dark"),
  };
}
export function useDesign<T>(factory: (color: Colors) => T) {
  const { color } = useTheme();
  const styles = useMemo(() => factory(color), [factory, color]);
  return { color, styles };
}
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    Platform.OS === "web" && typeof window !== "undefined"
      ? !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      const update = () => setReduced(!!query?.matches);
      query?.addEventListener("change", update);
      return () => query?.removeEventListener("change", update);
    }
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduced(v);
    });
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return reduced;
}
export function ThemeToggle() {
  const { mode, color, toggle } = useTheme();
  const label = mode === "light" ? "Activar modo oscuro" : "Activar modo claro";
  const Icon = mode === "light" ? Moon : Sun;
  const tooltip = Platform.OS === "web" ? { title: label } : {};
  return (
    <Pressable
      {...tooltip}
      testID="nx-theme-toggle"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Cambia únicamente los colores de la interfaz"
      onPress={toggle}
      style={{
        minHeight: 44,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: color.soft,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Icon size={18} color={color.primary} />
      <Text style={{ color: color.primary, fontSize: 13, fontWeight: "600" }}>
        {mode === "light" ? "Oscuro" : "Claro"}
      </Text>
    </Pressable>
  );
}
