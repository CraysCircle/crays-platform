#!/bin/bash
# SOURCE ONLY. Root executes ONLY after reviewing the previous exact simulation.
set -euo pipefail
test "$(id -u)" = 0
apt_scope=/var/tmp/crays-public-tls19-apt01
test -d "$apt_scope/lists"
test -s "$apt_scope/INSTALL_SIMULATION.public.txt"
apt_options=(
 -o "Dir::Etc::sourcelist=$apt_scope/ubuntu.sources"
 -o "Dir::Etc::sourceparts=-"
 -o "Dir::Etc::main=-"
 -o "Dir::Etc::parts=-"
 -o "Dir::State::lists=$apt_scope/lists"
 -o "Dir::Cache::archives=$apt_scope/archives"
 -o Acquire::Languages=none
 -o Acquire::ForceIPv4=true
 -o Acquire::Retries=0
 -o Acquire::https::Timeout=20
 -o Acquire::https::Verify-Peer=true
 -o Acquire::https::Verify-Host=true
 -o Acquire::Check-Valid-Until=true
 -o DPkg::Lock::Timeout=0
)
env -u APT_CONFIG DEBIAN_FRONTEND=noninteractive /usr/bin/apt-get "${apt_options[@]}" --assume-yes --no-install-recommends --no-upgrade --no-remove install python3-acme=2.9.0-1 python3-josepy=1.14.0-1
/usr/bin/dpkg-query -W '-f=${Package}\t${Version}\t${db:Status-Status}\n' python3-acme python3-josepy python3-rfc3339
# No ACME/account/key/challenge invocation.
