"""
ThreatGuard Agent - Interfaz Gráfica Profesional
"""
import customtkinter as ctk
import threading
import time
from datetime import datetime
import os
import sys
from pystray import Icon, Menu, MenuItem
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class ThreatGuardAgentUI(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title("ThreatGuard Agent")
        self.geometry("650x600")
        self.resizable(False, False)
        self.protocol("WM_DELETE_WINDOW", self.hide_window)
        
        self.is_running = False
        self.master_ip = ctk.StringVar(value="192.168.1.100")
        self.master_port = ctk.StringVar(value="8000")
        self.agent_name = ctk.StringVar(value="agent-01")
        self.logs_sent = ctk.IntVar(value=0)
        
        self.load_config()
        self.setup_ui()
        self.setup_tray()
        
    def setup_ui(self):
        # Header mejorado
        header = ctk.CTkFrame(self, fg_color="#0f172a", height=110)
        header.pack(fill="x", padx=0, pady=0)
        
        title = ctk.CTkLabel(header, text="🛡️ ThreatGuard Agent", 
                            font=("Segoe UI", 32, "bold"),
                            text_color="#3b82f6")
        title.pack(pady=(20,5))
        
        subtitle = ctk.CTkLabel(header, text="Sistema de Monitoreo y Seguridad",
                               font=("Segoe UI", 12),
                               text_color="#94a3b8")
        subtitle.pack(pady=(0,20))
        
        # Status Panel profesional
        status_frame = ctk.CTkFrame(self, fg_color="#1e293b", corner_radius=15)
        status_frame.pack(fill="x", padx=30, pady=25)
        
        indicator_frame = ctk.CTkFrame(status_frame, fg_color="transparent")
        indicator_frame.grid(row=0, column=0, rowspan=3, padx=30, pady=25)
        
        self.status_indicator = ctk.CTkLabel(indicator_frame, text="●", 
                                            font=("Arial", 55), text_color="#ef4444")
        self.status_indicator.pack()
        
        info_frame = ctk.CTkFrame(status_frame, fg_color="transparent")
        info_frame.grid(row=0, column=1, sticky="w", padx=15, pady=25)
        
        ctk.CTkLabel(info_frame, text="ESTADO DEL AGENTE", 
                    font=("Segoe UI", 10, "bold"), 
                    text_color="#64748b").pack(anchor="w")
        
        self.status_label = ctk.CTkLabel(info_frame, text="Desconectado", 
                                        font=("Segoe UI", 22, "bold"),
                                        text_color="#ef4444")
        self.status_label.pack(anchor="w", pady=(8,0))
        
        self.server_label = ctk.CTkLabel(info_frame, text="No configurado", 
                                        font=("Segoe UI", 13),
                                        text_color="#94a3b8")
        self.server_label.pack(anchor="w", pady=(8,0))
        
        # Stats con cards
        stats_container = ctk.CTkFrame(self, fg_color="transparent")
        stats_container.pack(fill="x", padx=30, pady=15)
        
        card1 = ctk.CTkFrame(stats_container, fg_color="#1e293b", corner_radius=12)
        card1.pack(side="left", fill="both", expand=True, padx=(0,12))
        
        ctk.CTkLabel(card1, text="📊", font=("Arial", 28)).pack(pady=(20,8))
        self.logs_label = ctk.CTkLabel(card1, text="0", 
                                      font=("Segoe UI", 32, "bold"),
                                      text_color="#3b82f6")
        self.logs_label.pack()
        ctk.CTkLabel(card1, text="Logs Enviados",
                    font=("Segoe UI", 12),
                    text_color="#64748b").pack(pady=(5,20))
        
        card2 = ctk.CTkFrame(stats_container, fg_color="#1e293b", corner_radius=12)
        card2.pack(side="left", fill="both", expand=True, padx=(12,0))
        
        ctk.CTkLabel(card2, text="🕐", font=("Arial", 28)).pack(pady=(20,8))
        self.last_update = ctk.CTkLabel(card2, text="Nunca", 
                                       font=("Segoe UI", 16, "bold"),
                                       text_color="#3b82f6")
        self.last_update.pack()
        ctk.CTkLabel(card2, text="Última Actualización",
                    font=("Segoe UI", 12),
                    text_color="#64748b").pack(pady=(5,20))
        
        # Controls mejorados
        controls_frame = ctk.CTkFrame(self, fg_color="transparent")
        controls_frame.pack(fill="x", padx=30, pady=20)
        
        self.start_btn = ctk.CTkButton(controls_frame, text="▶  INICIAR AGENTE", 
                                      command=self.toggle_agent,
                                      font=("Segoe UI", 16, "bold"),
                                      height=55, 
                                      fg_color="#10b981",
                                      hover_color="#059669",
                                      corner_radius=12)
        self.start_btn.pack(side="left", padx=(0,12), expand=True, fill="x")
        
        ctk.CTkButton(controls_frame, text="⚙️  CONFIGURACIÓN", 
                     command=self.open_settings,
                     font=("Segoe UI", 16, "bold"),
                     height=55,
                     fg_color="#3b82f6",
                     hover_color="#2563eb",
                     corner_radius=12).pack(side="left", padx=(12,0), expand=True, fill="x")
        
        # Footer
        footer_frame = ctk.CTkFrame(self, fg_color="#0f172a", height=45)
        footer_frame.pack(side="bottom", fill="x")
        
        footer = ctk.CTkLabel(footer_frame, text="ThreatGuard Agent v1.0.0 | © 2024 ThreatGuard Security", 
                             font=("Segoe UI", 9), text_color="#475569")
        footer.pack(pady=14)
    
    def load_config(self):
        """Cargar configuración guardada"""
        import configparser
        if os.path.exists('config/agent.ini'):
            config = configparser.ConfigParser()
            config.read('config/agent.ini')
            if 'master' in config:
                self.master_ip.set(config.get('master', 'MASTER_IP', fallback='192.168.1.100'))
                self.master_port.set(config.get('master', 'MASTER_PORT', fallback='8000'))
            if 'agent' in config:
                self.agent_name.set(config.get('agent', 'AGENT_NAME', fallback='agent-01'))
    
    def setup_tray(self):
        """Configurar icono en system tray"""
        icon_path = os.path.join(os.path.dirname(__file__), 'assets', 'icon.ico')
        
        if os.path.exists(icon_path):
            icon_image = Image.open(icon_path)
        else:
            # Fallback: crear icono simple
            icon_image = Image.new('RGB', (64, 64), color='#3b82f6')
            draw = ImageDraw.Draw(icon_image)
            draw.rectangle([10, 10, 54, 54], fill='#10b981')
        
        menu = Menu(
            MenuItem('Mostrar', self.show_window),
            MenuItem('Iniciar Agente', self.start_agent_from_tray),
            MenuItem('Detener Agente', self.stop_agent),
            MenuItem('Salir', self.quit_app)
        )
        
        self.tray_icon = Icon("ThreatGuard", icon_image, "ThreatGuard Agent", menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()
    
    def hide_window(self):
        """Ocultar ventana al system tray"""
        self.withdraw()
    
    def show_window(self):
        """Mostrar ventana desde system tray"""
        self.deiconify()
        self.lift()
    
    def start_agent_from_tray(self):
        """Iniciar agente desde tray"""
        if not self.is_running:
            self.after(0, self.start_agent)
    
    def quit_app(self):
        """Cerrar aplicación completamente"""
        self.is_running = False
        self.tray_icon.stop()
        self.quit()
        
    def toggle_agent(self):
        if not self.is_running:
            self.start_agent()
        else:
            self.stop_agent()
            
    def start_agent(self):
        if self.master_ip.get() == "192.168.1.100":
            self.show_window()
            self.show_message("⚠️ Configuración Requerida", 
                            "Por favor, configura la IP del servidor maestro antes de iniciar.")
            self.open_settings()
            return
        
        self.is_running = True
        self.after(100, lambda: self.status_indicator.configure(text_color="#10b981"))
        self.after(100, lambda: self.status_label.configure(text="Conectado", text_color="#10b981"))
        self.after(100, lambda: self.server_label.configure(text=f"Servidor: {self.master_ip.get()}:{self.master_port.get()}"))
        self.after(100, lambda: self.start_btn.configure(text="⏸  DETENER AGENTE", fg_color="#ef4444", hover_color="#dc2626"))
        
        threading.Thread(target=self.agent_worker, daemon=True).start()
        
    def stop_agent(self):
        self.is_running = False
        # Notificar al servidor que el agente se está desconectando
        try:
            from log_agent_service import LogAgentService
            service = LogAgentService(
                master_ip=self.master_ip.get(),
                master_port=self.master_port.get(),
                agent_name=self.agent_name.get()
            )
            service.send_disconnect_notification()
        except Exception as e:
            print(f"Error notificando desconexión: {e}")
        
        self.after(100, lambda: self.status_indicator.configure(text_color="#ef4444"))
        self.after(100, lambda: self.status_label.configure(text="Desconectado", text_color="#ef4444"))
        self.after(100, lambda: self.start_btn.configure(text="▶  INICIAR AGENTE", fg_color="#10b981", hover_color="#059669"))
        
    def agent_worker(self):
        try:
            from log_agent_service import LogAgentService
            
            service = LogAgentService(
                master_ip=self.master_ip.get(),
                master_port=self.master_port.get(),
                agent_name=self.agent_name.get()
            )
            
            while self.is_running:
                try:
                    count = service.run_cycle()
                    self.logs_sent.set(self.logs_sent.get() + count)
                    self.logs_label.configure(text=str(self.logs_sent.get()))
                    self.last_update.configure(text=datetime.now().strftime('%H:%M:%S'))
                    time.sleep(60)  # Heartbeat cada 60 segundos
                except Exception as e:
                    print(f"Error en ciclo: {e}")
                    time.sleep(10)
        except Exception as e:
            print(f"Error iniciando servicio: {e}")
            self.after(0, self.stop_agent)
    
    def show_message(self, title, message):
        dialog = ctk.CTkToplevel(self)
        dialog.title(title)
        dialog.geometry("450x220")
        dialog.resizable(False, False)
        dialog.transient(self)
        dialog.grab_set()
        
        ctk.CTkLabel(dialog, text=title, font=("Segoe UI", 18, "bold")).pack(pady=25)
        ctk.CTkLabel(dialog, text=message, font=("Segoe UI", 13), wraplength=380).pack(pady=15)
        ctk.CTkButton(dialog, text="Aceptar", command=dialog.destroy,
                     height=45, font=("Segoe UI", 14, "bold"),
                     fg_color="#3b82f6", corner_radius=10).pack(pady=20, padx=40, fill="x")
                
    def open_settings(self):
        SettingsDialog(self)

class SettingsDialog(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        
        self.parent = parent
        self.title("Configuración")
        self.geometry("480x500")
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()
        
        ctk.CTkLabel(self, text="⚙️ Configuración del Agente", 
                    font=("Segoe UI", 22, "bold")).pack(pady=25)
        
        form = ctk.CTkFrame(self, fg_color="#1e293b", corner_radius=12)
        form.pack(fill="both", padx=25, pady=15, expand=True)
        
        ctk.CTkLabel(form, text="IP del Servidor Maestro:", 
                    font=("Segoe UI", 13, "bold")).pack(anchor="w", padx=20, pady=(20,5))
        ctk.CTkEntry(form, textvariable=parent.master_ip, 
                    font=("Segoe UI", 13), height=40).pack(fill="x", padx=20, pady=5)
        
        ctk.CTkLabel(form, text="Puerto:", 
                    font=("Segoe UI", 13, "bold")).pack(anchor="w", padx=20, pady=(15,5))
        ctk.CTkEntry(form, textvariable=parent.master_port, 
                    font=("Segoe UI", 13), height=40).pack(fill="x", padx=20, pady=5)
        
        ctk.CTkLabel(form, text="Nombre del Agente:", 
                    font=("Segoe UI", 13, "bold")).pack(anchor="w", padx=20, pady=(15,5))
        ctk.CTkEntry(form, textvariable=parent.agent_name, 
                    font=("Segoe UI", 13), height=40).pack(fill="x", padx=20, pady=(5,20))
        
        # Botones
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=20, padx=25, fill="x")
        
        ctk.CTkButton(btn_frame, text="💾  GUARDAR", command=self.save,
                     font=("Segoe UI", 15, "bold"),
                     height=50, fg_color="#10b981", hover_color="#059669",
                     corner_radius=10).pack(side="left", expand=True, fill="x", padx=(0,10))
        
        ctk.CTkButton(btn_frame, text="✖  CANCELAR", command=self.destroy,
                     font=("Segoe UI", 15, "bold"),
                     height=50, fg_color="#64748b", hover_color="#475569",
                     corner_radius=10).pack(side="left", expand=True, fill="x", padx=(10,0))
        
    def save(self):
        try:
            import configparser
            config = configparser.ConfigParser()
            config['master'] = {
                'MASTER_IP': self.parent.master_ip.get(),
                'MASTER_PORT': self.parent.master_port.get()
            }
            config['agent'] = {
                'AGENT_NAME': self.parent.agent_name.get()
            }
            
            config_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config')
            os.makedirs(config_dir, exist_ok=True)
            config_path = os.path.join(config_dir, 'agent.ini')
            
            with open(config_path, 'w') as f:
                config.write(f)
            
            print(f"Configuración guardada en: {config_path}")
            self.destroy()
        except Exception as e:
            print(f"Error guardando configuración: {e}")

if __name__ == "__main__":
    app = ThreatGuardAgentUI()
    app.mainloop()
