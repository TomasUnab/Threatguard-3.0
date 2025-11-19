# 🚀 ThreatGuard - Guía de Despliegue en AWS EC2

## 📦 Archivos Creados para Despliegue

Se han creado **7 archivos** para facilitar el despliegue de ThreatGuard en AWS EC2:

### 📄 Documentación (en `docs/`)
1. **AWS_EC2_DEPLOYMENT.md** (15 KB)
   - Guía completa paso a paso
   - Requisitos de instancia
   - Configuración de seguridad
   - Solución de problemas
   - **Usa este** si es tu primera vez

2. **EC2_QUICK_REFERENCE.md** (10 KB)
   - Referencia rápida de comandos
   - Lista de archivos necesarios
   - 3 métodos de despliegue
   - Checklist y troubleshooting
   - **Usa este** como consulta rápida

3. **FILE_STRUCTURE_EC2.md** (14 KB)
   - Estructura completa de archivos
   - Qué transferir y qué NO
   - Tamaños aproximados
   - Diagrama de dependencias
   - **Usa este** para entender la estructura

### 🛠️ Scripts de Automatización

4. **transfer_to_ec2.ps1** (8 KB) - Windows PowerShell
   - Script para transferir archivos desde Windows
   - Comprime, transfiere y prepara automáticamente
   - **Usa este** si estás en Windows

5. **prepare_ec2_package.sh** (5 KB) - Linux/Mac Bash
   - Crea un paquete comprimido con solo lo necesario
   - Excluye archivos innecesarios
   - **Usa este** en Linux/Mac/Git Bash

6. **scripts/ec2_setup.sh** (15 KB) - Instalador en EC2
   - Instala Docker, Docker Compose, herramientas
   - Configura firewall, backups, monitoreo
   - Despliega ThreatGuard automáticamente
   - **Ejecuta este** dentro de la instancia EC2

---

## 🎯 ¿Qué Archivos Necesitas Transferir?

### ✅ ARCHIVOS CRÍTICOS (~25 MB)

```
ThreatGuard/
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.snort
├── threatguard_api.py
├── openvas_auto_scan.py
├── requirements.txt
├── requirements-snort.txt
├── nginx.conf
├── config/                    (TODO el directorio)
├── scripts/                   (TODO, especialmente init_db.sql/)
├── PAGINA WEB/               (TODO el directorio)
└── src/                       (TODO el directorio)
```

### ❌ ARCHIVOS A EXCLUIR

```
NO transferir:
├── .venv/                     (Entorno virtual local)
├── .git/                      (Repositorio Git)
├── __pycache__/               (Cache Python)
├── data/CIC-IDS2017/          (Dataset - muy grande)
├── agent*.py                  (Scripts de agente)
├── *.bat                      (Scripts Windows)
└── installer/                 (Instalador Windows)
```

---

## 🚀 Método Recomendado: 3 Pasos Simples

### Paso 1: En tu Máquina Local (Windows)

```powershell
# Abrir PowerShell como Administrador en la raíz del proyecto
cd "C:\Users\tomas\Proyecto u\ThreatGuard"

# Ejecutar script de transferencia
.\transfer_to_ec2.ps1 -EC2_IP "TU-IP-PUBLICA-EC2" -KeyFile "C:\ruta\a\tu-key.pem"

# Ejemplo:
.\transfer_to_ec2.ps1 -EC2_IP "54.123.45.67" -KeyFile "C:\Users\tomas\.ssh\mi-key-ec2.pem"
```

El script automáticamente:
- ✅ Selecciona solo los archivos necesarios
- ✅ Excluye archivos innecesarios
- ✅ Comprime todo en un .zip
- ✅ Transfiere a EC2 vía SCP
- ✅ Extrae en `/opt/threatguard/`

### Paso 2: Conectar a EC2

```powershell
# El script te preguntará si deseas conectar
# O conecta manualmente:
ssh -i "C:\ruta\a\tu-key.pem" ec2-user@TU-IP-EC2
```

### Paso 3: Instalar en EC2

```bash
# Ya dentro de EC2
sudo bash /opt/threatguard/scripts/ec2_setup.sh
```

El script automáticamente:
- ✅ Instala Docker y Docker Compose
- ✅ Configura firewall
- ✅ Genera contraseñas seguras
- ✅ Despliega todos los contenedores
- ✅ Configura backups automáticos
- ✅ Crea scripts de monitoreo

