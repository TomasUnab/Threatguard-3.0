import os
import subprocess
import time
import pandas as pd
import requests

PCAP_DIR = os.path.join(os.path.dirname(__file__), '..', 'logs', 'Alamacenamiento')
FEATURES_DIR = os.path.join(os.path.dirname(__file__), '..', 'logs', 'features')
os.makedirs(FEATURES_DIR, exist_ok=True)

API_ENDPOINT = 'http://localhost:8000/predict'

TSHARK_FIELDS = [
    'frame.time', 'ip.src', 'ip.dst', 'tcp.srcport', 'tcp.dstport', 'udp.srcport', 'udp.dstport',
    'ip.proto', 'frame.len', 'tcp.flags', 'udp.length'
]
TSHARK_CMD_TEMPLATE = (
    'tshark -r "{pcap_file}" -T fields ' +
    ' '.join([f'-e {field}' for field in TSHARK_FIELDS]) +
    ' -E header=y -E separator=, > "{csv_file}"'
)

def convert_pcap_to_csv(pcap_file):
    base = os.path.basename(pcap_file)
    csv_file = os.path.join(FEATURES_DIR, base.replace('.pcap', '.csv'))
    cmd = TSHARK_CMD_TEMPLATE.format(pcap_file=pcap_file, csv_file=csv_file)
    print(f"Procesando {pcap_file} → {csv_file}")
    subprocess.run(cmd, shell=True, check=True)
    return csv_file

def send_flow_to_predict(flow_dict):
    try:
        response = requests.post(API_ENDPOINT, json=flow_dict)
        if response.status_code == 200:
            print(f"Predicción: {response.json()}")
        else:
            print(f"Error en predicción: {response.status_code}")
    except Exception as e:
        print(f"Error enviando flujo: {e}")

def process_csv_and_predict(csv_file):
    try:
        df = pd.read_csv(csv_file, on_bad_lines='skip')
        print(f"Procesando {len(df)} flujos")
        for idx, row in df.iterrows():
            tcp_flags_raw = row.get('tcp.flags', 0)
            if pd.isna(tcp_flags_raw):
                tcp_flags_raw = 0
            if isinstance(tcp_flags_raw, str):
                try:
                    tcp_flags = int(tcp_flags_raw, 16)
                except ValueError:
                    tcp_flags = 0
            else:
                tcp_flags = int(tcp_flags_raw or 0)

            def safe_int(val):
                return int(val) if not pd.isna(val) and val != '' else 0
            def safe_float(val):
                return float(val) if not pd.isna(val) and val != '' else 0.0

            flow = {
                'source_ip': row.get('ip.src', ''),
                'destination_ip': row.get('ip.dst', ''),
                'source_port': safe_int(row.get('tcp.srcport', row.get('udp.srcport', 0))),
                'destination_port': safe_int(row.get('tcp.dstport', row.get('udp.dstport', 0))),
                'protocol': safe_int(row.get('ip.proto', 0)),
                'flow_duration': 0.0,
                'total_fwd_packets': 0,
                'total_bwd_packets': 0,
                'total_length_fwd_packets': safe_float(row.get('frame.len', 0)),
                'total_length_bwd_packets': 0.0
            }
            send_flow_to_predict(flow)
    except Exception as e:
        print(f"Error procesando CSV: {e}")

def watcher():
    print("[PCAP Watcher] Iniciando monitoreo...")
    processed = set()
    while True:
        files = [f for f in os.listdir(PCAP_DIR) if f.endswith('.pcap')]
        for file in files:
            pcap_path = os.path.join(PCAP_DIR, file)
            if pcap_path not in processed:
                try:
                    csv_path = convert_pcap_to_csv(pcap_path)
                    process_csv_and_predict(csv_path)
                    if os.path.exists(pcap_path):
                        os.remove(pcap_path)
                    if os.path.exists(csv_path):
                        os.remove(csv_path)
                    processed.add(pcap_path)
                except Exception as e:
                    print(f"Error: {e}")
        time.sleep(10)

if __name__ == "__main__":
    watcher()
