package net.nexaccess.ble;

import android.Manifest;
import android.app.*;
import android.bluetooth.*;
import android.bluetooth.le.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.*;
import java.util.Arrays;
import java.util.Collections;

/** All BLE work is native, including when JS is suspended. No HTTP secrets here. */
public final class NexAccessBleService extends Service {
  private static final String CHANNEL="nexaccess-ble";
  static final String STOP="net.nexaccess.ble.STOP";
  private final Handler handler=new Handler(Looper.getMainLooper());
  private final BleProtocol.Gate gate=new BleProtocol.Gate();
  private BluetoothAdapter adapter;
  private BluetoothLeScanner scanner;
  private BluetoothGatt gatt;
  private BluetoothGattCharacteristic writer;
  private boolean scanning=false,finished=false;
  private byte[] frame;
  private int offset=0;
  private long resumeAt=0;
  static volatile boolean running=false;

  static boolean permitted(Context c) {
    if(Build.VERSION.SDK_INT>=31) return c.checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN)==PackageManager.PERMISSION_GRANTED
      && c.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)==PackageManager.PERMISSION_GRANTED;
    return c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED;
  }
  @Override public IBinder onBind(Intent intent){return null;}
  @Override public void onCreate(){
    super.onCreate();
    BluetoothManager manager=(BluetoothManager)getSystemService(BLUETOOTH_SERVICE);
    adapter=manager==null?null:manager.getAdapter();
  }
  @Override public int onStartCommand(Intent intent,int flags,int startId) {
    if((intent!=null && STOP.equals(intent.getAction())) || !BleStore.prefs(this).getBoolean("enabled",false)) {
      BleStore.prefs(this).edit().putBoolean("enabled",false).apply(); stopSelf(); return START_NOT_STICKY;
    }
    if(!permitted(this)){BleStore.state(this,"error","Faltan permisos de dispositivos cercanos.");stopSelf();return START_NOT_STICKY;}
    NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
    nm.createNotificationChannel(new NotificationChannel(CHANNEL,"Acceso Bluetooth",NotificationManager.IMPORTANCE_LOW));
    Intent launch=getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent open=launch==null?null:PendingIntent.getActivity(this,0,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    PendingIntent stop=PendingIntent.getService(this,1,new Intent(this,NexAccessBleService.class).setAction(STOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    Notification notification=new Notification.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
      .setContentTitle("NexAccess · Acceso Bluetooth").setContentText("Detección automática activada. Tocá para abrir.")
      .setContentIntent(open).setOngoing(true).addAction(new Notification.Action.Builder(android.R.drawable.ic_media_pause,"Detener",stop).build()).build();
    try {
      if(Build.VERSION.SDK_INT>=29)startForeground(7201,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
      else startForeground(7201,notification);
    } catch(Exception e) {BleStore.state(this,"error","Android no permitió iniciar Bluetooth. Abrí la app y volvé a activarlo.");stopSelf();return START_NOT_STICKY;}
    running=true;handler.removeCallbacks(tick);handler.post(tick);return START_STICKY;
  }
  private final Runnable tick=new Runnable(){public void run(){
    try {
      if(!BleStore.prefs(NexAccessBleService.this).getBoolean("enabled",false)){stopSelf();return;}
      if(!permitted(NexAccessBleService.this) || adapter==null || !adapter.isEnabled()) {
        stopScan();closeGatt();BleStore.state(NexAccessBleService.this,"bluetooth_off","Activá Bluetooth y concedé los permisos.");
      } else if(BleStore.credential(NexAccessBleService.this).isEmpty()) {
        stopScan();closeGatt();BleStore.state(NexAccessBleService.this,"credential_missing","Actualizá Mi tarjeta para preparar una credencial activa.");
      } else if(!BleStore.allowed(NexAccessBleService.this)) {
        stopScan();closeGatt();BleStore.state(NexAccessBleService.this,"paused","Bluetooth en pausa por el modo de uso seleccionado.");
      } else if(gatt==null && !scanning && SystemClock.elapsedRealtime()>=resumeAt)startScan();
    }catch(Exception e){stopScan();closeGatt();BleStore.state(NexAccessBleService.this,"error","No se pudo usar Bluetooth. Desactivá y volvé a activar esta opción.");}
    handler.postDelayed(this,1000);
  }};
  private void startScan(){
    scanner=adapter.getBluetoothLeScanner();if(scanner==null)return;
    scanner.startScan(Collections.singletonList(new ScanFilter.Builder().setServiceUuid(new ParcelUuid(BleProtocol.SERVICE)).build()),
      new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(),scan);
    scanning=true;BleStore.state(this,"searching","Buscando un lector NexAccess cercano…");
  }
  private void stopScan(){
    if(scanning && scanner!=null)try{scanner.stopScan(scan);}catch(Exception ignored){}
    scanning=false;
  }
  private final ScanCallback scan=new ScanCallback(){
    @Override public void onScanResult(int type,ScanResult result){handler.post(()->{
      try{
        if(!scanning || gatt!=null || !BleStore.allowed(NexAccessBleService.this))return;
        String address=result.getDevice().getAddress();
        if(!gate.accept(address,result.getRssi(),SystemClock.elapsedRealtime()))return;
        stopScan();frame=BleProtocol.frame(BleStore.credential(NexAccessBleService.this));offset=0;finished=false;
        BleStore.state(NexAccessBleService.this,"connecting","Lector cercano detectado. Conectando…");
        gatt=result.getDevice().connectGatt(NexAccessBleService.this,false,callbacks,BluetoothDevice.TRANSPORT_LE);
        handler.postDelayed(timeout,20000);
      }catch(Exception e){finish("error","No se pudo conectar con el lector.");}
    });}
    @Override public void onScanFailed(int code){handler.post(()->{scanning=false;resumeAt=SystemClock.elapsedRealtime()+10000;BleStore.state(NexAccessBleService.this,"error","Android detuvo la búsqueda Bluetooth. Reintentando…");});}
  };
  private final Runnable timeout=()->finish("error","El lector no confirmó el resultado. Volvé a acercarte.");
  private boolean current(BluetoothGatt candidate){return gatt==candidate && !finished;}
  private final BluetoothGattCallback callbacks=new BluetoothGattCallback(){
    @Override public void onConnectionStateChange(BluetoothGatt g,int status,int state){handler.post(()->{
      if(!current(g))return;
      if(status!=BluetoothGatt.GATT_SUCCESS || state==BluetoothProfile.STATE_DISCONNECTED){finish("error","Se perdió la conexión con el lector.");return;}
      if(state==BluetoothProfile.STATE_CONNECTED && !g.discoverServices())finish("error","No se pudieron consultar los servicios del lector.");
    });}
    @Override public void onServicesDiscovered(BluetoothGatt g,int status){handler.post(()->{
      if(!current(g))return;
      BluetoothGattService service=g.getService(BleProtocol.SERVICE);
      writer=service==null?null:service.getCharacteristic(BleProtocol.WRITE);
      BluetoothGattCharacteristic result=service==null?null:service.getCharacteristic(BleProtocol.RESULT);
      BluetoothGattDescriptor descriptor=result==null?null:result.getDescriptor(BleProtocol.CCC);
      if(status!=BluetoothGatt.GATT_SUCCESS || writer==null || descriptor==null || !g.setCharacteristicNotification(result,true)){
        finish("error","El lector no implementa el protocolo Bluetooth NexAccess NXB1.");return;
      }
      descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
      if(!g.writeDescriptor(descriptor))finish("error","No se pudo activar la respuesta del lector.");
    });}
    @Override public void onDescriptorWrite(BluetoothGatt g,BluetoothGattDescriptor descriptor,int status){handler.post(()->{
      if(!current(g))return;
      if(status!=BluetoothGatt.GATT_SUCCESS){finish("error","El lector no aceptó las notificaciones.");return;}
      sendChunk();
    });}
    @Override public void onCharacteristicWrite(BluetoothGatt g,BluetoothGattCharacteristic characteristic,int status){handler.post(()->{
      if(!current(g))return;
      if(status!=BluetoothGatt.GATT_SUCCESS){finish("error","No se pudo presentar la tarjeta al lector.");return;}
      if(offset<frame.length)sendChunk();else BleStore.state(NexAccessBleService.this,"verifying","Tarjeta presentada. Esperando autorización del servidor…");
    });}
    @Override public void onCharacteristicChanged(BluetoothGatt g,BluetoothGattCharacteristic characteristic){received(g,characteristic.getUuid(),characteristic.getValue());}
    @Override public void onCharacteristicChanged(BluetoothGatt g,BluetoothGattCharacteristic characteristic,byte[] value){received(g,characteristic.getUuid(),value);}
  };
  private void received(BluetoothGatt g,java.util.UUID uuid,byte[] value){
    if(!BleProtocol.RESULT.equals(uuid))return;
    final byte[] copy=value==null?null:value.clone();handler.post(()->{
      if(!current(g) || frame==null || offset<frame.length || !sameCredential())return;
      String result=BleProtocol.result(copy);if(result.isEmpty())return;
      finish(result,"authorized".equals(result)?"Acceso autorizado por el lector.":"denied".equals(result)?"Acceso rechazado por el lector.":"El lector no pudo verificar el acceso con el servidor.");
    });
  }
  private void sendChunk(){
    if(gatt==null || writer==null || frame==null)return;
    if(!BleStore.allowed(this) || !sameCredential()){finish("error","La tarjeta ya no está disponible para este modo.");return;}
    byte[] part=Arrays.copyOfRange(frame,offset,Math.min(offset+20,frame.length));offset+=part.length;
    writer.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);writer.setValue(part);
    if(!gatt.writeCharacteristic(writer))finish("error","No se pudo enviar la tarjeta al lector.");
  }
  private boolean sameCredential(){
    String code=BleStore.credential(this);
    return frame!=null && !code.isEmpty() && Arrays.equals(frame,BleProtocol.frame(code));
  }
  private void finish(String status,String message){
    if(finished)return;finished=true;handler.removeCallbacks(timeout);closeGatt();
    resumeAt=SystemClock.elapsedRealtime()+5000;BleStore.state(this,status,message);
  }
  private void closeGatt(){
    handler.removeCallbacks(timeout);
    BluetoothGatt old=gatt;gatt=null;writer=null;frame=null;
    if(old!=null){try{old.disconnect();}catch(Exception ignored){}try{old.close();}catch(Exception ignored){}}
  }
  @Override public void onDestroy(){handler.removeCallbacksAndMessages(null);stopScan();closeGatt();running=false;super.onDestroy();}
}
