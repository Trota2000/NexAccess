#!/usr/bin/env bash
set -euo pipefail
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT
javac -d "$temporary" plugins/nexaccess-ble/BleProtocol.java tests/native/BleProtocolTest.java
java -cp "$temporary" net.nexaccess.ble.BleProtocolTest
