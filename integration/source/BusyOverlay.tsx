import { Colors, useDesign, useReducedMotion } from "./Theme";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  View,
} from "react-native";
const loadingLogo = require("../../assets/brand/nexaccess-symbol.png");
export default function BusyOverlay({ active }: { active: boolean }) {
  const { color, styles: s } = useDesign(makeStyles);

  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(active);
  const started = useRef(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (active) {
      started.current = Date.now();
      timer = setTimeout(() => setVisible(true), 0);
    } else
      timer = setTimeout(
        () => setVisible(false),
        Math.max(0, 320 - (Date.now() - started.current)),
      );
    return () => clearTimeout(timer);
  }, [active]);
  if (!visible && !active) return null;
  return (
    <Modal
      transparent
      visible
      animationType={reduced ? "none" : "fade"}
      onRequestClose={() => {}}
      statusBarTranslucent
    >
      <View
        accessibilityViewIsModal
        accessibilityRole="progressbar"
        accessibilityLabel="Cargando proceso"
        accessibilityLiveRegion="polite"
        style={s.overlay}
      >
        <View style={s.center}>
          <ActivityIndicator
            animating={!reduced}
            size={84}
            color={color.primary}
          />
          <View pointerEvents="none" style={s.logo}>
            <Image
              source={loadingLogo}
              resizeMode="contain"
              accessibilityLabel="Símbolo de NexAccess"
              style={{ width: 126, height: 50 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
function makeStyles(color: Colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: color.loadingOverlay,
    },
    center: {
      width: 104,
      height: 104,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 24,
      backgroundColor: color.logoSurface,
    },
    logo: {
      position: "absolute",
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
