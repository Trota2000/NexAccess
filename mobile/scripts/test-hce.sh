#!/usr/bin/env bash
set -euo pipefail
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT
javac -d "$temporary" plugins/nexaccess-hce/HceProtocol.java tests/native/HceProtocolTest.java
java -cp "$temporary" net.nexaccess.hce.HceProtocolTest