**¡Listo!** ThreatGuard estará corriendo en 10-15 minutos.

---

## 🌐 Acceso al Sistema

Una vez instalado, accede a:

| Servicio | URL | Usuario | Contraseña |
|----------|-----|---------|------------|
| **Dashboard** | `http://TU-IP-EC2:8080` | - | - |
| **API** | `http://TU-IP-EC2:8000` | - | - |
| **API Docs** | `http://TU-IP-EC2:8000/docs` | - | - |
| **OpenVAS** | `http://TU-IP-EC2:9392` | admin | Ver `/opt/threatguard/.env` |

Las credenciales se generan automáticamente y se guardan en `/opt/threatguard/.env`.

---

## ⚙️ Requisitos de la Instancia EC2

### Tipo de Instancia
| Uso | Tipo | vCPU | RAM | Precio/mes |
|-----|------|------|-----|------------|
| **Producción** | `t3.xlarge` | 4 | 16 GB | ~$120 |
| Desarrollo | `t3.large` | 2 | 8 GB | ~$60 |
| Pruebas | `t3.medium` | 2 | 4 GB | ~$30 |

### Sistema Operativo
- ✅ Amazon Linux 2023 (recomendado)
- ✅ Ubuntu 22.04 LTS
- ✅ Ubuntu 20.04 LTS

### Almacenamiento
- **Mínimo:** 30 GB SSD (gp3)
- **Recomendado:** 50 GB SSD (gp3)

### Security Groups (Firewall AWS)

Configurar las siguientes reglas de entrada:

```yaml
Inbound Rules:
  - Type: SSH, Port: 22, Source: Tu_IP/32
  - Type: Custom TCP, Port: 8000, Source: 0.0.0.0/0
  - Type: Custom TCP, Port: 8080, Source: 0.0.0.0/0
  - Type: Custom TCP, Port: 9390, Source: Tu_Red/24
  - Type: Custom TCP, Port: 9392, Source: Tu_Red/24
```

---

## 📚 Métodos Alternativos

### Método 2: Linux/Mac con Bash

```bash
# 1. Preparar paquete
chmod +x prepare_ec2_package.sh
./prepare_ec2_package.sh

# 2. Transferir
scp -i tu-key.pem threatguard-ec2-*.tar.gz ec2-user@TU-IP:/home/ec2-user/

# 3. En EC2
ssh -i tu-key.pem ec2-user@TU-IP
tar -xzf threatguard-ec2-*.tar.gz
sudo mv threatguard-ec2-*/ /opt/threatguard
sudo bash /opt/threatguard/scripts/ec2_setup.sh
```

### Método 3: rsync Directo (Actualizaciones)

```bash
# Transferencia directa (ideal para actualizaciones)
rsync -avz --progress \
  -e "ssh -i tu-key.pem" \
  --exclude='.venv' \
  --exclude='.git' \
  --exclude='__pycache__' \
  --exclude='data/' \
  . ec2-user@TU-IP:/opt/threatguard/

# En EC2, solo reiniciar
ssh -i tu-key.pem ec2-user@TU-IP
cd /opt/threatguard
docker-compose up -d --build
```

---

## ✅ Verificación del Sistema

### Comando Rápido
```bash
# Ejecutar script de verificación
/opt/threatguard/check_health.sh
```

### Verificación Manual
```bash
# Ver contenedores corriendo
docker-compose ps

# Verificar API
curl http://localhost:8000/health

# Verificar Dashboard
curl -I http://localhost:8080

# Ver logs
docker-compose logs -f
```

---

## 🛠️ Comandos Útiles

### Gestión de Servicios
```bash
# Reiniciar todos los servicios
cd /opt/threatguard
docker-compose restart

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio
docker-compose logs -f threatguard-api

# Detener todo
docker-compose down

# Iniciar todo
docker-compose up -d
```

### Mantenimiento
```bash
# Backup manual
/opt/threatguard/backup.sh

# Ver backups
ls -lh /opt/threatguard/backups/

# Limpiar espacio
docker system prune -a
```

---

## 🐛 Solución de Problemas

