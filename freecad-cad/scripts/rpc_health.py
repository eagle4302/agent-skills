#!/usr/bin/env python3
"""Probe the FreeCADMCP XML-RPC server without going through an MCP client.

Use this when every `mcp__freecad__*` tool times out: it separates "the MCP
client/server is confused" from "FreeCAD itself is dead or showing a modal".

Exit codes:
    0  reachable and usable (ping OK, rpc_server running, gui_dispatch healthy or busy)
    2  unreachable / timed out (FreeCAD down, RPC not started, GUI hung)
    3  reachable but unusable (rpc_server stopped or gui_dispatch stuck)

`version_check` is added by the MCP server layer and is not part of the addon's
XML-RPC reply, so it is not reported here; use the MCP `get_rpc_status` for it.

Stdlib only; run with any Python 3.9+:
    python <skill>/scripts/rpc_health.py
    python <skill>/scripts/rpc_health.py --host 127.0.0.1 --port 9875 --timeout 5
"""

from __future__ import annotations

import argparse
import json
import socket
import sys
import xmlrpc.client


def main() -> int:
    parser = argparse.ArgumentParser(description="Check the FreeCADMCP RPC server.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=9875)
    parser.add_argument("--timeout", type=float, default=10.0,
                        help="Socket timeout in seconds (default 10).")
    args = parser.parse_args()

    socket.setdefaulttimeout(args.timeout)
    url = f"http://{args.host}:{args.port}"
    server = xmlrpc.client.ServerProxy(url, allow_none=True)

    try:
        ping = server.ping()
        status = server.get_rpc_status()
    except (ConnectionRefusedError, socket.timeout, TimeoutError, OSError) as exc:
        print(f"RPC_UNREACHABLE url={url} error={exc!r}")
        print("CHECK: is FreeCAD running? start-freecad.cmd / 9875 listening / "
              "GUI responsive (Get-Process freecad | Select Responding).")
        return 2
    except Exception as exc:  # xmlrpc fault, bad URL, protocol mismatch
        print(f"RPC_ERROR url={url} error={exc!r}")
        return 2

    try:
        documents = server.list_documents()
    except Exception as exc:  # GUI thread busy even though status answered
        documents = f"<list_documents failed: {exc!r}>"

    dispatch = status.get("gui_dispatch", {}) if isinstance(status, dict) else {}
    state = dispatch.get("state")
    usable = bool(ping) and status.get("rpc_server") == "running" and state in (None, "healthy", "busy")

    print(f"RPC_URL={url}")
    print(f"PING={ping}")
    print(f"RPC_SERVER={status.get('rpc_server')}")
    print(f"GUI_DISPATCH_STATE={state}")
    print(f"GUI_DISPATCH_OPERATION={dispatch.get('operation')}")
    print(f"GUI_DISPATCH_RUNNING_FOR={dispatch.get('running_for_seconds')}")
    print(f"ADDON_VERSION={status.get('addon_version')}")
    print(f"PROTOCOL_VERSION={status.get('protocol_version')}")
    print(f"DOCUMENTS={json.dumps(documents, ensure_ascii=False)}")
    if state == "busy":
        print("NOTE=gui_dispatch is busy (an operation is running); this is normal, wait and retry.")
    print(f"RESULT={'OK' if usable else 'UNHEALTHY'}")
    return 0 if usable else 3


if __name__ == "__main__":
    sys.exit(main())
