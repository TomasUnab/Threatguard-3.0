const express = require('express');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

// Configuración dinámica
const WAZUH_LOG_PATH = process.env.WAZUH_LOG_PATH || '/var/ossec/logs/alerts/alerts.json';

// Endpoint: Logs
const fs = require('fs');
app.get('/logs', (req, res) => {
  // Leer logs reales de Wazuh
  const logPath = WAZUH_LOG_PATH;
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'No se pudo leer el archivo de logs', details: err.message });
    }
    try {
      // El archivo puede tener múltiples líneas JSON
      const logs = data.split('\n').filter(Boolean).map(line => JSON.parse(line));
      res.json({ logs });
    } catch (parseErr) {
      res.status(500).json({ error: 'Error al parsear los logs', details: parseErr.message });
    }
  });
});

// Endpoint: Eventos
app.get('/events', (req, res) => {
  // TODO: Integrar con eventos de seguridad
  res.json({ events: 'Aquí irán los eventos de seguridad.' });
});

// Endpoint: Alertas
app.get('/alerts', (req, res) => {
  // Leer alertas reales de Wazuh
  const alertPath = WAZUH_LOG_PATH;
  fs.readFile(alertPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'No se pudo leer el archivo de alertas', details: err.message });
    }
    try {
      const alerts = data.split('\n').filter(Boolean).map(line => JSON.parse(line));
      res.json({ alerts });
    } catch (parseErr) {
      res.status(500).json({ error: 'Error al parsear las alertas', details: parseErr.message });
    }
  });
});

// Endpoint: Activos
app.get('/assets', (req, res) => {
  // TODO: Integrar con gestión de activos
  res.json({ assets: 'Aquí irán los activos.' });
});

// Endpoint: SOAR
app.get('/soar', (req, res) => {
  // TODO: Integrar con orquestación y automatización
  res.json({ soar: 'Aquí irán los playbooks y automatizaciones.' });
});

// Endpoint: Vulnerabilidades
app.get('/vulnerabilities', (req, res) => {
  // TODO: Integrar con gestión de vulnerabilidades
  res.json({ vulnerabilities: 'Aquí irán las vulnerabilidades.' });
});

// Endpoint: Chat IA
app.post('/chat', (req, res) => {
  // TODO: Integrar con asistente IA
  res.json({ reply: 'Aquí irá la respuesta del asistente IA.' });
});

// Endpoint: Reportes
app.get('/reports', (req, res) => {
  // TODO: Integrar con reportes
  res.json({ reports: 'Aquí irán los reportes.' });
});

// Endpoint: Configuración
app.get('/settings', (req, res) => {
  // TODO: Integrar con configuración
  res.json({ settings: 'Aquí irá la configuración.' });
});

const PORT = process.env.PORT || 8002;
app.listen(PORT, () => {
  console.log(`ThreatGuard backend API running on port ${PORT}`);
});
