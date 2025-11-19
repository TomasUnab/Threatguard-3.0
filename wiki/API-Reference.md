# API Reference - ThreatGuard

Documentación completa de la API REST de ThreatGuard.

## 🔐 Autenticación

Todas las solicitudes a la API requieren autenticación mediante JWT (JSON Web Tokens).

### Obtener Token

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "tu_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 1800
}
```

### Usar Token

Incluir el token en el header de cada solicitud:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📊 Endpoints

### Alertas

#### Listar Alertas

```http
GET /api/alerts
```

**Query Parameters:**
- `page` (int): Número de página (default: 1)
- `limit` (int): Resultados por página (default: 50)
- `severity` (string): Filtrar por severidad (low, medium, high, critical)
- `status` (string): Filtrar por estado (new, investigating, resolved)
- `date_from` (string): Fecha inicio (ISO 8601)
- `date_to` (string): Fecha fin (ISO 8601)

**Response:**
```json
{
  "total": 150,
  "page": 1,
  "limit": 50,
  "alerts": [
    {
      "id": 1,
      "severity": "high",
      "title": "Actividad sospechosa detectada",
      "description": "Múltiples intentos de login fallidos",
      "source_ip": "192.168.1.100",
      "timestamp": "2025-11-11T10:30:00Z",
      "status": "new"
    }
  ]
}
```

#### Obtener Alerta

```http
GET /api/alerts/{id}
```

#### Actualizar Alerta

```http
PUT /api/alerts/{id}
```

**Request:**
```json
{
  "status": "investigating",
  "assigned_to": "analyst_1",
  "notes": "Investigando origen del ataque"
}
```

### Activos

#### Listar Activos

```http
GET /api/assets
```

**Response:**
```json
{
  "total": 45,
  "assets": [
    {
      "id": 1,
      "hostname": "server-01",
      "ip_address": "192.168.1.10",
      "os": "Ubuntu 20.04",
      "status": "online",
      "last_seen": "2025-11-11T10:00:00Z",
      "vulnerabilities": 3,
      "risk_score": 7.5
    }
  ]
}
```

#### Registrar Activo

```http
POST /api/assets
```

**Request:**
```json
{
  "hostname": "new-server",
  "ip_address": "192.168.1.50",
  "os": "Windows Server 2019",
  "department": "IT",
  "owner": "admin@company.com"
}
```

### Vulnerabilidades

#### Escanear Activo

```http
POST /api/vulnerabilities/scan
```

**Request:**
```json
{
  "target": "192.168.1.10",
  "scan_type": "full"
}
```

**Response:**
```json
{
  "scan_id": "scan-uuid-123",
  "status": "queued",
  "message": "Escaneo iniciado"
}
```

#### Estado del Escaneo

```http
GET /api/vulnerabilities/scan/{scan_id}
```

#### Listar Vulnerabilidades

```http
GET /api/vulnerabilities
```

**Query Parameters:**
- `asset_id` (int): Filtrar por activo
- `severity` (string): low, medium, high, critical
- `status` (string): open, mitigated, false_positive

### Agentes

#### Reporte del Agente

```http
POST /api/agent/report
```

**Headers:**
```
Authorization: Bearer {agent_token}
```

**Request:**
```json
{
  "agent_name": "server-01",
  "agent_ip": "192.168.1.10",
  "hostname": "server-01.local",
  "os": "Ubuntu 20.04",
  "timestamp": "2025-11-11T10:00:00Z",
  "cpu_percent": 45.2,
  "memory_percent": 67.8,
  "disk_percent": 55.0,
  "network_sent": 1048576,
  "network_recv": 2097152
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Datos recibidos correctamente"
}
```

### Reportes

#### Generar Reporte

```http
POST /api/reports/generate
```

**Request:**
```json
{
  "type": "security_summary",
  "date_from": "2025-11-01",
  "date_to": "2025-11-11",
  "format": "pdf",
  "include_charts": true
}
```

**Response:**
```json
{
  "report_id": "report-uuid-456",
  "status": "generating",
  "download_url": null
}
```

#### Descargar Reporte

```http
GET /api/reports/download/{report_id}
```

## 📝 Códigos de Estado

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Solicitud inválida |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

## 🔄 Rate Limiting

La API tiene límites de solicitudes:

- **Autenticado:** 1000 requests/hora
- **No autenticado:** 100 requests/hora

Headers de respuesta:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1636632000
```

## 💡 Ejemplos de Uso

### Python

```python
import requests

# Autenticar
response = requests.post(
    'http://localhost:8000/api/auth/login',
    json={'username': 'admin', 'password': 'password'}
)
token = response.json()['access_token']

# Usar API
headers = {'Authorization': f'Bearer {token}'}
alerts = requests.get(
    'http://localhost:8000/api/alerts',
    headers=headers
)
print(alerts.json())
```

### cURL

```bash
# Autenticar
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.access_token')

# Obtener alertas
curl -X GET http://localhost:8000/api/alerts \
  -H "Authorization: Bearer $TOKEN"
```

### JavaScript

```javascript
// Autenticar
const response = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({username: 'admin', password: 'password'})
});
const {access_token} = await response.json();

// Usar API
const alerts = await fetch('http://localhost:8000/api/alerts', {
  headers: {'Authorization': `Bearer ${access_token}`}
});
console.log(await alerts.json());
```

## 🔗 Webhooks

ThreatGuard puede enviar notificaciones a URLs externas cuando ocurren eventos.

### Configurar Webhook

```http
POST /api/webhooks
```

**Request:**
```json
{
  "url": "https://tu-servidor.com/webhook",
  "events": ["alert.created", "vulnerability.found"],
  "secret": "tu_secret_para_verificar"
}
```

### Eventos Disponibles

- `alert.created` - Nueva alerta creada
- `alert.updated` - Alerta actualizada
- `vulnerability.found` - Nueva vulnerabilidad detectada
- `asset.offline` - Activo desconectado
- `scan.completed` - Escaneo completado

## 📚 SDK y Librerías

Librerías oficiales disponibles:

- **Python:** `pip install threatguard-sdk`
- **JavaScript:** `npm install threatguard-sdk`
- **Go:** `go get github.com/threatguard/go-sdk`

Para más información, consulta la [documentación de SDKs](SDK-Documentation).
