# -*- coding: utf-8 -*-
"""
Actualizar reglas de Snort en EC2 y reiniciar contenedor
"""
import subprocess

print("=" * 60)
print("ACTUALIZANDO REGLAS DE SNORT EN EC2")
print("=" * 60)

# 1. Copiar reglas actualizadas al servidor
print("\n1. Copiando reglas actualizadas...")
cmd_copy = 'scp -i "ICF233.pem" config/local.rules ubuntu@98.84.174.81:~/local.rules'
result = subprocess.run(cmd_copy, shell=True)

if result.returncode != 0:
    print("[ERROR] Error copiando reglas")
    exit(1)

print("[OK] Reglas copiadas")

# 2. Actualizar reglas en el directorio del proyecto
print("\n2. Actualizando reglas en servidor...")
cmd_update = 'ssh -i "ICF233.pem" ubuntu@98.84.174.81 "cp ~/local.rules ~/Threatguard-3.0/config/local.rules"'
result = subprocess.run(cmd_update, shell=True)

if result.returncode != 0:
    print("[ERROR] Error actualizando reglas")
    exit(1)

print("[OK] Reglas actualizadas")

# 3. Reiniciar Snort para cargar nuevas reglas
print("\n3. Reiniciando Snort...")
cmd_restart = 'ssh -i "ICF233.pem" ubuntu@98.84.174.81 "sudo docker restart threatguard-snort"'
result = subprocess.run(cmd_restart, shell=True)

if result.returncode != 0:
    print("[ERROR] Error reiniciando Snort")
    exit(1)

print("[OK] Snort reiniciado")

# 4. Verificar que Snort está corriendo
print("\n4. Verificando estado de Snort...")
cmd_status = 'ssh -i "ICF233.pem" ubuntu@98.84.174.81 "sudo docker ps | grep snort"'
result = subprocess.run(cmd_status, shell=True)

print("\n" + "=" * 60)
print("ACTUALIZACIÓN COMPLETADA")
print("=" * 60)
print("\nLas nuevas reglas están activas:")
print("  - Port Scans: ALTA prioridad (priority:1)")
print("  - ICMP Sweeps: ALTA prioridad (priority:1)")
print("\nAhora las alertas se clasificarán correctamente como ALTA")
print("=" * 60)
