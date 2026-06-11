#!/usr/bin/env bash

# Read-only BantuBuzz VPS readiness audit.
# This script intentionally does not install, start, stop, or modify anything.

set +e

AUDIT_VERSION="2026-06-11.2"

section() {
  printf '\n\n============================================================\n'
  printf '%s\n' "$1"
  printf '============================================================\n'
}

run_if_available() {
  command_name="$1"
  shift
  if command -v "$command_name" >/dev/null 2>&1; then
    "$command_name" "$@" 2>&1
  else
    printf '%s is not installed\n' "$command_name"
  fi
}

section "AUDIT METADATA"
printf 'Audit version: %s\n' "$AUDIT_VERSION"
date --iso-8601=seconds 2>/dev/null || date
printf 'Hostname: '
hostname
printf 'Public target: 13.140.159.150\n'
printf 'User: '
id
printf 'Virtualization: '
systemd-detect-virt 2>/dev/null || printf 'unknown\n'

section "OPERATING SYSTEM"
cat /etc/os-release 2>/dev/null
uname -a
printf '\nUptime:\n'
uptime

section "CPU, MEMORY, AND DISK"
printf '%s\n' "-- CPU --"
lscpu 2>/dev/null | grep -E '^(Architecture|CPU\(s\)|Model name|Thread|Core|Socket|Virtualization):'
printf '\n%s\n' "-- Memory --"
free -h 2>/dev/null
printf '\n%s\n' "-- Filesystems --"
df -hT 2>/dev/null
printf '\n%s\n' "-- Block devices --"
lsblk -o NAME,SIZE,FSTYPE,TYPE,MOUNTPOINTS 2>/dev/null
printf '\n%s\n' "-- Inodes --"
df -ih 2>/dev/null

section "NETWORK AND DNS"
printf '%s\n' "-- Addresses --"
ip -brief address 2>/dev/null
printf '\n%s\n' "-- Routes --"
ip route 2>/dev/null
printf '\n%s\n' "-- Resolver --"
grep -vE '^[[:space:]]*(#|$)' /etc/resolv.conf 2>/dev/null
printf '\n%s\n' "-- Listening ports --"
ss -lntup 2>/dev/null
printf '\n%s\n' "-- DNS currently published for BantuBuzz --"
getent ahostsv4 bantubuzz.com 2>/dev/null | head -5
getent ahostsv4 app.bantubuzz.com 2>/dev/null | head -5

section "FIREWALL AND SECURITY"
printf '%s\n' "-- UFW --"
run_if_available ufw status verbose
printf '\n%s\n' "-- firewalld --"
if command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --state 2>&1
  firewall-cmd --list-all 2>&1
else
  printf 'firewalld is not installed\n'
fi
printf '\n%s\n' "-- nftables ruleset summary --"
if command -v nft >/dev/null 2>&1; then
  nft list ruleset 2>/dev/null | head -200
else
  printf 'nft is not installed\n'
fi
printf '\n%s\n' "-- SSH configuration summary --"
sshd -T 2>/dev/null | grep -E '^(port|permitrootlogin|passwordauthentication|pubkeyauthentication|maxauthtries|allowusers|allowgroups) '
printf '\n%s\n' "-- Fail2ban --"
systemctl is-enabled fail2ban 2>/dev/null
systemctl is-active fail2ban 2>/dev/null

section "AVAILABLE SOFTWARE"
for binary in apache2 nginx python3 pip3 node npm pm2 psql pg_dump redis-server redis-cli meilisearch git curl tar certbot docker; do
  if command -v "$binary" >/dev/null 2>&1; then
    printf '%-16s %s\n' "$binary" "$(command -v "$binary")"
  else
    printf '%-16s missing\n' "$binary"
  fi
done

printf '\n%s\n' "-- Versions --"
apache2 -v 2>/dev/null | head -2
nginx -v 2>&1
python3 --version 2>&1
pip3 --version 2>&1
node --version 2>&1
npm --version 2>&1
pm2 --version 2>&1
psql --version 2>&1
redis-server --version 2>&1
meilisearch --version 2>&1
git --version 2>&1
certbot --version 2>&1
docker --version 2>&1

section "SERVICE STATE"
printf '%s\n' "-- Relevant installed service units --"
systemctl list-unit-files --type=service --no-pager 2>/dev/null |
  grep -Ei 'apache|nginx|postgres|redis|meilisearch|gunicorn|bantubuzz|node|pm2|docker|fail2ban' || true
printf '\n%s\n' "-- Relevant running services --"
systemctl list-units --type=service --state=running --no-pager 2>/dev/null |
  grep -Ei 'apache|nginx|postgres|redis|meilisearch|gunicorn|bantubuzz|node|pm2|docker|fail2ban' || true
