#!/usr/bin/env python3
import os
import re
import sys
import shutil
import subprocess
from dataclasses import dataclass
from typing import Dict, Tuple, Optional

@dataclass
class VerifyResult:
    raw_output: str
    instance_identity_by_submod: Dict[str, str]  # e.g., {"CCA_REALM": "affirming", "CCA_SSD_PLATFORM": "affirming"}
    overall_affirming: bool
    returncode: int

def parse_instance_identity_status(text: str) -> Tuple[Dict[str, str], bool]:
    """
    Parse ARC verifier output and extract the 'Instance Identity' status for each submodule.

    Returns (per_submod_status, overall_affirming) where:
      - per_submod_status maps submod name -> status string (lowercased, e.g. 'affirming', 'warning', 'none', etc.)
      - overall_affirming is True iff all present submodules have status 'affirming'
    """
    per_submod: Dict[str, str] = {}
    current_submod: Optional[str] = None
    submod_header = re.compile(r"\s*submod\(([^)]+)\):\s*$")
    inst_identity_line = re.compile(r"\s*Instance Identity\s*\[([^\]]+)\]\s*:\s*(.*)$", re.IGNORECASE)

    for line in text.splitlines():
        m = submod_header.match(line)
        if m:
            current_submod = m.group(1).strip()
            continue
        if current_submod:
            mi = inst_identity_line.match(line)
            if mi:
                status = mi.group(1).strip().lower()
                per_submod[current_submod] = status
                # don't reset current_submod; there may be other lines in same section we ignore

    overall = bool(per_submod) and all(v == "affirming" for v in per_submod.values())
    return per_submod, overall


def run_arc_verify(
    arc_dir: str = "ear/arc",
    pkey_path: Optional[str] = None,
    jwt_path: Optional[str] = None,
    timeout: int = 120,
) -> VerifyResult:
    import pathlib, os, shutil, subprocess

    # Resolve paths safely
    arc_dir_abs = pathlib.Path(arc_dir).expanduser().resolve()
    home = pathlib.Path(os.path.expanduser("~")).resolve()

    pkey = pathlib.Path(pkey_path or home / "pkey.json")
    jwt = pathlib.Path(jwt_path or home / "attestation_result.jwt")

    if not arc_dir_abs.is_dir():
        raise FileNotFoundError(f"ARC directory not found: {arc_dir_abs}")
    arc_bin = arc_dir_abs / "arc"
    if not arc_bin.exists():
        raise FileNotFoundError(f"'arc' binary not found at {arc_bin}")
    if not os.access(arc_bin, os.X_OK):
        raise PermissionError(f"'arc' exists but is not executable: {arc_bin} (try: chmod +x '{arc_bin}')")
    if not pkey.exists():
        raise FileNotFoundError(f"pkey not found: {pkey}")
    if not jwt.exists():
        raise FileNotFoundError(f"JWT not found: {jwt}")

    # Run './arc' inside its directory
    cmd = ["./arc", "verify", "--pkey", str(pkey), str(jwt)]
    proc = subprocess.run(
        cmd,
        cwd=str(arc_dir_abs),
        text=True,
        capture_output=True,
        timeout=timeout,
    )
    output = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
    per_submod, overall = parse_instance_identity_status(output)

    return VerifyResult(
        raw_output=output,
        instance_identity_by_submod=per_submod,
        overall_affirming=overall,
        returncode=proc.returncode,
    )


def main():
    # Allow optional CLI overrides:
    #   python verify_instance_identity.py [arc_dir] [pkey_path] [jwt_path]
    arc_dir = sys.argv[1] if len(sys.argv) > 1 else "ear/arc"
    pkey_path = sys.argv[2] if len(sys.argv) > 2 else None
    jwt_path  = sys.argv[3] if len(sys.argv) > 3 else None

    try:
        result = run_arc_verify(arc_dir=arc_dir, pkey_path=pkey_path, jwt_path=jwt_path)
    except Exception as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(2)

    # Display a concise summary, plus per-submodule details for clarity.
    print("=== ARC Verify Output (truncated to decision) ===")
    if result.instance_identity_by_submod:
        for submod, status in result.instance_identity_by_submod.items():
            print(f"submod({submod}): Instance Identity -> {status}")
    else:
        print("No 'Instance Identity' lines found in output.")

    print("\nOverall Instance Identity Affirming:", "YES" if result.overall_affirming else "NO")

    # Exit status semantics:
    #   0 -> success AND overall affirming
    #   1 -> ran but not overall affirming
    #   2 -> local error (missing files, timeout, etc.)
    if result.overall_affirming and result.returncode == 0:
        sys.exit(0)
    else:
        # Still show raw output to aid debugging if it's not affirming
        print("\n--- Full Command Output ---\n")
        print(result.raw_output)
        sys.exit(1)

if __name__ == "__main__":
    main()
