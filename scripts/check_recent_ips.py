# -*- coding: utf-8 -*-
"""
Verificar IPs recientes que han intentado conectarse
"""
import subprocess

print("=" * 60)
print("VERIFICANDO IPS RECIENTES EN SNORT")
print("=" * 60)

# Ver últimas 100 alertas de Snort
cmd = 'ssh -i "ICF233.pem" ubuntu@98.84.174.81 "sudo docker exec threatguard-snort tail -100 /var/log/snort/alert"'
result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

if result.returncode != 0:
    print("[ERROR] No se pudo conectar al servidor")
    exit(1)

lines = result.stdout.strip().split('\n')

# Extraer IPs únicas
ips_source = set()
ips_dest = set()

for line in lines:
    if '->' in line:
        parts = line.split()
        for i, part in enumerate(parts):
            if '->' in part and i > 0:
                # IP origen
                src = parts[i-1].split(':')[0]
                if not src.startswith('172.') and not src.startswith('169.') and src != '::':
                    ips_source.add(src)
                
                # IP destino
                if i+1 < len(parts):
                    dst = parts[i+1].split(':')[0]
                    if not dst.startswith('172.') and not dst.startswith('169.') and dst != '::':
                        ips_dest.add(dst)

print("\nIPs ORIGEN (atacantes) detectadas:")
print("-" * 60)
if ips_source:
    for ip in sorted(ips_source):
        print(f"  {ip}")
else:
    print("  (Ninguna)")

print("\nIPs DESTINO (targets):")
print("-" * 60)
if ips_dest:
    for ip in sorted(ips_dest):
        print(f"  {ip}")
else:
    print("  (Ninguna)")

print("\n" + "=" * 60)
print("ÚLTIMAS 20 ALERTAS:")
print("=" * 60)
for line in lines[-20:]:
    if line.strip():
        print(line)

print("\n" + "=" * 60)
