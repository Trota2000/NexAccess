package net.nexaccess.hce;

import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;

public final class NexAccessHceService extends HostApduService {
  private final HceProtocol protocol = new HceProtocol();
  @Override public byte[] processCommandApdu(byte[] command, Bundle extras) {
    return protocol.process(command, HceStore.credential(this), HceStore.allowed(this));
  }
  @Override public void onDeactivated(int reason) { protocol.reset(); }
}
