#pragma once
#include <stddef.h>
#include <stdint.h>
#include <string.h>

// Independent of Arduino/BLE, so malformed/fragmented frames can be unit tested.
struct NexAccessBleFrame {
  uint8_t data[166] = {};
  size_t size = 0;
  size_t expected = 0;
  bool consumed = false;
  void reset() { memset(data, 0, sizeof(data)); size=0; expected=0; consumed=false; }
  // -1 invalid, 0 incomplete, 1 complete. Only one request per connection.
  int append(const uint8_t *bytes, size_t count) {
    if(consumed || count==0 || count>20 || size+count>sizeof(data))return -1;
    memcpy(data+size,bytes,count);size+=count;
    if(size>=4 && memcmp(data,"NXB1",4)!=0)return -1;
    if(size>=6) {
      expected=6+((size_t)data[4]<<8)+data[5];
      if(expected<7 || expected>sizeof(data) || size>expected)return -1;
      for(size_t i=6;i<size;i++)if(data[i]<0x21 || data[i]>0x7e)return -1;
      if(size==expected){consumed=true;return 1;}
    }
    return 0;
  }
};
