import csv, json, sys, shutil, collections
src = sys.argv[1]; out = sys.argv[2]
rd = lambda f: list(csv.DictReader(open(f"{src}/{f}", encoding="utf-8-sig")))
ds, uses, papers = rd("reused_datasets.csv"), rd("dataset_uses.csv"), rd("papers.csv")
P = {p["id"]: p for p in papers}
by = collections.defaultdict(list)
for u in uses: by[u["dataset"]].append(u)
names = {d["dataset"] for d in ds}
missing = set(by) - names
assert not missing, missing
paper_out, used = {}, set()
out_ds = []
for d in ds:
    y = d["dataset_year_as_cited"]
    us = by[d["dataset"]]
    assert len({u["paper"] for u in us}) == int(d["papers_reusing"]), d["dataset"]
    for u in us: used.add(u["paper"])
    out_ds.append({
        "n": d["dataset"],
        "y": int(y) if y.isdigit() and y != "0000" else None,
        "a": "" if d["dataset_first_author"] == "Not stated in the paper" else d["dataset_first_author"],
        "r": d["reference"] if d["reference"] != "Not stated in the paper" else "",
        "al": [x.strip() for x in d["names_used_in_papers"].split(" | ") if x.strip() and x.strip() != d["dataset"]],
        "u": [[int(u["paper"]), 1 if u["owner"] == "same authors" else 0] for u in us],
    })
for pid in sorted(used, key=int):
    p = P[pid]
    paper_out[pid] = {"t": p["title"], "d": p["doi"], "v": p["venue"], "y": int(p["year"]),
                      "s": p["source_type"], "k": p["topic_level2"]}
blob = json.dumps({"datasets": out_ds, "papers": paper_out}, ensure_ascii=False, separators=(",", ":"))
open(f"{out}/data/datasets.js", "w", encoding="utf-8").write("window.REUSE_DATA=" + blob + ";\n")
for f in ("reused_datasets.csv", "dataset_uses.csv"): shutil.copy(f"{src}/{f}", f"{out}/data/{f}")
print(len(out_ds), "datasets,", sum(len(d["u"]) for d in out_ds), "uses,", len(paper_out), "papers")
