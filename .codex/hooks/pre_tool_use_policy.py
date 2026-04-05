#!/usr/bin/env python3
import json
import re
import sys

data = json.load(sys.stdin)
tool_input = data.get("tool_input") or {}
command = tool_input.get("command") or tool_input.get("cmd") or ""

dangerous_patterns = [
    r"\bsudo\b",
    r"\bsystemctl\b",
    r"\bkubectl\b",
    r"\bterraform\s+apply\b",
    r"\bhelm\s+upgrade\b",
    r"\brm\s+-rf\s+/\b",
]

for pattern in dangerous_patterns:
    if re.search(pattern, command):
        print(
            json.dumps(
                {
                    "systemMessage": (
                        f"Warning: command matches a restricted pattern ({pattern}). "
                        "Pause and confirm that this is really necessary."
                    )
                }
            )
        )
        break
