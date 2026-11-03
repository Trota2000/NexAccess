package net.nexaccess.ble;

import android.content.Context;
import android.content.SharedPreferences;
import android.app.KeyguardManager;
import android.os.PowerManager;

final class BleStore {
  static volatile boolean foreground=false;
  static SharedPreferences prefs(Context c) {return c.getSharedPreferences("nexaccess.ble.prototype.v1", Context.MODE_PRIVATE);}
  static String credential(Context c) {
    SharedPreferences p=prefs(c); long expires=p.getLong("expires",0);
    return expires>0 && expires<=System.currentTimeMillis() ? "" : p.getString("credential","");
  }
  static boolean allowed(Context c) {
    String mode=prefs(c).getString("mode","foreground");
    if("always".equals(mode))return true;
    KeyguardManager lock=(KeyguardManager)c.getSystemService(Context.KEYGUARD_SERVICE);
    PowerManager power=(PowerManager)c.getSystemService(Context.POWER_SERVICE);
    boolean unlocked=lock!=null && !lock.isDeviceLocked() && power!=null && power.isInteractive();
    return unlocked && ("unlocked".equals(mode) || foreground);
  }
  static void state(Context c,String status,String message) {
    prefs(c).edit().putString("status",status).putString("message",message).apply();
  }
}
