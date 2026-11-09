#!/bin/bash
# SOURCE ONLY. Root finite window; no install. One exclusive public-metadata APT namespace.
set -euo pipefail
test "$(id -u)" = 0
apt_scope=/var/tmp/crays-public-tls19-apt01
mkdir -m0755 "$apt_scope"
mkdir -m0755 "$apt_scope/lists" "$apt_scope/archives"
cat >"$apt_scope/ubuntu.sources" <<'UBUNTU_SOURCES'
Types: deb
URIs: https://archive.ubuntu.com/ubuntu
Suites: noble noble-updates
Components: main universe
Architectures: amd64
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: https://security.ubuntu.com/ubuntu
Suites: noble-security
Components: main universe
Architectures: amd64
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
UBUNTU_SOURCES
chmod 0444 "$apt_scope/ubuntu.sources"
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
env -u APT_CONFIG /usr/bin/apt-get "${apt_options[@]}" update
env -u APT_CONFIG /usr/bin/apt-get "${apt_options[@]}" --simulate --no-install-recommends --no-upgrade --no-remove install python3-acme=2.9.0-1 python3-josepy=1.14.0-1 | tee "$apt_scope/INSTALL_SIMULATION.public.txt"
# STOP. Root inspects the exact Inst/Conf/removal/upgrade set before the separate install.
