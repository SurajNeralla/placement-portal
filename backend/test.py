import urllib.request
import json

def test():
    try:
        data = json.dumps({'email':'dean@gtu.edu', 'password':'dean123'}).encode('utf-8')
        req = urllib.request.Request('http://localhost:8000/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as f:
            res = json.loads(f.read().decode('utf-8'))
            token = res['access_token']
        print(f"Token: {token[:10]}...")

        req2 = urllib.request.Request('http://localhost:8000/api/dean/stats', headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req2) as f2:
            print(f"Stats Status: {f2.status}")
            print(f2.read().decode('utf-8'))
    except Exception as e:
        if hasattr(e, 'read'):
            print(f"Error HTTP: {e.code}")
            print(e.read().decode('utf-8'))
        else:
            print(f"Error: {e}")

if __name__ == '__main__':
    test()
