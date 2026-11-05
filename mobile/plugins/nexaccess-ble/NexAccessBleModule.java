package net.nexaccess.ble;

import android.bluetooth.*;
import android.content.*;
import android.content.pm.PackageManager;
import com.facebook.react.bridge.*;
import com.facebook.react.common.LifecycleState;

public final class NexAccessBleModule extends ReactContextBaseJavaModule implements LifecycleEventListener {
  NexAccessBleModule(ReactApplicationContext context){super(context);context.addLifecycleEventListener(this);BleStore.foreground=context.getLifecycleState()==LifecycleState.RESUMED;}
  @Override public String getName(){return "NexAccessBle";}
  @Override public void onHostResume(){BleStore.foreground=true;}
  @Override public void onHostPause(){BleStore.foreground=false;}
  @Override public void onHostDestroy(){BleStore.foreground=false;}
  @Override public void invalidate(){BleStore.foreground=false;getReactApplicationContext().removeLifecycleEventListener(this);super.invalidate();}
  @ReactMethod public void getState(Promise promise){
    try{
      ReactApplicationContext c=getReactApplicationContext();
      BluetoothManager manager=(BluetoothManager)c.getSystemService(Context.BLUETOOTH_SERVICE);
      BluetoothAdapter adapter=manager==null?null:manager.getAdapter();
      boolean available=adapter!=null && c.getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE);
      boolean permission=NexAccessBleService.permitted(c);
      WritableMap value=Arguments.createMap();
      value.putBoolean("available",available);value.putBoolean("permissions",permission);
      value.putBoolean("bluetoothOn",available && permission && adapter.isEnabled());
      value.putBoolean("enabled",BleStore.prefs(c).getBoolean("enabled",false));
      value.putBoolean("running",NexAccessBleService.running);
      value.putBoolean("prepared",!BleStore.credential(c).isEmpty());
      value.putString("mode",BleStore.prefs(c).getString("mode","foreground"));
      value.putString("status",BleStore.prefs(c).getString("status","idle"));
      value.putString("message",!available?"Este teléfono no admite Bluetooth LE.":BleStore.prefs(c).getString("message","Activá Bluetooth para presentar tu tarjeta automáticamente."));
      promise.resolve(value);
    }catch(Exception e){promise.reject("BLE_STATE","No se pudo consultar Bluetooth.",e);}
  }
  private void start(){
    Context c=getReactApplicationContext();
    Intent intent=new Intent(c,NexAccessBleService.class);
    c.startForegroundService(intent);
  }
  @ReactMethod public void setEnabled(boolean enabled,Promise promise){
    try{
      ReactApplicationContext c=getReactApplicationContext();
      if(enabled){
        if(!BleStore.foreground)throw new IllegalStateException("Abrí NexAccess para activar Bluetooth.");
        if(!NexAccessBleService.permitted(c))throw new IllegalStateException("Concedé los permisos de Bluetooth.");
        BluetoothManager manager=(BluetoothManager)c.getSystemService(Context.BLUETOOTH_SERVICE);
        if(manager==null || manager.getAdapter()==null || !manager.getAdapter().isEnabled())throw new IllegalStateException("Activá Bluetooth en los ajustes del teléfono.");
        if(BleStore.credential(c).isEmpty())throw new IllegalStateException("Primero prepará una tarjeta digital vinculada a este teléfono.");
      }
      if(!BleStore.prefs(c).edit().putBoolean("enabled",enabled).commit())throw new IllegalStateException("No se pudo guardar la preferencia Bluetooth.");
      if(enabled)start();else {c.stopService(new Intent(c,NexAccessBleService.class));BleStore.state(c,"idle","Acceso Bluetooth desactivado.");}
      promise.resolve(null);
    }catch(Exception e){BleStore.prefs(getReactApplicationContext()).edit().putBoolean("enabled",false).apply();promise.reject("BLE_ENABLE",e.getMessage(),e);}
  }
  @ReactMethod public void setMode(String mode,Promise promise){
    if(!"foreground".equals(mode) && !"unlocked".equals(mode) && !"always".equals(mode)){promise.reject("BLE_MODE","Modo Bluetooth inválido.");return;}
    if(BleStore.prefs(getReactApplicationContext()).edit().putString("mode",mode).commit())promise.resolve(null);
    else promise.reject("BLE_STORE","No se pudo guardar el modo Bluetooth.");
  }
  @ReactMethod public void configureCredential(double id,String credential,double expires,Promise promise){
    try{
      BleProtocol.frame(credential);
      if(id<=0 || (expires>0 && expires<=System.currentTimeMillis()))throw new IllegalArgumentException();
      Context c=getReactApplicationContext();
      if(!BleStore.prefs(c).edit().putString("credential",credential).putLong("credentialId",(long)id).putLong("expires",(long)expires).commit())throw new IllegalStateException();
      promise.resolve(null);
    }catch(Exception e){promise.reject("BLE_CREDENTIAL","No se pudo preparar la credencial Bluetooth.",e);}
  }
  @ReactMethod public void disableCredential(Promise promise){
    Context c=getReactApplicationContext();
    if(!BleStore.prefs(c).edit().remove("credential").remove("credentialId").remove("expires").putBoolean("enabled",false).commit()){
      promise.reject("BLE_STORE","No se pudo desactivar la tarjeta Bluetooth.");return;
    }
    c.stopService(new Intent(c,NexAccessBleService.class));BleStore.state(c,"idle","Acceso Bluetooth desactivado.");promise.resolve(null);
  }
}
