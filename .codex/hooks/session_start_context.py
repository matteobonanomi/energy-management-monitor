#!/usr/bin/env python3
import json

payload = {
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": (
            "Before editing, read AGENTS.md and the main product docs or README. "
            "Prefer small reversible changes, keep service boundaries readable, "
            "update tests for non-trivial behavior, and end with the relevant quality gates."
        ),
    }
}

print(json.dumps(payload))
