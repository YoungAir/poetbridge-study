#!/usr/bin/env python3
"""Extract the four selected poems and study prompts from the frozen exam."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tang300_baseline_results.jsonl"
OUTPUT = Path(__file__).resolve().parent / "study-items.json"

BRIDGES = {
    "Tang_Baseline_130": {
        "title": "江雪",
        "author": "柳宗元",
        "verse": "孤舟蓑笠翁，独钓寒江雪。",
        "source": "《江雪》",
    },
    "Tang_Baseline_099": {
        "title": "终南别业",
        "author": "王维",
        "verse": "行到水穷处，坐看云起时。",
        "source": "《终南别业》",
    },
    "Tang_Baseline_045": {
        "title": "送元二使安西",
        "author": "王维",
        "verse": "劝君更尽一杯酒，西出阳关无故人。",
        "source": "《送元二使安西》",
    },
    "Tang_Baseline_072": {
        "title": "琵琶行",
        "author": "白居易",
        "verse": "东船西舫悄无言，唯见江心秋月白。",
        "source": "《琵琶行》",
    },
}


def main() -> None:
    selected = set(BRIDGES)
    records = {}
    with SOURCE.open("r", encoding="utf-8-sig") as stream:
        for line in stream:
            if not line.strip():
                continue
            record = json.loads(line)
            task_id = record.get("task_id")
            if task_id in selected:
                poem = record["poem"]
                records[task_id] = {
                    "id": task_id,
                    "title": poem["title"],
                    "author": poem["author"],
                    "content": poem["content"],
                    "notes": record["knowledge_condition"]["visible_partial_notes"][:2],
                    "questions": [
                        {
                            "id": question["q_id"],
                            "layer": question["layer"],
                            "text": question["question"],
                        }
                        for question in record["teacher_questions"]
                    ],
                    "bridge": BRIDGES[task_id],
                }

    missing = selected - records.keys()
    if missing:
        raise SystemExit(f"Selected task IDs not found in frozen exam: {', '.join(sorted(missing))}")
    data = {
        "source": "tang300_baseline_results.jsonl",
        "notes_per_poem": 2,
        "poems": [records[task_id] for task_id in BRIDGES],
    }
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(data['poems'])} poems to {OUTPUT}")


if __name__ == "__main__":
    main()
