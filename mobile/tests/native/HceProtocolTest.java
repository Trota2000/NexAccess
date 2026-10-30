package net.nexaccess.hce;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public final class HceProtocolTest {
  static byte[] select = {0, (byte)0xA4, 4, 0, 8, (byte)0xF0, 0x4E, 0x45, 0x58, 0x41, 0x43, 0x43, 1, 0};
  static byte[] read(int offset) { return new byte[] {(byte)0x80, (byte)0xCA, (byte)(offset >> 8), (byte)offset, 0}; }
  static void require(boolean condition) { if (!condition) throw new AssertionError(); }
  static int status(byte[] response) { return ((response[response.length-2] & 255) << 8) | (response[response.length-1] & 255); }
  public static void main(String[] args) {
    HceProtocol p = new HceProtocol();
    byte[] code = new byte[160]; Arrays.fill(code, (byte)'A');
    require(status(p.process(read(0), code, true)) == 0x6985);
    require(Arrays.equals(p.process(select, code, true), new byte[]{0x4E,0x58,1,(byte)0x90,0}));
    for (int offset = 0; offset < code.length; offset += 32) {
      byte[] response = p.process(read(offset), code, true);
      require(response.length == 36 && (response[1] & 255) == 160 && status(response) == 0x9000);
      require(Arrays.equals(Arrays.copyOfRange(response,2,34), Arrays.copyOfRange(code,offset,offset+32)));
    }
    require(status(p.process(read(160), code, true)) == 0x6B00);
    require(status(p.process(read(1), code, true)) == 0x6B00);
    require(status(p.process(read(0), code, false)) == 0x6985);
    require(status(p.process(read(0), null, true)) == 0x6985);
    require(status(p.process(read(0), "CHANGED".getBytes(StandardCharsets.US_ASCII), true)) == 0x6985);
    p.reset(); require(status(p.process(read(0), code, true)) == 0x6985);
    byte[] shortCode = "SHORT".getBytes(StandardCharsets.US_ASCII);
    p.process(select, shortCode, true);
    require(p.process(read(0), shortCode, true).length == 9);
    require(status(p.process(new byte[]{0}, code, true)) == 0x6700);
    require(status(p.process(new byte[]{0,1,0,0,0}, code, true)) == 0x6D00);
    System.out.println("HCE protocol: selection, chunks, revocation, modes and malformed commands OK");
  }
}
