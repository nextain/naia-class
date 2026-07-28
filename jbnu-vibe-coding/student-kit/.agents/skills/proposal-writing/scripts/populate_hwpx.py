#!/usr/bin/env python3
"""Append an AI-written proposal manuscript to a Hancom-converted HWPX template.

This keeps every original package entry and appends ordinary HWPX paragraphs to
Contents/section0.xml. It also updates Preview/PrvText.txt so read-doc can verify
the actual generated content. No third-party Python package is required.
"""

from __future__ import annotations

import argparse
import os
import re
import tempfile
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

REQUIRED_ENTRIES = {
    "mimetype",
    "META-INF/container.xml",
    "Contents/content.hpf",
    "Contents/section0.xml",
}


def paragraph_xml(text: str, index: int, *, first: bool = False) -> str:
    safe = escape(text)
    page_break = "1" if first else "0"
    paragraph_id = 2_100_000_000 - index
    return (
        f'<hp:p id="{paragraph_id}" paraPrIDRef="43" styleIDRef="0" '
        f'pageBreak="{page_break}" columnBreak="0" merged="0">'
        f'<hp:run charPrIDRef="8"><hp:t>{safe}</hp:t></hp:run></hp:p>'
    )


def populate(template: Path, content_path: Path, output: Path) -> None:
    content = content_path.read_text(encoding="utf-8-sig").strip()
    if len(content) < 200:
        raise ValueError("proposal content must contain at least 200 characters")
    with zipfile.ZipFile(template, "r") as source:
        names = set(source.namelist())
        missing = sorted(REQUIRED_ENTRIES - names)
        if missing:
            raise ValueError(f"template is not a Hancom-converted HWPX; missing: {missing}")
        infos = source.infolist()
        payloads = {info.filename: source.read(info.filename) for info in infos}

    section = payloads["Contents/section0.xml"].decode("utf-8-sig")
    if "</hs:sec>" not in section or "xmlns:hp=" not in section:
        raise ValueError("unsupported section0.xml structure")
    lines = [line.rstrip() for line in content.splitlines()]
    manuscript = ["[AI 작성 제안서 — 교육용]"] + [line for line in lines if line.strip()]
    addition = "".join(paragraph_xml(line, index, first=index == 0) for index, line in enumerate(manuscript))
    section = section.replace("</hs:sec>", addition + "</hs:sec>", 1)
    payloads["Contents/section0.xml"] = section.encode("utf-8")

    preview_name = "Preview/PrvText.txt"
    previous_preview = payloads.get(preview_name, b"").decode("utf-8-sig", errors="replace").rstrip()
    payloads[preview_name] = (previous_preview + "\n\n" + "\n".join(manuscript) + "\n").encode("utf-8")

    output.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=output.stem + "-", suffix=".hwpx", dir=output.parent)
    os.close(fd)
    temp_output = Path(temp_name)
    try:
        with zipfile.ZipFile(temp_output, "w") as target:
            ordered = sorted(infos, key=lambda info: (info.filename != "mimetype", infos.index(info)))
            for info in ordered:
                data = payloads[info.filename]
                if info.filename == "mimetype":
                    info.compress_type = zipfile.ZIP_STORED
                target.writestr(info, data)
            if preview_name not in {info.filename for info in infos}:
                target.writestr(preview_name, payloads[preview_name], compress_type=zipfile.ZIP_DEFLATED)
        os.replace(temp_output, output)
    finally:
        if temp_output.exists():
            temp_output.unlink()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--template", required=True, type=Path)
    parser.add_argument("--content", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    populate(args.template.resolve(), args.content.resolve(), args.output.resolve())
    print(args.output.resolve())


if __name__ == "__main__":
    main()