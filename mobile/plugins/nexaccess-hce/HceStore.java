package net.nexaccess.hce;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.PowerManager;
import java.nio.charset.StandardCharsets;

final class HceStore {
  static volatile boolean foreground = false;
  static SharedPreferences prefs(Context c) { return c.getSharedPreferences("nexaccess.hce.prototype.v1", Context.MODE_PRIVATE); }
  static byte[] credential(Context c) {
    SharedPreferences p = prefs(c);
    long expiry = p.getLong("expires", 0);
    if (expiry > 0 && System.currentTimeMillis() >= expiry) return null;
    String code = p.getString("credential", "");
    return code.isEmpty() ? null : code.getBytes(StandardCharsets.US_ASCII);
  }
  static boolean allowed(Context c) {
    String mode = prefs(c).getString("mode", "unlocked");
    KeyguardManager keyguard = (KeyguardManager)c.getSystemService(Context.KEYGUARD_SERVICE);
    PowerManager power = (PowerManager)c.getSystemService(Context.POWER_SERVICE);
    boolean unlocked = keyguard != null && !keyguard.isDeviceLocked() && power != null && power.isInteractive();
    return "always".equals(mode) || (unlocked && ("unlocked".equals(mode) || foreground));
  }
}
