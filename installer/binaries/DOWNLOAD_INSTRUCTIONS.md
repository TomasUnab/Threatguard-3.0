# 📥 INSTRUCCIONES PARA DESCARGAR BINARIOS DE SNORT

## Estado Actual
✅ Script de descarga ejecutado  
⚠️ Descarga automática falló (requiere autenticación)  
📋 Descarga manual necesaria

## Pasos para Descargar

### 1. Acceder a Snort.org

Ya tienes la página abierta en tu navegador: https://www.snort.org/downloads

Si no está abierta, ábrela ahora.

### 2. Crear Cuenta o Iniciar Sesión

- **Si no tienes cuenta**: Click en "Register" (arriba derecha)
  - Completa el formulario
  - Verifica tu email
  - Inicia sesión

- **Si ya tienes cuenta**: Click en "Login"

### 3. Descargar Binarios

Una vez autenticado, busca y descarga:

#### Para Windows:
**Archivo**: `Snort 3.1.78.0 for Windows (x64)` o similar  
**Formato**: `.zip`  
**Tamaño**: ~20-25 MB

**Guardar en**:
```
c:\Users\tomas\Proyecto u\ThreatGuard\installer\binaries\windows\snort-3.1.78.0-win64.zip
```

#### Para Linux (Opcional):
**Archivo**: `Snort 3.1.78.0 for Linux (x86_64)` o similar  
**Formato**: `.tar.gz`  
**Tamaño**: ~15-20 MB

**Guardar en**:
```
c:\Users\tomas\Proyecto u\ThreatGuard\installer\binaries\linux\snort-3.1.78.0-x64.tar.gz
```

### 4. Verificar Descarga

Ejecuta este comando para verificar:

```powershell
# Windows
Test-Path "c:\Users\tomas\Proyecto u\ThreatGuard\installer\binaries\windows\snort-3.1.78.0-win64.zip"

# Linux (opcional)
Test-Path "c:\Users\tomas\Proyecto u\ThreatGuard\installer\binaries\linux\snort-3.1.78.0-x64.tar.gz"
```

Debería devolver `True` si el archivo existe.

## Notas Importantes

### Nombre del Archivo
El nombre exacto puede variar ligeramente. Lo importante es:
- Que sea Snort 3.x (preferiblemente 3.1.78.0)
- Que sea para Windows x64 (o Linux x86_64)
- Que esté en formato .zip (Windows) o .tar.gz (Linux)

Si el nombre es diferente, puedes:
1. Renombrar el archivo descargado, o
2. Actualizar el nombre en el código del instalador

### Solo Windows es Suficiente
Si solo vas a crear el instalador para Windows, solo necesitas el binario de Windows.

### Alternativa: Sin Binarios
Recuerda que el instalador funciona sin binarios. Si tienes problemas descargando:
- El instalador instalará Snort desde Chocolatey
- Funcionará igual de bien
- Solo tomará 2-5 minutos más

## Próximo Paso

Una vez descargados los binarios, ejecuta:

```powershell
cd "c:\Users\tomas\Proyecto u\ThreatGuard\installer\installer-app"
npm install
npm run build:windows
```

Esto creará el instalador completo con los binarios incluidos.

## ¿Necesitas Ayuda?

Si tienes problemas:
1. Verifica que estás autenticado en snort.org
2. Busca la versión más reciente de Snort 3.x
3. Descarga cualquier versión 3.x (no necesita ser exactamente 3.1.78.0)
4. O continúa sin binarios (el instalador funcionará igual)

---

**Captura de pantalla de la página guardada en**:
`C:/Users/tomas/.gemini/antigravity/brain/07d234b3-71c3-4ceb-8d12-56231c0c0e77/snort_downloads_page_*.png`
