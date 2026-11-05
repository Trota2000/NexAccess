package net.nexaccess.ble;
import java.util.Arrays;
public final class BleProtocolTest {
  static void require(boolean condition){if(!condition)throw new AssertionError();}
  public static void main(String[] args){
    String code="0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";
    byte[] frame=BleProtocol.frame(code);
    require(frame.length==70 && frame[0]=='N' && frame[3]=='1' && frame[5]==64);
    require(new String(Arrays.copyOfRange(frame,6,frame.length),java.nio.charset.StandardCharsets.US_ASCII).equals(code));
    for(String invalid:new String[]{"","a b","á","x".repeat(161)}){boolean thrown=false;try{BleProtocol.frame(invalid);}catch(IllegalArgumentException e){thrown=true;}require(thrown);}
    require(BleProtocol.result(new byte[]{'N','X','A'}).equals("authorized"));
    require(BleProtocol.result(new byte[]{'N','X','D'}).equals("denied"));
    require(BleProtocol.result(new byte[]{'N','X','E'}).equals("error"));
    require(BleProtocol.result(new byte[]{'N','X','W'}).isEmpty());
    require(BleProtocol.result(new byte[]{'A'}).isEmpty());
    BleProtocol.Gate gate=new BleProtocol.Gate();
    require(!gate.accept("A",-80,10000));
    require(!gate.accept("A",-50,10100));
    require(gate.accept("A",-50,10400));
    for(int i=0;i<100;i++)require(!gate.accept("A",-50,11000+i*1000));
    require(!gate.accept("A",-80,112000));require(!gate.accept("A",-80,116000));
    require(!gate.accept("A",-50,116100));require(gate.accept("A",-50,116400));
    require(!gate.accept("A",-50,140000));require(gate.accept("A",-50,140400));
    System.out.println("BLE NXB1: exact frame, explicit decisions, proximity gate, leave/reentry OK");
  }
}
