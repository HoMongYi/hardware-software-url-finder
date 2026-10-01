"""Local ZIP integrity/allowlist check; standard-library only."""
import hashlib
import json
import re
import tarfile
import zipfile
from pathlib import Path, PurePosixPath

root = Path(__file__).resolve().parent.parent
dist = root / "dist"
expected = {
    "hardware-software-url-finder-v0.1.0-source.zip",
    "hsuf-agent-skill-v0.1.0.zip",
    "hsuf-codex-plugin-v0.1.0.zip",
    "hardware-software-url-finder-0.1.0.tgz",
}
manifest = json.loads((dist / "release-manifest.json").read_text(encoding="utf-8"))
assert manifest["license"] == "MIT"
assert manifest["repository"] == "https://github.com/HoMongYi/hardware-software-url-finder"
records = {item["name"]: item for item in manifest["artifacts"]}
assert set(records) == expected and len(manifest["artifacts"]) == len(expected)
sums = {}
for line in (dist / "SHA256SUMS.txt").read_text(encoding="utf-8").splitlines():
    digest, name = line.split("  ", 1)
    assert name not in sums and re.fullmatch(r"[a-f0-9]{64}", digest)
    sums[name] = digest
assert set(sums) == expected
assert {p.name for p in dist.iterdir() if p.suffix in (".zip", ".tgz")} == expected
license_bytes = (root / "LICENSE").read_bytes()
assert b"MIT License" in license_bytes and b"Copyright (c) 2026 HoMongYi" in license_bytes
findings = []

def check_path(name):
    path = PurePosixPath(name)
    assert not path.is_absolute() and ".." not in path.parts and "\\" not in name
    assert not re.match(r"^[A-Za-z]:", name)
    assert not {"private", "exports", "node_modules", ".cache", "baseline", ".git", ".npm-cache", ".superpowers"}.intersection(path.parts)
    assert not (path.name == ".env" or path.name.startswith(".env.")) or path.name == ".env.example"
    assert "confirmed-software-urls.csv" not in path.parts
    assert path.suffix.lower() not in {".pem", ".key", ".p12", ".pfx", ".dump", ".sql", ".sqlite", ".db"}

def check_content(name, data):
    text = data.decode("utf-8")
    vectors = ("/tests/" in "/" + name or name.endswith("SECURITY.md") or name.endswith("scripts/check-artifacts.py"))
    patterns = {
        "PRIVATE_KEY": r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        "TOKEN_LITERAL": r"\b(?:sk-[a-zA-Z0-9_-]{20,}|gh[pousr]_[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16})\b",
        "CREDENTIAL_ASSIGNMENT": r"""(?:api_key|apikey|password|access_token)\s*[:=]\s*["'][A-Za-z0-9_-]{24,}["']""",
        "INTERNAL_HOST": r"https?://(?:10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.169\.254|[^/\s]+\.(?:internal|corp))(?:[/:\s]|$)",
    }
    for code, pattern in patterns.items():
        if code == "INTERNAL_HOST" and vectors:
            continue
        if re.search(pattern, text, re.I if code == "CREDENTIAL_ASSIGNMENT" else 0):
            findings.append({"file": name, "code": code})
    if "/data/public/" in "/" + name and name.endswith(".json"):
        if re.search(r'"(?:product_no|source_product_no|example_product_no|customer_name|employee_name)"\s*:', text):
            findings.append({"file": name, "code": "CATALOGUE_FIELD"})

results = []
for name in sorted(expected):
    source = dist / name
    actual_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    assert source.stat().st_size == records[name]["bytes"]
    assert actual_hash == records[name]["sha256"] == sums[name]
    files = {}
    if name.endswith(".zip"):
        with zipfile.ZipFile(source) as archive:
            assert archive.testzip() is None
            for item in archive.infolist():
                check_path(item.filename)
                assert not item.is_dir() and item.filename not in files
                assert (item.external_attr >> 16) & 0o170000 != 0o120000
                files[item.filename] = archive.read(item)
    else:
        with tarfile.open(source, "r:gz") as archive:
            for item in archive.getmembers():
                check_path(item.name)
                assert item.isfile() and item.name not in files
                files[item.name] = archive.extractfile(item).read()
    for file_name, content in files.items():
        check_content(file_name, content)
    if name.endswith("-source.zip"):
        assert {"package.json", "LICENSE", "README.md", "CONTRIBUTING.md"}.issubset(files)
        assert not any(n.startswith("hardware-software-url-finder/") for n in files)
        metadata = json.loads(files["package.json"])
        assert metadata["license"] == "MIT" and "private" not in metadata
        assert files["LICENSE"] == license_bytes
    elif name.startswith("hsuf-agent-skill"):
        assert files["hardware-software-url-finder/LICENSE"] == license_bytes
        assert "hardware-software-url-finder/SKILL.md" in files
    elif name.startswith("hsuf-codex-plugin"):
        assert files["hardware-software-url-finder/LICENSE"] == license_bytes
        assert files["hardware-software-url-finder/runtime/LICENSE"] == license_bytes
        assert json.loads(files["hardware-software-url-finder/runtime/package.json"])["license"] == "MIT"
    else:
        assert files["package/LICENSE"] == license_bytes
        assert json.loads(files["package/package.json"])["license"] == "MIT"
    results.append({"name": name, "entries": len(files), "status": "Passed", "sha256": actual_hash})
assert not findings, findings
print(json.dumps({"status": "Passed", "source_layout": "flat", "leak_findings": 0, "secret_findings": 0, "artifacts": results}, indent=2))
