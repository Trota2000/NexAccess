package net.nexaccess.hce;

import android.content.pm.PackageManager;
import android.nfc.NfcAdapter;
import android.os.Build;
import com.facebook.react.bridge.*;
import com.facebook.react.common.LifecycleState;

public final class NexAccessHceModule extends ReactContextBaseJavaModule implements LifecycleEventListener {
  NexAccessHceModule(ReactApplicationContext context) {
    super(context);
    context.addLifecycleEventListener(this);
    HceStore.foreground = context.getLifecycleState() == LifecycleState.RESUMED;
  }
  @Override public String getName() { return "NexAccessHce"; }
  @Override public void onHostResume() { HceStore.foreground = true; }
  @Override public void onHostPause() { HceStore.foreground = false; }
  @Override public void onHostDestroy() { HceStore.foreground = false; }
  @Override public void invalidate() {
    HceStore.foreground = false;
    getReactApplicationContext().removeLifecycleEventListener(this);
    super.invalidate();
  }
  @ReactMethod public void getCapabilities(Promise promise) {
    try {
      ReactApplicationContext c = getReactApplicationContext();
      NfcAdapter adapter = NfcAdapter.getDefaultAdapter(c);
      boolean available = adapter != null && c.getPackageManager().hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION);
      WritableMap result = Arguments.createMap();
      result.putBoolean("available", available);
      result.putBoolean("enabled", available && adapter.isEnabled());
      // This means the mode can be requested, not guaranteed screen-off operation.
      result.putBoolean("alwaysAvailable", available);
      boolean secure = adapter != null && Build.VERSION.SDK_INT >= 29 && adapter.isSecureNfcEnabled();
      result.putString("reason", !available ? "Este teléfono no admite emulación NFC HCE."
        : !adapter.isEnabled() ? "Activá NFC en los ajustes del teléfono."
        : secure ? "NFC seguro está activado: Android puede exigir desbloquear el teléfono."
        : "Lector compatible requerido. El modo bloqueado depende de Android; pantalla apagada no garantizada.");
      promise.resolve(result);
    } catch (Exception e) { promise.reject("NFC_CAPABILITIES", "No se pudo comprobar NFC.", e); }
  }
  @ReactMethod public void setMode(String mode, Promise promise) {
    if (!"foreground".equals(mode) && !"unlocked".equals(mode) && !"always".equals(mode)) {
      promise.reject("NFC_MODE", "Modo NFC inválido."); return;
    }
    if (HceStore.prefs(getReactApplicationContext()).edit().putString("mode", mode).commit()) promise.resolve(null);
    else promise.reject("NFC_STORE", "No se pudo guardar el modo NFC.");
  }
  @ReactMethod public void configureCredential(double id, String credential, double expires, Promise promise) {
    if (id <= 0 || credential == null || !credential.matches("[\\x21-\\x7E]{1,160}")
        || (expires > 0 && expires <= System.currentTimeMillis())) {
      promise.reject("NFC_CREDENTIAL", "La credencial NFC no es válida o está vencida."); return;
    }
    if (HceStore.prefs(getReactApplicationContext()).edit().putString("credential", credential)
        .putLong("credentialId", (long)id).putLong("expires", (long)expires).commit()) promise.resolve(null);
    else promise.reject("NFC_STORE", "No se pudo preparar NFC.");
  }
  @ReactMethod public void disableCredential(Promise promise) {
    if (HceStore.prefs(getReactApplicationContext()).edit().remove("credential").remove("credentialId").remove("expires").commit()) promise.resolve(null);
    else promise.reject("NFC_STORE", "No se pudo desactivar NFC.");
  }
}
