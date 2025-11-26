# -*- coding: utf-8 -*-
"""
Monitor en tiempo real para detectar ataques desde VM externa
"""
import subprocess
import time

print("=" * 60)
print("MONITOREANDO ATAQUES DESDE VM EXTERNA")
print("Target: 98.84.174.81")
print("=" * 60)
print("\nEsperando ataque desde VM externa...")
print("Presiona Ctrl+C cuando el ataque haya terminado\n")

# Obtener timestamp actual
cmd_timestamp = 'ssh -i "ICF233.pem" ubuntu@98.84.174.81 "date +%s"'
result = subprocess.run(cmd_timestamp, shell=True, capture_output=True, text=True)
start_time = result.stdout.strip()

try:
    while True:
        time.sleep(5)
        print(".", end="", flush=True)
except KeyboardInterrupt:
    print("\n\n" + "=" * 60)
    print("VERIFICANDO ALERTAS DETECTADAS...")
    print("=" * 60 + "\n")
    
    # Ver alertas nuevas
    cmd = f'ssh -i "ICF233.pem" ubuntu@98.84.174.81 "sudo docker exec threatguard-snort tail -100 /var/log/snort/alert"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    lines = result.stdout.strip().split('\n')
    
    # Buscar IPs únicas
    ips = set()
    for line in lines:
        if '->' in line:
            parts = line.split()
            for i, part in enumerate(parts):
                if '->' in part and i > 0:
                    ip = parts[i-1].split(':')[0]
                    if not ip.startswith('172.') and not ip.startswith('169.'):
                        ips.add(ip)
    
    print("\nIPs ATACANTES DETECTADAS:")
    print("-" * 60)
    for ip in sorted(ips):
        print(f"  - {ip}")
    
    print("\n" + "=" * 60)
    print("ULTIMAS 20 ALERTAS:")
    print("=" * 60)
    for line in lines[-20:]:
        print(line)
    
    print("\n" + "=" * 60)
    print("Verifica el dashboard: http://localhost:8080")
    print("=" * 60)
