
   Step 1 — Register the device in Django Admin

Go to http://yourdomain.com/admin
Click Car GPS Devices → Add
Fill in:

Car → select the car from dropdown
Device ID → type the device's serial number (found on the device label, e.g. GT06-SN-00123)
Is Active → checked


Click Save
Open the device record again → copy the api_key that was auto-generated

Step 2 — Configure the physical GPS device
Most affordable GPS trackers (GT06, TK103, Concox, Teltonika, Queclocator) support sending data to a custom server. You configure them via SMS commands or a desktop config tool.
The device needs to send HTTP POST requests to:
POST https://yourdomain.com/core/v1/gps/update/
Authorization: GPSKey <your_api_key>
Content-Type: application/json

{
  "latitude": 17.015385,
  "longitude": 54.090359,
  "speed": 60.5,
  "heading": 180.0,
  "altitude": 12.0,
  "accuracy": 5.0
}

Step 3 — Device-specific configuration
Different devices configure differently:
Teltonika (FMB series) — most flexible, recommended:
Configure via Teltonika Configurator software:
- Server → HTTP → URL: https://yourdomain.com/core/v1/gps/update/
- Header: Authorization: GPSKey your_api_key
- Send interval: 10 seconds
- Format: JSON
GT06 / GT02 — via SMS:
Send this SMS to the SIM card in the device:
SERVER#yourdomain.com#80#0#
APN#your_sim_apn#
TIMER#10#   (send every 10 seconds)
GT06 uses a binary TCP protocol by default though — for HTTP you need a device that supports HTTP mode or you need a middleware. See Step 4 below.
TK103 — via SMS:
adminip123456 yourdomain.com 80
Concox / JimiIoT:
Configure via their config tool or SMS:
- Platform server: yourdomain.com
- Port: 80 or 443
- Protocol: HTTP

Step 4 — If your device only supports TCP (not HTTP)
Cheap trackers like GT06 send raw binary TCP packets, not HTTP. In that case you need a small TCP listener on your Django server that translates the packets into your API format.
Add this to your backend as gps_tracking/tcp_listener.py:
pythonimport socket
import threading
import struct
import requests

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
Run it alongside Django:
bashpython gps_tracking/tcp_listener.py

Summary
Device typeProtocolWhat to doTeltonika FMBHTTPPoint directly to your APIConcox/JimiIoTHTTPPoint directly to your APIGT06 / TK103TCP binaryRun the TCP listener scriptAny deviceHTTPJust set URL + Authorization header
The most important thing is the device must support HTTP POST with custom headers so it can send the Authorization: GPSKey header. If buying a new device, get a Teltonika FMB920 or Concox GT06E — both support HTTP with custom headers out of the box.You said: i want to add vendor module where vendors can register their cars on the app for rent, and we will get a commission for each rentage.
