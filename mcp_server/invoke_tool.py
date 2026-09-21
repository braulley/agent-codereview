"""Cliente MCP stdio: list_tools + call_tool (mesmo contrato do Inspector)."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

_REPO = Path(__file__).resolve().parents[1]
_SERVER = _REPO / "mcp_server" / "server.py"
_BACKEND = _REPO / "backend"


async def main() -> None:
    params = StdioServerParameters(
        command=sys.executable,
        args=[str(_SERVER)],
        cwd=str(_REPO),
        env={**os.environ, "PYTHONPATH": str(_BACKEND)},
    )
    payload = json.dumps(
        [
            {"severity": "CRITICAL"},
            {"severity": "HIGH"},
            {"severity": "HIGH"},
            {"severity": "MEDIUM"},
            {"severity": "LOW"},
            {"severity": "LOW"},
            {"severity": "LOW"},
        ]
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            init = await session.initialize()
            info = getattr(init, "server_info", None) or getattr(init, "serverInfo", None)
            print("server:", getattr(info, "name", "?"))
            listed = await session.list_tools()
            names = [t.name for t in listed.tools]
            print("tools:", names)
            result = await session.call_tool(
                "compute_code_health_score",
                {"alerts_json": payload},
            )
            print("call_tool content:")
            for block in result.content:
                text = getattr(block, "text", None)
                print(text if text is not None else block)


if __name__ == "__main__":
    asyncio.run(main())
