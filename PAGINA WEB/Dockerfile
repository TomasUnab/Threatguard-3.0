# Dockerfile para servir la web estática de ThreatGuard
FROM nginx:alpine
COPY ./index.html /usr/share/nginx/html/index.html
COPY ./header-utils.js /usr/share/nginx/html/header-utils.js
COPY ./alerts_(triage_center) /usr/share/nginx/html/alerts/
COPY ./ai_assistant_chat_modal /usr/share/nginx/html/ai_assistant_chat_modal/
COPY ./assets_(asset_&_asrm_mgmt.) /usr/share/nginx/html/assets/
COPY ./executive_summary /usr/share/nginx/html/executive_summary/
COPY ./reports /usr/share/nginx/html/reports/
COPY ./settings /usr/share/nginx/html/settings/
COPY ./soar_(automation_&_orchestration) /usr/share/nginx/html/soar/
COPY ./vulnerability_management /usr/share/nginx/html/vulnerability_management/
COPY nginx.conf /etc/nginx/conf.d/default.conf
