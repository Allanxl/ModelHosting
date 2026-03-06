import time
import subprocess
import json
import os

TOKEN = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN")
REPO = "Allanxl/ModelHosting"

def check_status():
    cmd = [
        "curl", "-s",
        "-H", f"Authorization: Bearer {TOKEN}",
        "-H", "Accept: application/vnd.github+json",
        f"https://api.github.com/repos/{REPO}/actions/runs?per_page=1"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        return None
    try:
        data = json.loads(res.stdout)
        runs = data.get('workflow_runs', [])
        if not runs:
            return None
        return runs[0]
    except:
        return None

print("Monitoring started...")
while True:
    run = check_status()
    if run:
        status = run['status']
        conclusion = run['conclusion']
        print(f"Latest run ID: {run['id']}, Status: {status}, Conclusion: {conclusion}")
        
        if status == 'completed':
            if conclusion == 'success':
                print("WORKFLOW_SUCCESS")
                break
            else:
                print("WORKFLOW_FAILED")
                # Wait for next manual fix or exit to let agent know
                break
        else:
            print("In progress... waiting 120 seconds.")
    else:
        print("Error fetching status.")
    
    time.sleep(120)
