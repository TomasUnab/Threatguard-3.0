@echo off
cd /d "C:\ThreatGuard\PAGINA WEB"
python -m http.server 3000 --bind 0.0.0.0
