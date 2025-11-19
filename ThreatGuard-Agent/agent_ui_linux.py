#!/usr/bin/env python3
"""
ThreatGuard Agent - Interfaz Gráfica para Linux
GUI multiplataforma usando Tkinter
"""
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import configparser
import threading
import time
import requests
import psutil
import platform
import socket
from datetime import datetime
import json
import os
import sys

class ThreatGuardAgentGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("ThreatGuard Agent - Linux")
        self.root.geometry("800x600")
        self.root.resizable(True, True)
        
        # Variables
        self.is_running = False
        self.agent_thread = None
        self.config_path = "config/agent.ini"
        
        # Colores tema oscuro
        self.bg_dark = "#1e1e1e"
        self.bg_widget = "#2d2d2d"
        self.fg_color = "#ffffff"
        self.accent_color = "#0d7377"
        self.success_color = "#4caf50"
        self.error_color = "#f44336"
        
        # Configurar estilo
        self.setup_style()
        
        # Crear interfaz
        self.create_widgets()
        
        # Cargar configuración
        self.load_config()
        
        # Actualizar estado cada segundo
        self.update_status()
    
    def setup_style(self):
        """Configurar estilos de la interfaz"""
        style = ttk.Style()
        style.theme_use('clam')
        
        # Configurar colores
        style.configure('TFrame', background=self.bg_dark)
        style.configure('TLabel', background=self.bg_dark, foreground=self.fg_color)
        style.configure('TButton', background=self.accent_color, foreground=self.fg_color)
        style.map('TButton', background=[('active', '#14a085')])
        style.configure('Success.TButton', background=self.success_color)
        style.configure('Error.TButton', background=self.error_color)
        
        self.root.configure(bg=self.bg_dark)
    
    def create_widgets(self):
        """Crear widgets de la interfaz"""
        # Frame principal
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configurar expansión
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.rowconfigure(3, weight=1)
        
        # ===== SECCIÓN 1: INFORMACIÓN DEL SISTEMA =====
        info_frame = ttk.LabelFrame(main_frame, text="📊 Información del Sistema", padding="10")
        info_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=5)
        info_frame.columnconfigure(1, weight=1)
        
        # Hostname
        ttk.Label(info_frame, text="Hostname:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.hostname_label = ttk.Label(info_frame, text=socket.gethostname(), font=('Arial', 10, 'bold'))
        self.hostname_label.grid(row=0, column=1, sticky=tk.W, pady=2)
        
        # IP Local
        ttk.Label(info_frame, text="IP Local:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.ip_label = ttk.Label(info_frame, text=self.get_local_ip(), font=('Arial', 10, 'bold'))
        self.ip_label.grid(row=1, column=1, sticky=tk.W, pady=2)
        
        # Sistema Operativo
        ttk.Label(info_frame, text="Sistema:").grid(row=2, column=0, sticky=tk.W, pady=2)
        os_info = f"{platform.system()} {platform.release()}"
        self.os_label = ttk.Label(info_frame, text=os_info, font=('Arial', 10, 'bold'))
        self.os_label.grid(row=2, column=1, sticky=tk.W, pady=2)
        
        # ===== SECCIÓN 2: CONFIGURACIÓN DEL AGENTE =====
        config_frame = ttk.LabelFrame(main_frame, text="⚙️ Configuración del Agente", padding="10")
        config_frame.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=5)
        config_frame.columnconfigure(1, weight=1)
        
        # IP del Maestro
        ttk.Label(config_frame, text="IP del Servidor:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.master_ip_entry = ttk.Entry(config_frame, width=30)
        self.master_ip_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), pady=5, padx=5)
        
        # Puerto
        ttk.Label(config_frame, text="Puerto:").grid(row=0, column=2, sticky=tk.W, pady=5, padx=(10, 0))
        self.master_port_entry = ttk.Entry(config_frame, width=10)
        self.master_port_entry.grid(row=0, column=3, sticky=tk.W, pady=5, padx=5)
        
        # Nombre del Agente
        ttk.Label(config_frame, text="Nombre del Agente:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.agent_name_entry = ttk.Entry(config_frame, width=30)
        self.agent_name_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), pady=5, padx=5)
        
        # Token
        ttk.Label(config_frame, text="Token:").grid(row=2, column=0, sticky=tk.W, pady=5)
        self.token_entry = ttk.Entry(config_frame, width=50, show="*")
        self.token_entry.grid(row=2, column=1, columnspan=3, sticky=(tk.W, tk.E), pady=5, padx=5)
        
        # Botón guardar configuración
        save_btn = ttk.Button(config_frame, text="💾 Guardar Configuración", command=self.save_config)
        save_btn.grid(row=3, column=0, columnspan=4, pady=10)
        
        # ===== SECCIÓN 3: CONTROL DEL AGENTE =====
        control_frame = ttk.LabelFrame(main_frame, text="🎮 Control del Agente", padding="10")
        control_frame.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=5)
        
        # Estado
        status_inner = ttk.Frame(control_frame)
        status_inner.pack(fill=tk.X, pady=5)
        
        ttk.Label(status_inner, text="Estado:").pack(side=tk.LEFT, padx=5)
        self.status_label = ttk.Label(status_inner, text="● Detenido", 
                                      foreground=self.error_color, 
                                      font=('Arial', 12, 'bold'))
        self.status_label.pack(side=tk.LEFT, padx=5)
        
        # Botones de control
        btn_frame = ttk.Frame(control_frame)
        btn_frame.pack(fill=tk.X, pady=10)
        
        self.start_btn = ttk.Button(btn_frame, text="▶️ Iniciar Agente", 
                                     command=self.start_agent, style='Success.TButton')
        self.start_btn.pack(side=tk.LEFT, padx=5, expand=True, fill=tk.X)
        
        self.stop_btn = ttk.Button(btn_frame, text="⏹️ Detener Agente", 
                                    command=self.stop_agent, style='Error.TButton', state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT, padx=5, expand=True, fill=tk.X)
        
        ttk.Button(btn_frame, text="🔄 Reiniciar", command=self.restart_agent).pack(
            side=tk.LEFT, padx=5, expand=True, fill=tk.X)
        
        # ===== SECCIÓN 4: LOGS =====
        log_frame = ttk.LabelFrame(main_frame, text="📋 Logs del Agente", padding="10")
        log_frame.grid(row=3, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)
        log_frame.rowconfigure(0, weight=1)
        log_frame.columnconfigure(0, weight=1)
        
        # Área de texto para logs
        self.log_text = scrolledtext.ScrolledText(log_frame, height=15, wrap=tk.WORD,
                                                   bg=self.bg_widget, fg=self.fg_color,
                                                   font=('Courier', 9))
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Botones de logs
        log_btn_frame = ttk.Frame(log_frame)
        log_btn_frame.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=5)
        
        ttk.Button(log_btn_frame, text="🗑️ Limpiar Logs", command=self.clear_logs).pack(
            side=tk.LEFT, padx=5)
        ttk.Button(log_btn_frame, text="💾 Guardar Logs", command=self.save_logs).pack(
            side=tk.LEFT, padx=5)
        
        # ===== BARRA DE ESTADO =====
        status_bar = ttk.Frame(main_frame)
        status_bar.grid(row=4, column=0, sticky=(tk.W, tk.E), pady=(5, 0))
        
        self.status_bar_label = ttk.Label(status_bar, text="ThreatGuard Agent v1.0 | Listo", 
                                          font=('Arial', 8))
        self.status_bar_label.pack(side=tk.LEFT)
        
        self.connection_label = ttk.Label(status_bar, text="❌ Desconectado", 
                                         foreground=self.error_color,
                                         font=('Arial', 8))
        self.connection_label.pack(side=tk.RIGHT)
    
    def get_local_ip(self):
        """Obtener IP local del sistema"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"
    
    def load_config(self):
        """Cargar configuración desde agent.ini"""
        try:
            config = configparser.ConfigParser()
            if os.path.exists(self.config_path):
                config.read(self.config_path)
                self.master_ip_entry.insert(0, config.get('master', 'MASTER_IP', fallback='192.168.1.100'))
                self.master_port_entry.insert(0, config.get('master', 'MASTER_PORT', fallback='8000'))
                self.agent_name_entry.insert(0, config.get('agent', 'AGENT_NAME', fallback=socket.gethostname()))
                self.token_entry.insert(0, config.get('security', 'AGENT_TOKEN', fallback=''))
                self.log("✅ Configuración cargada desde agent.ini")
            else:
                self.log("⚠️ Archivo agent.ini no encontrado. Usando valores por defecto.")
                self.master_ip_entry.insert(0, '192.168.1.100')
                self.master_port_entry.insert(0, '8000')
                self.agent_name_entry.insert(0, socket.gethostname())
        except Exception as e:
            self.log(f"❌ Error cargando configuración: {e}")
    
    def save_config(self):
        """Guardar configuración en agent.ini"""
        try:
            config = configparser.ConfigParser()
            config['master'] = {
                'MASTER_IP': self.master_ip_entry.get(),
                'MASTER_PORT': self.master_port_entry.get()
            }
            config['agent'] = {
                'AGENT_NAME': self.agent_name_entry.get(),
                'AGENT_IP': 'auto'
            }
            config['security'] = {
                'AGENT_TOKEN': self.token_entry.get()
            }
            config['monitoring'] = {
                'REPORT_INTERVAL': '60',
                'COLLECT_LOGS': 'true',
                'COLLECT_METRICS': 'true'
            }
            
            os.makedirs('config', exist_ok=True)
            with open(self.config_path, 'w') as f:
                config.write(f)
            
            self.log("✅ Configuración guardada exitosamente")
            messagebox.showinfo("Éxito", "Configuración guardada correctamente")
        except Exception as e:
            self.log(f"❌ Error guardando configuración: {e}")
            messagebox.showerror("Error", f"No se pudo guardar la configuración:\n{e}")
    
    def start_agent(self):
        """Iniciar el agente"""
        if self.is_running:
            messagebox.showwarning("Advertencia", "El agente ya está en ejecución")
            return
        
        self.is_running = True
        self.start_btn.config(state=tk.DISABLED)
        self.stop_btn.config(state=tk.NORMAL)
        self.status_label.config(text="● Ejecutando", foreground=self.success_color)
        
        self.log("🚀 Iniciando agente ThreatGuard...")
        self.agent_thread = threading.Thread(target=self.agent_loop, daemon=True)
        self.agent_thread.start()
    
    def stop_agent(self):
        """Detener el agente"""
        self.is_running = False
        self.start_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)
        self.status_label.config(text="● Detenido", foreground=self.error_color)
        self.connection_label.config(text="❌ Desconectado", foreground=self.error_color)
        self.log("⏹️ Agente detenido")
    
    def restart_agent(self):
        """Reiniciar el agente"""
        if self.is_running:
            self.stop_agent()
            time.sleep(1)
        self.start_agent()
    
    def agent_loop(self):
        """Loop principal del agente"""
        master_url = f"http://{self.master_ip_entry.get()}:{self.master_port_entry.get()}"
        
        while self.is_running:
            try:
                # Recolectar métricas
                data = {
                    'agent_name': self.agent_name_entry.get(),
                    'agent_ip': self.get_local_ip(),
                    'hostname': socket.gethostname(),
                    'os': f"{platform.system()} {platform.release()}",
                    'timestamp': datetime.now().isoformat(),
                    'cpu_percent': psutil.cpu_percent(interval=1),
                    'memory_percent': psutil.virtual_memory().percent,
                    'disk_percent': psutil.disk_usage('/').percent,
                    'network_sent': psutil.net_io_counters().bytes_sent,
                    'network_recv': psutil.net_io_counters().bytes_recv
                }
                
                # Enviar al servidor
                headers = {'Authorization': f'Bearer {self.token_entry.get()}'}
                response = requests.post(f"{master_url}/agent/report", 
                                       json=data, headers=headers, timeout=5)
                
                if response.status_code == 200:
                    self.root.after(0, self.update_connection_status, True)
                    self.log(f"✅ Datos enviados correctamente (CPU: {data['cpu_percent']:.1f}%, RAM: {data['memory_percent']:.1f}%)")
                else:
                    self.log(f"⚠️ Respuesta del servidor: {response.status_code}")
                    self.root.after(0, self.update_connection_status, False)
                
            except requests.exceptions.ConnectionError:
                self.log(f"❌ No se puede conectar al servidor {master_url}")
                self.root.after(0, self.update_connection_status, False)
            except Exception as e:
                self.log(f"❌ Error: {e}")
                self.root.after(0, self.update_connection_status, False)
            
            # Esperar 60 segundos
            for _ in range(60):
                if not self.is_running:
                    break
                time.sleep(1)
    
    def update_connection_status(self, connected):
        """Actualizar estado de conexión"""
        if connected:
            self.connection_label.config(text="✅ Conectado", foreground=self.success_color)
            self.status_bar_label.config(text=f"ThreatGuard Agent | Última actualización: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        else:
            self.connection_label.config(text="❌ Desconectado", foreground=self.error_color)
    
    def update_status(self):
        """Actualizar estado del sistema cada segundo"""
        if self.is_running:
            cpu = psutil.cpu_percent(interval=0.1)
            mem = psutil.virtual_memory().percent
            self.status_bar_label.config(text=f"ThreatGuard Agent | CPU: {cpu:.1f}% | RAM: {mem:.1f}%")
        
        self.root.after(1000, self.update_status)
    
    def log(self, message):
        """Agregar mensaje al log"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {message}\n"
        self.log_text.insert(tk.END, log_message)
        self.log_text.see(tk.END)
    
    def clear_logs(self):
        """Limpiar el área de logs"""
        self.log_text.delete(1.0, tk.END)
        self.log("📋 Logs limpiados")
    
    def save_logs(self):
        """Guardar logs en archivo"""
        try:
            os.makedirs('logs', exist_ok=True)
            filename = f"logs/agent_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
            with open(filename, 'w') as f:
                f.write(self.log_text.get(1.0, tk.END))
            self.log(f"💾 Logs guardados en: {filename}")
            messagebox.showinfo("Éxito", f"Logs guardados en:\n{filename}")
        except Exception as e:
            self.log(f"❌ Error guardando logs: {e}")
            messagebox.showerror("Error", f"No se pudieron guardar los logs:\n{e}")

def main():
    """Función principal"""
    # Verificar si se está ejecutando con privilegios
    if os.geteuid() == 0 if hasattr(os, 'geteuid') else True:
        print("⚠️ Advertencia: Ejecutando con privilegios elevados")
    
    root = tk.Tk()
    app = ThreatGuardAgentGUI(root)
    
    # Manejar cierre de ventana
    def on_closing():
        if app.is_running:
            if messagebox.askokcancel("Salir", "El agente está en ejecución. ¿Deseas detenerlo y salir?"):
                app.stop_agent()
                root.destroy()
        else:
            root.destroy()
    
    root.protocol("WM_DELETE_WINDOW", on_closing)
    root.mainloop()

if __name__ == "__main__":
    main()
