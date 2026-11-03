#pragma once
#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "BleFrame.h"

// The API verification, OLED, buzzer and physical-card branch stay in main.cpp.
class NexAccessBle {
public:
  struct Request { uint32_t session; char credential[161]; };
  void begin(const char *deviceCode) {
    queue=xQueueCreate(2,sizeof(Request));
    if(!queue){Serial.println("[BLE] Sin memoria para la cola");return;}
    BLEDevice::init(String("NexAccess-")+deviceCode);
    BLEServer *server=BLEDevice::createServer();
    server->setCallbacks(new ServerCallbacks(*this));
    BLEService *service=server->createService("f04e4558-4143-4001-8000-000000000001");
    BLECharacteristic *input=service->createCharacteristic("f04e4558-4143-4001-8000-000000000002",BLECharacteristic::PROPERTY_WRITE);
    result=service->createCharacteristic("f04e4558-4143-4001-8000-000000000003",BLECharacteristic::PROPERTY_READ|BLECharacteristic::PROPERTY_NOTIFY);
    result->addDescriptor(new BLE2902());
    result->setValue("NXW"); input->setCallbacks(new InputCallbacks(*this));
    service->start();
    BLEAdvertising *advertising=BLEDevice::getAdvertising();
    advertising->addServiceUUID(service->getUUID());
    advertising->setScanResponse(true);advertising->setMinPreferred(0x06);advertising->setMaxPreferred(0x12);
    BLEDevice::startAdvertising();
    Serial.println("[BLE] NexAccess NXB1 listo");
  }
  bool receive(Request &request){return queue && xQueueReceive(queue,&request,0)==pdTRUE;}
  bool current(const Request &request)const{return connected && request.session==session;}
  void reply(const Request &request,char decision){if(current(request))notify(decision);}
private:
  QueueHandle_t queue=nullptr;
  BLECharacteristic *result=nullptr;
  NexAccessBleFrame frame;
  volatile bool connected=false;
  volatile uint32_t session=0;
  void notify(char decision) {
    if(!result || !connected)return;
    uint8_t bytes[]={'N','X',(uint8_t)decision};result->setValue(bytes,sizeof(bytes));result->notify();
  }
  class ServerCallbacks:public BLEServerCallbacks {
    NexAccessBle &owner;
  public:
    explicit ServerCallbacks(NexAccessBle &o):owner(o){}
    void onConnect(BLEServer *)override {owner.session++;owner.connected=true;owner.frame.reset();owner.result->setValue("NXW");Serial.println("[BLE] Telefono conectado");}
    void onDisconnect(BLEServer *)override {owner.connected=false;owner.session++;owner.frame.reset();BLEDevice::startAdvertising();Serial.println("[BLE] Telefono desconectado");}
  };
  class InputCallbacks:public BLECharacteristicCallbacks {
    NexAccessBle &owner;
  public:
    explicit InputCallbacks(NexAccessBle &o):owner(o){}
    void onWrite(BLECharacteristic *characteristic)override {
      const auto value=characteristic->getValue();
      const int state=owner.frame.append((const uint8_t*)value.c_str(),value.length());
      if(state<0){owner.frame.consumed=true;owner.notify('E');return;}
      if(state==1){
        Request request={};request.session=owner.session;
        memcpy(request.credential,owner.frame.data+6,owner.frame.expected-6);
        // Never make HTTPS requests or manipulate the display in a BLE callback.
        if(xQueueSend(owner.queue,&request,0)!=pdTRUE)owner.notify('E');
        memset(request.credential,0,sizeof(request.credential));
        memset(owner.frame.data,0,sizeof(owner.frame.data));
      }
    }
  };
};
