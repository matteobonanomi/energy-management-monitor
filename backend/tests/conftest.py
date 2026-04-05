from __future__ import annotations

import sys
from pathlib import Path

CURRENT = Path(__file__).resolve()
CANDIDATES = [CURRENT.parents[1], CURRENT.parents[2]]

for candidate in CANDIDATES:
    if (candidate / "app").exists():
        candidate_str = str(candidate)
        if candidate_str not in sys.path:
            sys.path.insert(0, candidate_str)
    if (candidate / "backend" / "app").exists():
        root_str = str(candidate)
        backend_str = str(candidate / "backend")
        if root_str not in sys.path:
            sys.path.insert(0, root_str)
        if backend_str not in sys.path:
            sys.path.insert(0, backend_str)
