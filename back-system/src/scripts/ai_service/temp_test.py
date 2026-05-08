import requests, json, time
data = {'source_ip':'192.168.1.1','user_id':'test2','timestamp':'2026-05-08T12:00:10','event_type':'LOGIN','severity':'LOW','destination_port':80,'process_name':'sshd'}
for i in range(10):
    resp = requests.post('http://localhost:5001/predict_ensemble', json=data).json()
    if i == 9:
        print(json.dumps(resp, indent=2))
    else:
        print(f'{i+1}: collecting, remaining {resp["lstm_autoencoder"]["remaining"]}')
    time.sleep(0.2)
