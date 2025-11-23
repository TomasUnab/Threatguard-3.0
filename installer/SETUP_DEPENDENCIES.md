# 🔧 Instalación de Dependencias para Compilar el Instalador

## Estado Actual

Para compilar el instalador de ThreatGuard, necesitas:
- ❌ Node.js (no instalado)
- ❌ npm (viene con Node.js)

## Opción 1: Instalación Rápida con Chocolatey (Recomendado)

### Paso 1: Instalar Chocolatey

Abre PowerShell **como Administrador** y ejecuta:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Paso 2: Instalar Node.js

```powershell
choco install nodejs-lts -y
```

### Paso 3: Refrescar Variables de Entorno

```powershell
refreshenv
```

### Paso 4: Verificar Instalación

```powershell
node --version
npm --version
```

Deberías ver algo como:
```
v20.x.x
10.x.x
```

## Opción 2: Instalación Manual (Más Simple)

### Descargar e Instalar Node.js Directamente

1. **Descarga Node.js LTS**:
   - Ve a: https://nodejs.org/
   - Descarga la versión **LTS** (Long Term Support)
   - Versión recomendada: 20.x.x

2. **Ejecuta el Instalador**:
   - Doble click en el archivo descargado
   - Sigue el asistente (Next, Next, Install)
   - ✅ Marca "Automatically install necessary tools"

3. **Reinicia PowerShell**:
   - Cierra todas las ventanas de PowerShell
   - Abre una nueva ventana

4. **Verifica**:
   ```powershell
   node --version
   npm --version
   ```

## Después de Instalar Node.js

Una vez que Node.js esté instalado, ejecuta:

```powershell
cd "c:\Users\tomas\Proyecto u\ThreatGuard\installer\installer-app"
npm install
npm run build:windows
```

## Tiempo Estimado

- **Instalación de Node.js**: 5-10 minutos
- **npm install**: 2-5 minutos
- **npm run build**: 5-10 minutos

**Total**: ~15-25 minutos

## Problemas Comunes

### "npm no se reconoce"

**Solución**: Reinicia PowerShell después de instalar Node.js

### "Acceso denegado"

**Solución**: Ejecuta PowerShell como Administrador

### "Error de red durante npm install"

**Solución**: 
```powershell
npm config set registry https://registry.npmjs.org/
npm install
```

## Alternativa: Usar el Script Standalone

Si prefieres no compilar el instalador Electron, puedes usar el script standalone:

```powershell
# Este script instala ThreatGuard directamente
cd "c:\Users\tomas\Proyecto u\ThreatGuard\installer\scripts\windows"
.\install.ps1
```

**Ventajas**:
- ✅ No requiere Node.js
- ✅ Instala ThreatGuard directamente
- ✅ Más rápido para testing

**Desventajas**:
- ❌ No es un instalador distribuible (.exe)
- ❌ No tiene GUI
- ❌ Requiere que el usuario tenga todo el código fuente

## Resumen

**Para compilar el instalador distribuible (.exe):**
1. Instala Node.js (https://nodejs.org/)
2. Ejecuta `npm install`
3. Ejecuta `npm run build:windows`

**Para testing rápido:**
1. Usa el script standalone: `installer\scripts\windows\install.ps1`

---

**¿Qué prefieres hacer?**
- A) Instalar Node.js y compilar el instalador completo (.exe)
- B) Usar el script standalone para testing
