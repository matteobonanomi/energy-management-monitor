#!/usr/bin/env python3
import json
import subprocess


def run(cmd):
    try:
        return subprocess.check_output(cmd, stderr=subprocess.DEVNULL, text=True).strip()
    except Exception:
        return ""


changed = run(["git", "diff", "--name-only"])
msg = "Session ended."

if changed:
    msg = (
        "There are modified files in the workspace. Before considering the task done, "
        "make sure the relevant tests, builds, and config checks were run or explicitly called out."
    )

print(json.dumps({"continue": True, "systemMessage": msg}))
