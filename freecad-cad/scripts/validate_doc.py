"""Dump validity, topology and size of every Part shape in FreeCAD documents.

Run it inside FreeCAD, one of:
    * freecad-mcp execute_code (paste this file's body; edit DOC_NAME if needed)
    * FreeCADCmd.exe scripts/validate_doc.py
    * execute_code_headless (reads the preloaded freecadcmd process -- open docs yourself)

It prints one `OBJ {...json...}` line per object plus a SUMMARY line.
`check()` may return a string or raise; both are captured. Null shapes are skipped.
"""

import json

import FreeCAD

# None = every open document; set to a document name to restrict.
DOC_NAME = None


def check_text(shape):
    try:
        result = shape.check()
        return "ok" if result is None else str(result)
    except Exception as exc:  # noqa: BLE001 - check() reports via exceptions too
        return f"EXC:{exc}"


def main():
    if DOC_NAME:
        docs = [FreeCAD.getDocument(DOC_NAME)]
    else:
        docs = list(FreeCAD.listDocuments().values())

    total = invalid = 0
    for doc in docs:
        for obj in doc.Objects:
            shape = getattr(obj, "Shape", None)
            if shape is None or shape.isNull():
                continue
            total += 1
            bb = shape.BoundBox
            record = {
                "doc": doc.Name,
                "name": obj.Name,
                "label": obj.Label,
                "valid": bool(shape.isValid()),
                "check": check_text(shape),
                "solids": len(shape.Solids),
                "faces": len(shape.Faces),
                "edges": len(shape.Edges),
                "volume": round(shape.Volume, 4),
                "bbox": [round(v, 4) for v in (bb.XLength, bb.YLength, bb.ZLength)],
            }
            if not record["valid"]:
                invalid += 1
            print("OBJ " + json.dumps(record, ensure_ascii=False))

    print(f"SUMMARY docs={len(docs)} objects={total} invalid={invalid}")


if __name__ == "__main__":
    main()
else:
    # Pasted into an execute_code call: run immediately.
    main()
