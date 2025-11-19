# FAQ - Preguntas Frecuentes

## 🚀 General

### ¿Qué es ThreatGuard?

ThreatGuard es una plataforma de ciberseguridad integral que combina:
- Detección de intrusiones con Machine Learning
- Gestión de vulnerabilidades
- Monitoreo de activos
- Automatización de respuesta a incidentes (SOAR)
- Integración con herramientas de seguridad (Snort, OpenVAS, Wazuh)

### ¿Es ThreatGuard de código abierto?

No. ThreatGuard es software propietario con licencia privada. El código fuente está disponible en GitHub pero con todos los derechos reservados.

### ¿Cuál es el modelo de licenciamiento?

Copyright © 2025 ThreatGuard. Todos los derechos reservados.  
Para consultas sobre licencias comerciales, contacta al equipo de desarrollo.

## 💻 Instalación y Configuración

### ¿Qué sistemas operativos soporta?

**Servidor:**
- Ubuntu 20.04+
- Debian 10+
- CentOS 8+
- Windows Server 2016+

**Agente:**
- Windows 10/11
- Ubuntu, Debian, CentOS, RHEL, Fedora, Arch, Manjaro

### ¿Puedo instalar ThreatGuard en un contenedor?

Sí, proporcionamos configuración Docker Compose completa. Ver [Docker Deployment](Docker-Deployment).

### ¿Cuántos agentes puedo conectar?

No hay límite técnico. El número depende de los recursos del servidor:
- Servidor básico (8GB RAM): ~50 agentes
- Servidor medio (16GB RAM): ~200 agentes
- Servidor grande (32GB+ RAM): 500+ agentes

### ¿Necesito una base de datos externa?

Sí, ThreatGuard requiere PostgreSQL. Redis también es necesario para caching y tareas asíncronas.

## 🔒 Seguridad

### ¿Cómo se comunican los agentes con el servidor?

Los agentes se comunican con el servidor mediante:
- Protocolo HTTPS (recomendado)
- Autenticación mediante tokens JWT
- Cifrado de extremo a extremo

### ¿Se almacenan credenciales en texto plano?

No. Las contraseñas se almacenan con hash bcrypt. Los tokens de agentes se firman con JWT.

### ¿Puedo usar ThreatGuard en producción?

Sí, pero se recomienda:
- Usar HTTPS (no HTTP)
- Cambiar todas las credenciales por defecto
- Configurar firewall apropiadamente
- Mantener el sistema actualizado
- Realizar backups regulares

## 🔧 Funcionalidades

### ¿ThreatGuard detecta malware?

ThreatGuard detecta:
- Comportamientos anómalos en la red
- Intentos de intrusión
- Vulnerabilidades conocidas
- Patrones de ataque

Para detección de malware específica, integra con antivirus dedicado.

### ¿Funciona con mi firewall/IDS existente?

Sí, ThreatGuard se integra con:
- Snort IDS/IPS
- Wazuh HIDS
- OpenVAS (escáner de vulnerabilidades)
- Integraciones personalizadas vía API

### ¿Puedo crear reglas de detección personalizadas?

Sí, puedes:
- Crear reglas Snort personalizadas
- Entrenar modelos de ML propios
- Configurar alertas personalizadas
- Crear workflows SOAR automáticos

## 📊 Monitoreo y Alertas

### ¿Con qué frecuencia se actualizan las métricas?

Por defecto:
- Métricas de agentes: cada 60 segundos (configurable)
- Alertas: en tiempo real
- Escaneos de vulnerabilidades: bajo demanda o programados

### ¿Puedo recibir notificaciones por email/SMS/Slack?

Sí, ThreatGuard soporta:
- Email (SMTP)
- Webhooks (Slack, Discord, Teams, etc.)
- Integraciones SOAR personalizadas

### ¿Las alertas generan falsos positivos?

Como cualquier sistema de detección, puede haber falsos positivos. Puedes:
- Ajustar sensibilidad de detección
- Crear reglas de exclusión
- Entrenar modelos con tus datos
- Marcar alertas como falsos positivos para ML

## 🚨 Problemas Comunes

### El agente no se conecta al servidor

1. Verificar conectividad de red
2. Verificar firewall (puerto 8000)
3. Verificar token de autenticación
4. Ver logs del agente

### El servidor consume mucha RAM

Ajustar configuración:
- Reducir número de workers
- Aumentar `REPORT_INTERVAL` de agentes
- Optimizar consultas de base de datos
- Considerar actualizar hardware

### Los escaneos de OpenVAS son muy lentos

Los escaneos completos pueden tardar horas. Considera:
- Escaneos incrementales
- Programar escaneos en horarios de bajo uso
- Escanear solo puertos críticos
- Actualizar feeds de vulnerabilidades

## 💡 Mejores Prácticas

### ¿Cómo organizo mis activos?

Recomendaciones:
- Usar nombres descriptivos
- Agrupar por departamento/función
- Etiquetar por criticidad
- Mantener inventario actualizado

### ¿Con qué frecuencia debo escanear vulnerabilidades?

Depende del entorno:
- Crítico: Semanal
- Producción: Quincenal
- Desarrollo: Mensual
- Después de cambios mayores

### ¿Debo habilitar todas las integraciones?

No necesariamente. Habilita solo las que uses:
- Snort: Si tienes IDS en red
- OpenVAS: Para escaneo de vulnerabilidades
- Wazuh: Para HIDS y logs

## 📚 Recursos Adicionales

### ¿Dónde puedo aprender más?

- [Wiki Completa](Home)
- [Tutoriales en Video](#)
- [Blog de ThreatGuard](#)
- [Comunidad en Discord](#)

### ¿Cómo reporto un bug?

1. Verificar que no esté reportado: [Issues](https://github.com/TomasUnab/Threatguard-3.0/issues)
2. Crear nuevo issue con:
   - Descripción del problema
   - Pasos para reproducir
   - Logs relevantes
   - Versión de ThreatGuard

### ¿Puedo contribuir al proyecto?

Actualmente el proyecto es propietario. Para consultas sobre colaboración, contacta al equipo de desarrollo.

## 🆘 Soporte

### ¿Ofrecen soporte técnico?

Para consultas:
- Issues en GitHub: Problemas técnicos
- Email: [Contacto]
- Documentación: Wiki completa

### ¿Hay formación disponible?

Recursos de aprendizaje:
- Documentación oficial
- Guías de inicio rápido
- Videos tutoriales
- Webinars (próximamente)

---

**¿No encontraste tu pregunta?** Abre un [issue en GitHub](https://github.com/TomasUnab/Threatguard-3.0/issues) o contacta al equipo de soporte.
