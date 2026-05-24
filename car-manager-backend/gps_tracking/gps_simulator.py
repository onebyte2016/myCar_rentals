import requests
import time
import math
import random
import threading

API_URL = "http://127.0.0.1:8000/core/v1/gps/update/"

# ── Add one entry per car ────────────────────────────────
# Register each car's GPS device in Django Admin first
# and paste the generated api_key here
CARS = [
    {
        "name": "Audi R8 (Car 1)",
        "api_key": "470184efd0cbfd25e7c4574d003e2ea6e7febea50fa5181a64c37b6e55e7ef16",
        "base_lat": 17.015385,
        "base_lng": 54.090359,
        "radius": 0.005,      # how wide the circle is
        "speed_range": (20, 80),
        "phase": 0,           # offset so cars don't all start at same point
    },
    {
        "name": "Audi R8 (Car 2)",
        "api_key": "50429ed786f1e71b11efdd39ada21e542a87dc3465f6a802fb340cafedb2af31",
        "base_lat": 17.020000,
        "base_lng": 54.095000,
        "radius": 0.008,
        "speed_range": (30, 90),
        "phase": 120,         # 120 degrees offset
    },
    {
        "name": "Audi A4 (Car 3)",
        "api_key": "7d512c4dab0ef823906d80150f04775053cac862147cd548c61070b9ea3cda92",
        "base_lat": 17.010000,
        "base_lng": 54.085000,
        "radius": 0.006,
        "speed_range": (10, 60),
        "phase": 240,         # 240 degrees offset
    },
]


def simulate_car(car: dict):
    """Runs in its own thread — simulates one car moving in a circle."""
    step = 0
    name = car["name"]

    print(f"[{name}] Starting simulation...")

    while True:
        angle = math.radians(step * 5 + car["phase"])
        lat = car["base_lat"] + car["radius"] * math.sin(angle)
        lng = car["base_lng"] + car["radius"] * math.cos(angle)
        heading = (step * 10 + car["phase"]) % 360
        speed = round(random.uniform(*car["speed_range"]), 1)

        payload = {
            "latitude": round(lat, 6),
            "longitude": round(lng, 6),
            "speed": speed,
            "heading": heading,
            "altitude": round(random.uniform(10, 50), 1),
            "accuracy": round(random.uniform(3, 10), 1),
        }

        try:
            response = requests.post(
                API_URL,
                json=payload,
                headers={
                    "Authorization": f"GPSKey {car['api_key']}",
                    "Content-Type": "application/json",
                },
                timeout=5,
            )
            print(
                f"[{name}] Step {step} → "
                f"lat={payload['latitude']}, lng={payload['longitude']}, "
                f"speed={payload['speed']} km/h, heading={heading}° "
                f"→ {response.status_code}"
            )
        except Exception as e:
            print(f"[{name}] Error: {e}")

        step += 1
        time.sleep(10)  # each car sends every 10 seconds


if __name__ == "__main__":
    print("=" * 60)
    print(f"Simulating {len(CARS)} cars...")
    print("=" * 60)

    threads = []
    for car in CARS:
        t = threading.Thread(target=simulate_car, args=(car,), daemon=True)
        threads.append(t)
        t.start()
        time.sleep(1)  # slight delay so output doesn't mix up

    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nSimulator stopped.")




# import requests
# import time
# import math
# import random

# # ── Config ──────────────────────────────────────────────
# API_URL = "http://127.0.0.1:8000/core/v1/gps/update/"
# API_KEY = "470184efd0cbfd25e7c4574d003e2ea6e7febea50fa5181a64c37b6e55e7ef16"   # ← paste the key from Django Admin

# # Starting position (Salalah, Oman)
# BASE_LAT = 17.015385
# BASE_LNG = 54.090359

# # ── Simulate movement ────────────────────────────────────
# lat = BASE_LAT
# lng = BASE_LNG
# heading = 0.0
# step = 0

# print("GPS Simulator started. Sending location every 10 seconds...")
# print(f"Posting to: {API_URL}")
# print("-" * 50)

# while True:
#     # Slowly move in a circle
#     heading = (step * 10) % 360
#     lat = BASE_LAT + 0.005 * math.sin(math.radians(step * 5))
#     lng = BASE_LNG + 0.005 * math.cos(math.radians(step * 5))
#     speed = round(random.uniform(20, 80), 1)

#     payload = {
#         "latitude": round(lat, 6),
#         "longitude": round(lng, 6),
#         "speed": speed,
#         "heading": heading,
#         "altitude": round(random.uniform(10, 50), 1),
#         "accuracy": round(random.uniform(3, 10), 1),
#     }

#     try:
#         response = requests.post(
#             API_URL,
#             json=payload,
#             headers={
#                 "Authorization": f"GPSKey {API_KEY}",
#                 "Content-Type": "application/json",
#             },
#             timeout=5,
#         )
#         print(f"[Step {step}] Sent: lat={payload['latitude']}, lng={payload['longitude']}, "
#               f"speed={payload['speed']} km/h, heading={payload['heading']}° → {response.status_code}")
#     except Exception as e:
#         print(f"[Step {step}] Error: {e}")

#     step += 1
#     time.sleep(10)  # send every 10 seconds