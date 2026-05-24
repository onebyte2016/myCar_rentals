import socket
import threading
import struct
import requests

#If your device only supports TCP (not HTTP)
TCP_HOST = '0.0.0.0'
TCP_PORT = 5023  # open this port on your server firewall
API_URL = 'http://127.0.0.1:8000/core/v1/gps/update/'


def parse_gt06_packet(data: bytes) -> dict | None:
    """Basic GT06 location packet parser."""
    try:
        # GT06 location packet starts with 0x78 0x78
        if data[0] != 0x78 or data[1] != 0x78:
            return None
        # Protocol number 0x12 = location data
        if data[3] != 0x12:
            return None

        # Parse lat/lng from bytes 11-18
        lat_raw = struct.unpack('>I', data[11:15])[0] / 1800000.0
        lng_raw = struct.unpack('>I', data[15:19])[0] / 1800000.0
        speed = data[19]

        return {
            'latitude': round(lat_raw, 6),
            'longitude': round(lng_raw, 6),
            'speed': float(speed),
            'heading': 0.0,
        }
    except Exception:
        return None


def handle_client(conn, addr, api_key: str):
    print(f"Device connected: {addr}")
    try:
        while True:
            data = conn.recv(1024)
            if not data:
                break

            payload = parse_gt06_packet(data)
            if payload:
                requests.post(
                    API_URL,
                    json=payload,
                    headers={'Authorization': f'GPSKey {api_key}'},
                    timeout=5,
                )
                print(f"Forwarded: {payload}")
    finally:
        conn.close()


def start_tcp_server(api_key: str):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((TCP_HOST, TCP_PORT))
    server.listen(10)
    print(f"TCP listener running on port {TCP_PORT}")

    while True:
        conn, addr = server.accept()
        t = threading.Thread(
            target=handle_client,
            args=(conn, addr, api_key),
            daemon=True
        )
        t.start()


if __name__ == '__main__':
    # Run with: python tcp_listener.py
    API_KEY = 'your_device_api_key_here'
    start_tcp_server(API_KEY)