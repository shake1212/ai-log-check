import requests
from datetime import datetime

s = requests.Session()
s.headers.update({"Content-Type": "application/json"})
r = s.post("http://localhost:8080/api/auth/login", json={"username": "admin", "password": "123456"}, timeout=10)
s.headers["Authorization"] = f"Bearer {r.json()['token']}"
print("Logged in")

# Absolute minimum event
for etype in ["LOGIN_FAILURE", "NETWORK_CONNECTION", "SUSPICIOUS_ACTIVITY", "MALWARE_DETECTED"]:
    e = {
        "timestamp": datetime.now().isoformat(),
        "sourceSystem": "TEST",
        "eventType": etype,
        "category": "NETWORK",
        "severity": "MEDIUM",
        "rawMessage": "test",
    }
    resp = s.post("http://localhost:8080/api/events", json=e, timeout=10)
    print(f"{etype}: {resp.status_code}")
