#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script para corregir el encoding de los tags en la base de datos"""

import psycopg2

# Mapeo de nombres mal codificados a correctos
FIXES = {
    'TelemetrÃ­a Activa': 'Telemetría Activa',
    'Sin TelemetrÃ­a': 'Sin Telemetría',
    'CrÃ­tico': 'Crítico',
    'ProducciÃ³n': 'Producción',
    'EstacíÃ³n de trabajo': 'Estación de trabajo',
}

def fix_tags():
    conn = psycopg2.connect("postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")
    cur = conn.cursor()
    
    # Ver tags actuales
    cur.execute("SELECT id, name, description FROM tags")
    rows = cur.fetchall()
    
    print("Tags actuales:")
    for row in rows:
        print(f"  {row[0][:8]}... : {row[1]}")
    
    print("\nCorrigiendo nombres...")
    
    # Corregir nombres conocidos
    for wrong, correct in FIXES.items():
        cur.execute("UPDATE tags SET name = %s WHERE name = %s", (correct, wrong))
        if cur.rowcount > 0:
            print(f"  Corregido: {wrong} -> {correct}")
    
    # Corregir descripciones también
    desc_fixes = {
        'TelemetrÃ­a habilitada y reportando': 'Telemetría habilitada y reportando',
        'TelemetrÃ­a deshabilitada': 'Telemetría deshabilitada',
        'Activo crÃ­tico para la organizaciÃ³n': 'Activo crítico para la organización',
        'Servidor de producciÃ³n': 'Servidor de producción',
        'EstaciÃ³n de trabajo': 'Estación de trabajo',
    }
    
    for wrong, correct in desc_fixes.items():
        cur.execute("UPDATE tags SET description = %s WHERE description = %s", (correct, wrong))
        if cur.rowcount > 0:
            print(f"  Descripción corregida: {wrong[:30]}... -> {correct[:30]}...")
    
    conn.commit()
    
    # Verificar
    print("\nTags después de corrección:")
    cur.execute("SELECT id, name, description FROM tags")
    for row in cur.fetchall():
        print(f"  {row[1]}: {row[2][:40] if row[2] else 'N/A'}...")
    
    conn.close()
    print("\n✅ Corrección completada")

if __name__ == "__main__":
    fix_tags()