printf '\n%s\n' "-- Failed services --"
systemctl --failed --no-pager 2>/dev/null

section "WEB SERVER CONFIGURATION"
printf '%s\n' "-- Apache modules --"
apache2ctl -M 2>/dev/null | grep -E 'proxy|rewrite|ssl|headers|http2' || true
printf '\n%s\n' "-- Apache virtual hosts --"
apache2ctl -S 2>&1
printf '\n%s\n' "-- Apache enabled sites --"
find /etc/apache2/sites-enabled -maxdepth 1 -type l -printf '%f -> %l\n' 2>/dev/null
printf '\n%s\n' "-- Nginx configuration --"
nginx -T 2>&1 | grep -E '(^# configuration file|server_name|listen |proxy_pass|root )' | head -250
printf '\n%s\n' "-- Existing TLS certificates --"
find /etc/letsencrypt/live -maxdepth 2 -type l -printf '%p -> %l\n' 2>/dev/null

section "DATABASE AND CACHE"
printf '%s\n' "-- PostgreSQL clusters --"
run_if_available pg_lsclusters
printf '\n%s\n' "-- PostgreSQL readiness --"
run_if_available pg_isready
printf '\n%s\n' "-- PostgreSQL database names --"
if id postgres >/dev/null 2>&1 && command -v psql >/dev/null 2>&1; then
  runuser -u postgres -- psql -Atqc "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;" 2>&1
else
  printf 'PostgreSQL is not available\n'
fi
printf '\n%s\n' "-- Redis readiness --"
if command -v redis-cli >/dev/null 2>&1; then
  redis-cli ping 2>&1
  redis-cli INFO server 2>/dev/null | grep -E '^(redis_version|uptime_in_seconds|tcp_port):'
else
  printf 'Redis is not available\n'
fi
printf '\n%s\n' "-- Meilisearch readiness --"
if command -v meilisearch >/dev/null 2>&1; then
  systemctl is-enabled meilisearch 2>/dev/null
  systemctl is-active meilisearch 2>/dev/null
  if command -v curl >/dev/null 2>&1; then
    curl -fsS http://127.0.0.1:7700/health 2>&1 || true
    printf '\n'
  fi
else
  printf 'Meilisearch is not available\n'
fi

section "EXISTING APPLICATION LAYOUT"
printf '%s\n' "-- /var/www --"
find /var/www -maxdepth 3 -mindepth 1 -printf '%M %u:%g %s %p\n' 2>/dev/null | head -300
printf '\n%s\n' "-- /opt --"
find /opt -maxdepth 3 -mindepth 1 -printf '%M %u:%g %s %p\n' 2>/dev/null | head -200
printf '\n%s\n' "-- BantuBuzz-related paths --"
find /var/www /opt /srv /root -maxdepth 4 \
  \( -iname '*bantubuzz*' -o -iname '*payload*' -o -iname '*cms*' \) \
  -printf '%M %u:%g %s %p\n' 2>/dev/null | head -300
printf '\n%s\n' "-- Environment files present (contents are not shown) --"
find /var/www /opt /srv /etc/bantubuzz -maxdepth 5 -type f \
  \( -name '.env' -o -name '.env.local' -o -name '*.env' \) \
  -printf '%M %u:%g %s %p\n' 2>/dev/null | head -100

section "PROCESS SNAPSHOT"
ps -eo user,pid,ppid,%cpu,%mem,etime,cmd --sort=-%mem 2>/dev/null |
  grep -Ei 'COMMAND|apache|nginx|gunicorn|python|node|pm2|postgres|redis|meilisearch|bantubuzz|payload' |
  head -200

section "PACKAGE AND UPDATE STATUS"
if command -v apt-get >/dev/null 2>&1; then
  printf '%s\n' "-- APT repositories --"
  grep -RhE '^[[:space:]]*deb ' /etc/apt/sources.list /etc/apt/sources.list.d 2>/dev/null | head -100
  printf '\n%s\n' "-- Upgradable packages (cached package metadata only) --"
  apt list --upgradable 2>/dev/null | head -100
elif command -v dnf >/dev/null 2>&1; then
  dnf repolist 2>&1
  dnf check-update 2>&1 | head -100
fi

section "BANTUBUZZ PORT READINESS"
for port in 22 80 443 3002 3010 5432 6379 7700 8002; do
  if ss -lnt 2>/dev/null | awk '{print $4}' | grep -Eq "(^|:)$port$"; then
    printf 'Port %-5s IN USE\n' "$port"
  else
    printf 'Port %-5s available\n' "$port"
  fi
done

section "AUDIT COMPLETE"
printf 'This was a read-only audit. No server state was changed.\n'
