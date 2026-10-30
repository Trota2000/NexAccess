package net.nexaccess.hce;

import java.util.Arrays;

/** Prototype protocol: static credential, no cryptographic authentication. */
public final class HceProtocol {
  public static final String AID = "F04E455841434301";
  public static final String LEGACY_AID = "F04E4558414301";
  public static final int MAX_CREDENTIAL = 160;
  public static final int CHUNK = 32;
  private static final byte[] SELECT = {0, (byte)0xA4, 4, 0, 8, (byte)0xF0, 0x4E, 0x45, 0x58, 0x41, 0x43, 0x43, 1};
  private static final byte[] LEGACY_SELECT = {0, (byte)0xA4, 4, 0, 7, (byte)0xF0, 0x4E, 0x45, 0x58, 0x41, 0x43, 1};
  private byte[] selected;

  public void reset() { selected = null; }
  private byte[] status(int code) { return new byte[] {(byte)(code >> 8), (byte)code}; }
  private boolean selects(byte[] command, byte[] expected) {
    return (command.length == expected.length || (command.length == expected.length + 1 && command[expected.length] == 0))
        && Arrays.equals(Arrays.copyOf(command, expected.length), expected);
  }
  private boolean valid(byte[] credential) {
    if (credential == null || credential.length == 0 || credential.length > MAX_CREDENTIAL) return false;
    for (byte value : credential) if ((value & 255) < 0x21 || (value & 255) > 0x7E) return false;
    return true;
  }

  public byte[] process(byte[] command, byte[] credential, boolean allowed) {
    if (command == null) return status(0x6700);
    // Companion's prototype expects the complete ASCII credential in SELECT.
    // Keep it distinct from NX01; never truncate a backend credential to fit a reader.
    if (selects(command, LEGACY_SELECT)) {
      reset();
      if (!allowed || !valid(credential)) return status(0x6985);
      byte[] response = Arrays.copyOf(credential, credential.length + 2);
      response[credential.length] = (byte)0x90;
      return response;
    }
    if (selects(command, SELECT)) {
      selected = credential == null ? null : credential.clone();
      // Recognize NexAccess even without a credential; reader must never fall back to this phone's UID.
      return new byte[] {0x4E, 0x58, 1, (byte)0x90, 0};
    }
    if (command.length != 5) return status(0x6700);
    if ((command[0] & 255) != 0x80 || (command[1] & 255) != 0xCA || command[4] != 0)
      return status(0x6D00);
    if (!allowed || !valid(selected)
        || !Arrays.equals(selected, credential)) return status(0x6985);
    int offset = ((command[2] & 255) << 8) | (command[3] & 255);
    if (offset >= selected.length || offset % CHUNK != 0) return status(0x6B00);
    int count = Math.min(CHUNK, selected.length - offset);
    byte[] response = new byte[count + 4];
    response[0] = (byte)(selected.length >> 8);
    response[1] = (byte)selected.length;
    System.arraycopy(selected, offset, response, 2, count);
    response[count + 2] = (byte)0x90;
    return response;
  }
}