### Problema: "Permission denied" al transferir
```powershell
# Asegúrate de que la clave tiene los permisos correctos
icacls "C:\ruta\tu-key.pem" /inheritance:r
icacls "C:\ruta\tu-key.pem" /grant:r "$($env:USERNAME):(R)"
```

### Problema: Contenedores no inician
```bash
# Ver logs detallados
docker-compose logs --tail=50

# Reintentar
docker-compose down
docker-compose up -d --build
```

### Problema: OpenVAS tarda mucho
```bash
# Es normal, puede tardar 10-15 minutos la primera vez
docker logs threatguard-openvas -f
```

### Problema: Sin espacio en disco
```bash
# Limpiar imágenes Docker
docker system prune -a

# Ver uso de espacio
df -h
docker system df
```

---

## 💰 Estimación de Costos AWS

### Configuración Recomendada
```
✓ EC2 t3.xlarge (On-Demand):          $120/mes
✓ EBS 50GB gp3:                       $4/mes
✓ Data Transfer (50GB out):           $4.50/mes
✓ Backups S3 (100GB):                 $2.30/mes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL ESTIMADO:                       ~$130/mes
```

### Optimización de Costos
- 💡 **Reserved Instances:** -40% de descuento (1-3 años)
- 💡 **Savings Plans:** -30-50% de descuento
- 💡 **Spot Instances:** -90% de descuento (no recomendado para producción)
- 💡 **Apagar fuera de horario:** -70% de ahorro si solo usas 8h/día

---

## 📞 Soporte y Documentación

### Documentación Completa
- 📖 **Guía Completa:** `docs/AWS_EC2_DEPLOYMENT.md`
- 📋 **Referencia Rápida:** `docs/EC2_QUICK_REFERENCE.md`
- 📂 **Estructura de Archivos:** `docs/FILE_STRUCTURE_EC2.md`
- 🚀 **Despliegue General:** `docs/DEPLOYMENT.md`

### Flujo de Troubleshooting
1. Ejecutar `/opt/threatguard/check_health.sh`
2. Revisar logs: `docker-compose logs -f`
3. Verificar recursos: `htop` y `docker stats`
4. Consultar documentación en `docs/`
5. Buscar en GitHub Issues

---

## ✅ Checklist de Despliegue

```
Pre-Despliegue:
☐ Instancia EC2 creada y corriendo
☐ Security Groups configurados (puertos 22, 8000, 8080, 9390, 9392)
☐ Key Pair (.pem) descargada y con permisos correctos
☐ Elastic IP asignada (opcional pero recomendado)

Transferencia:
☐ Script transfer_to_ec2.ps1 ejecutado exitosamente
☐ Archivos verificados en /opt/threatguard/
☐ Permisos correctos (scripts ejecutables)

Instalación:
☐ Script ec2_setup.sh ejecutado sin errores
☐ Docker y Docker Compose instalados
☐ Contraseñas generadas y guardadas

Verificación:
☐ Todos los contenedores corriendo: docker-compose ps
☐ API responde: curl http://localhost:8000/health
☐ Dashboard accesible: http://TU-IP:8080
☐ OpenVAS inicializado (puede tardar 10-15 min)

Post-Instalación:
☐ Credenciales guardadas en lugar seguro
☐ Backups automáticos funcionando
☐ Monitoreo configurado
☐ Firewall verificado (UFW o Security Groups)
```

---

## 🎉 ¡Listo para Producción!

Si completaste todos los pasos, ThreatGuard ahora está:

- ✅ Desplegado en AWS EC2
- ✅ Con Docker y contenedores corriendo
- ✅ API y Dashboard accesibles
- ✅ OpenVAS escaneando automáticamente
- ✅ Snort detectando amenazas
- ✅ Backups configurados
- ✅ Listo para conectar agentes

---

## 🚀 Próximos Pasos

1. **Acceder al Dashboard:** `http://TU-IP-EC2:8080`
2. **Explorar la API:** `http://TU-IP-EC2:8000/docs`
3. **Instalar agentes** en las máquinas que deseas monitorear
4. **Configurar alertas** personalizadas
5. **Revisar vulnerabilidades** en OpenVAS

---

**¿Necesitas ayuda?** Consulta `docs/AWS_EC2_DEPLOYMENT.md` para la guía completa.

---

**Última actualización:** Noviembre 2025  
**Versión ThreatGuard:** 2.0  
**Documentación completa:** `/docs/`
