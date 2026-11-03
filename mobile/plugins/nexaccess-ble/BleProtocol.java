package net.nexaccess.ble;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** NXB1 prototype: peripheral ESP32, Android central, no credential in advertising. */
public final class BleProtocol {
  public static final UUID SERVICE = UUID.fromString("f04e4558-4143-4001-8000-000000000001");
  public static final UUID WRITE = UUID.fromString("f04e4558-4143-4001-8000-000000000002");
  public static final UUID RESULT = UUID.fromString("f04e4558-4143-4001-8000-000000000003");
  public static final UUID CCC = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
  public static byte[] frame(String credential) {
    if (credential == null || !credential.matches("[\\x21-\\x7E]{1,160}")) throw new IllegalArgumentException("Invalid credential");
    byte[] code = credential.getBytes(StandardCharsets.US_ASCII);
    byte[] frame = new byte[code.length + 6];
    frame[0]='N'; frame[1]='X'; frame[2]='B'; frame[3]='1';
    frame[4]=(byte)(code.length >> 8); frame[5]=(byte)code.length;
    System.arraycopy(code, 0, frame, 6, code.length);
    return frame;
  }
  public static String result(byte[] bytes) {
    if (bytes == null || bytes.length != 3 || bytes[0]!='N' || bytes[1]!='X') return "";
    return bytes[2]=='A' ? "authorized" : bytes[2]=='D' ? "denied" : bytes[2]=='E' ? "error" : "";
  }
  /** RSSI is a heuristic, not a distance measurement. Rearm after leaving. */
  public static final class Gate {
    private final Map<String, Seen> devices = new HashMap<>();
    private static final class Seen { long last, first, weak; int hits; boolean latched; }
    public boolean accept(String address, int rssi, long now) {
      Seen s=devices.get(address);
      if(s==null) {
        if(devices.size()>=64) devices.clear();
        s=new Seen(); devices.put(address,s);
      }
      if(now-s.last>15000) {s.latched=false;s.hits=0;s.weak=0;}
      s.last=now;
      if(rssi < -68) {
        if(s.weak==0) s.weak=now;
        if(now-s.weak>=3000) {s.latched=false;s.hits=0;}
        return false;
      }
      s.weak=0;
      if(s.latched || rssi < -58) return false;
      if(s.hits==0 || now-s.first>2500) {s.first=now;s.hits=1;return false;}
      if(now-s.first<150) return false;
      s.hits++;
      if(s.hits<2) return false;
      s.latched=true; return true;
    }
  }
}
