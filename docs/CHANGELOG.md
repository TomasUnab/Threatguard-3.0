# ThreatGuard - Changelog

## [Unreleased] - 2024-12-XX

### Agregado
- **Sistema de Reportes Completo**
  - Generación de reportes con template (Vulnerabilidades, Alertas, Cumplimiento, Activos, Ejecutivo)
  - Generación de reportes personalizados sin template
  - Exportación a PDF con datos reales de la BD usando reportlab
  - Edición de reportes existentes
  - Descarga automática de PDFs generados
  - Interfaz moderna con estadísticas y gestión completa

- **Gestión de Políticas Snort IDS**
  - Panel de políticas por categoría (Network, Web, Malware, DoS, Scan)
  - Activación/desactivación masiva por categoría
  - Botón "Crear Política" para aplicar configuraciones predefinidas
  - Contadores de reglas por categoría en tiempo real
  - Aplicación automática de políticas a reglas de Snort

- **Edición de Reglas Snort**
  - Modal de edición completo para reglas existentes
  - Modificación de SID, categoría, mensaje, protocolo y estado
  - Actualización en tiempo real en el contenedor Snort
  - Validación de campos y manejo de errores

- **Mejoras de UI/UX**
  - Sidebar fijo en Settings que permanece visible durante scroll
  - Scrollbars personalizados para tablas de Snort IDS
  - Interfaz de reportes moderna con cards y estadísticas
  - Modales mejorados para todas las funcionalidades

### Modificado
- **Backend API (`threatguard_api.py`)**
  - Endpoint `/reports/generate` ahora genera PDFs reales con reportlab
  - Consulta datos reales de PostgreSQL para reportes
  - Incluye tablas y resúmenes en PDFs generados
  - Manejo de errores mejorado con fallback a JSON

- **Frontend Settings (`code.html`)**
  - Sidebar con posición fixed para mejor navegación
  - Margen izquierdo en contenido principal (ml-64)
  - Integración completa de políticas y edición de reglas

- **JavaScript Snort (`snort-policies.js`)**
  - Funciones de gestión de políticas implementadas
  - Auto-conteo de reglas por categoría
  - Integración con backend para aplicar cambios reales

### Archivos Nuevos
- `PAGINA WEB/reports/reports-new.js` - Sistema completo de reportes
- `PAGINA WEB/settings/snort-policies.js` - Gestión de políticas Snort
- `GIT_PUSH.bat` - Script para subir cambios al repositorio
- `CHANGELOG.md` - Este archivo

### Dependencias
- `reportlab>=4.0.0` - Ya incluido en requirements.txt para generación de PDFs

### Notas de Instalación
1. Reconstruir contenedores:
   ```bash
   docker-compose up -d --build
   ```

2. Verificar que reportlab esté instalado:
   ```bash
   docker exec threatguard-api pip list | grep reportlab
   ```

3. Acceder a las nuevas funcionalidades:
   - Reportes: http://localhost:8080/reports/code.html
   - Políticas Snort: http://localhost:8080/settings/code.html → Snort IDS → Políticas

### Correcciones de Bugs
- Fixed: Sidebar en Settings se movía al hacer scroll
- Fixed: Reglas Snort no se podían editar (solo eliminar/toggle)
- Fixed: Reportes solo mostraban datos estáticos

### Seguridad
- Validación de entrada en generación de reportes
- Sanitización de nombres de archivo en descargas
- Verificación de permisos en edición de reglas

---

## Instrucciones para Contribuidores

### Subir Cambios al Repositorio
1. Ejecutar `GIT_PUSH.bat` (Windows) o:
   ```bash
   git add .
   git commit -m "Tu mensaje"
   git push origin main
   ```

### Estructura de Commits
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios de formato/estilo
- `refactor:` Refactorización de código
- `test:` Agregar/modificar tests

### Testing
- Verificar que todos los contenedores estén corriendo: `docker ps`
- Probar endpoints de API: http://localhost:8000/docs
- Verificar frontend: http://localhost:8080

---

**Versión actual:** 3.0.0  
**Última actualización:** 2024-12-XX  
**Mantenedor:** ThreatGuard Team
