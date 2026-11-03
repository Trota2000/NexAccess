#include "../src/BleFrame.h"
#include <cassert>
#include <string>
#include <vector>

int main() {
  const std::string code(64,'A');
  std::vector<uint8_t> frame={'N','X','B','1',0,64};
  frame.insert(frame.end(),code.begin(),code.end());
  for(size_t chunk=1;chunk<=20;chunk++) {
    NexAccessBleFrame parser;
    for(size_t i=0;i<frame.size();i+=chunk) {
      const size_t count=(frame.size()-i)<chunk?frame.size()-i:chunk;
      assert(parser.append(frame.data()+i,count)==(i+count==frame.size()?1:0));
    }
    assert(parser.expected==70 && memcmp(parser.data+6,code.data(),64)==0);
    assert(parser.append(frame.data(),1)==-1);
  }
  NexAccessBleFrame parser;
  uint8_t invalid[]={'N','X','B','1',0,0};assert(parser.append(invalid,6)==-1);
  parser.reset();invalid[5]=161;assert(parser.append(invalid,6)==-1);
  parser.reset();uint8_t bad[]={'B','A','D','1',0,1,'A'};assert(parser.append(bad,7)==-1);
  parser.reset();uint8_t space[]={'N','X','B','1',0,1,' '};assert(parser.append(space,7)==-1);
  parser.reset();uint8_t extra[]={'N','X','B','1',0,1,'A','B'};assert(parser.append(extra,8)==-1);
}
