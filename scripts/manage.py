#!/usr/bin/env python3
"""LeoneSIS operations helper.

Commands:
    health   Wait for the application health endpoint.
    smoke    Sign in as the platform administrator and exercise the main APIs.
    demo     Verify every seeded demo login.
    up       Build and start the Docker Compose stack.
    down     Stop the stack (data volumes are kept).
    ps       Show container status.
    logs     Follow application logs.

The application URL defaults to http://localhost:<APP_PORT from .env, or 8080>
and can be overridden with --url, LEONESIS_URL, or the legacy SCHOOLMS_URL
environment variable.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def default_url() -> str:
    configured = os.environ.get("LEONESIS_URL") or os.environ.get("SCHOOLMS_URL")
    if configured:
        return configured.rstrip("/")
    port = os.environ.get("APP_PORT")
    if not port:
        env_file = ROOT / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                if line.strip().startswith("APP_PORT="):
                    port = line.split("=", 1)[1].strip()
    return f"http://localhost:{port or '8080'}"


DEFAULT_URL = default_url()


class ApiError(RuntimeError):
    def __init__(self, status: int, message: str):
        super().__init__(f"HTTP {status}: {message}")
        self.status = status
        self.message = message


def api(base: str, method: str, path: str, token: str | None = None, body=None):
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw)
            message = parsed.get("error") or parsed.get("message") or raw
        except json.JSONDecodeError:
            message = raw or exc.reason
        raise ApiError(exc.code, str(message)) from None
    except urllib.error.URLError as exc:
        raise ApiError(0, f"Cannot reach {base}: {exc.reason}") from None
    except OSError as exc:
        raise ApiError(0, f"Cannot reach {base}: {exc}") from None


def check(label: str, condition, detail: str = "") -> bool:
    if condition:
        print(f"  \033[32m✓\033[0m {label}" + (f" — {detail}" if detail else ""))
        return True
    print(f"  \033[31m✗\033[0m {label}" + (f" — {detail}" if detail else ""))
    return False


def login(base: str, username: str, password: str = "password") -> dict:
    payload = api(base, "POST", "/api/auth/login", body={"username": username, "password": password})
    if not payload.get("token"):
        raise ApiError(0, f"Login for {username} returned no token")
    return payload


def wait_for_health(base: str, timeout: int = 180) -> bool:
    print(f"Waiting for {base}/api/health …")
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        try:
            payload = api(base, "GET", "/api/health")
            if payload.get("status") in {"UP", "ok", "OK"} or payload.get("database") == "UP":
                print(f"\033[32m✓\033[0m Application is healthy: {json.dumps(payload)}")
                return True
            last = payload
        except ApiError as exc:
            last = exc.message
        time.sleep(2)
    print(f"\033[31m✗\033[0m Health check timed out. Last result: {last}")
    return False


def command_smoke(base: str) -> int:
    print(f"LeoneSIS smoke test → {base}\n")
    failures = 0

    try:
        session = login(base, "vlolleh", "password")
    except ApiError as exc:
        print(f"\033[31m✗\033[0m Platform login failed — {exc}")
        return 1
    token = session["token"]
    user = session["user"]
    failures += 0 if check("Platform administrator signs in", user.get("role") == "SUPER_ADMIN",
                           f"{user.get('fullName')} · @{user.get('username')}") else 1

    meta = api(base, "GET", "/api/meta", token=token)
    schools = meta.get("schools") or []
    failures += 0 if check("Schools are listed", bool(schools), f"{len(schools)} school(s)") else 1
    greenwood = next((school for school in schools if school.get("code") == "GRN"), None)
    failures += 0 if check("Demo school is seeded", greenwood is not None,
                           greenwood.get("name") if greenwood else "GRN not found") else 1

    school_id = greenwood["id"] if greenwood else None
    suffix = f"?schoolId={school_id}" if school_id else ""

    checks = [
        ("Dashboard loads", "/api/dashboard" + suffix, lambda data: "stats" in data or "cards" in data),
        ("Students are listed", "/api/students" + suffix, lambda data: len(data.get("students", [])) >= 12),
        ("Staff are listed", "/api/staff" + suffix, lambda data: len(data.get("staff", [])) >= 1),
        ("Accounts are listed", "/api/users" + suffix, lambda data: len(data.get("users", [])) >= 1),
        ("Attendance roster loads", "/api/attendance" + suffix, lambda data: "students" in data or "children" in data),
        ("Library books are listed", "/api/library/books" + suffix, lambda data: len(data.get("books", [])) >= 3),
        ("Assessments are listed", "/api/grades/assessments" + suffix,
         lambda data: len(data.get("assessments", [])) >= 3),
        ("Fee ledger is seeded", "/api/fees" + suffix,
         lambda data: data.get("canManage") is True and data.get("summary", {}).get("transactionCount") == 48
         and len(data.get("transactions", [])) == 48),
        ("Messages load", "/api/messages" + suffix, lambda data: "messages" in data),
        ("Notification count loads", "/api/notifications/count", lambda data: "unread" in data),
    ]
    for label, path, predicate in checks:
        try:
            data = api(base, "GET", path, token=token)
            failures += 0 if check(label, predicate(data)) else 1
        except ApiError as exc:
            failures += 0 if check(label, False, str(exc)) else 1

    # Parent view checks absence notifications and published grades.
    try:
        parent = login(base, "parent1", "password")
        parent_token = parent["token"]
        notifications = api(base, "GET", "/api/notifications", token=parent_token)
        items = notifications.get("notifications", [])
        failures += 0 if check("Parent receives seeded notifications", len(items) >= 1,
                               f"{len(items)} notification(s)") else 1
        report = api(base, "GET", "/api/grades/my", token=parent_token)
        failures += 0 if check("Parent can read published grades", bool(report.get("children"))) else 1
        family = api(base, "GET", "/api/dashboard", token=parent_token)
        failures += 0 if check("Parent sees linked children", len(family.get("children", [])) >= 1) else 1
        fees = api(base, "GET", "/api/fees", token=parent_token)
        failures += 0 if check("Parent sees family fee ledger",
                               fees.get("isFamily") is True and fees.get("canManage") is False
                               and len(fees.get("students", [])) >= 1
                               and len(fees.get("transactions", [])) >= 1) else 1
    except ApiError as exc:
        failures += 0 if check("Parent workspace", False, str(exc)) else 1

    print()
    if failures:
        print(f"\033[31m{failures} check(s) failed.\033[0m")
        return 1
    print("\033[32mAll smoke checks passed.\033[0m")
    return 0


def command_demo(base: str) -> int:
    accounts = [
        ("vlolleh", "SUPER_ADMIN"),
        ("greenwoodadmin", "ADMIN"),
        ("teacher1", "TEACHER"),
        ("librarian", "STAFF"),
        ("parent1", "PARENT"),
        ("student1", "STUDENT"),
    ]
    print(f"Verifying demo logins → {base}\n")
    failures = 0
    for username, role in accounts:
        try:
            session = login(base, username, "password")
            actual = session["user"].get("role")
            failures += 0 if check(f"{username} / password", actual == role,
                                   f"{session['user'].get('fullName')} · {actual}") else 1
        except ApiError as exc:
            failures += 0 if check(f"{username} / password", False, str(exc)) else 1
    print()
    if failures:
        print(f"\033[31m{failures} login(s) failed.\033[0m")
        return 1
    print("\033[32mAll demo logins work.\033[0m")
    return 0


def compose(*args: str) -> int:
    try:
        return subprocess.call(["docker", "compose", *args], cwd=str(ROOT))
    except FileNotFoundError:
        print("docker compose is not available on PATH.", file=sys.stderr)
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="LeoneSIS operations helper")
    parser.add_argument("command", choices=["health", "smoke", "demo", "up", "down", "ps", "logs"])
    parser.add_argument("--url", default=DEFAULT_URL, help="Application base URL")
    parser.add_argument("--timeout", type=int, default=180, help="Health wait timeout in seconds")
    args = parser.parse_args()
    base = args.url.rstrip("/")

    if args.command == "health":
        return 0 if wait_for_health(base, args.timeout) else 1
    if args.command == "smoke":
        return command_smoke(base)
    if args.command == "demo":
        return command_demo(base)
    if args.command == "up":
        code = compose("up", "--build", "-d")
        if code == 0:
            wait_for_health(base, args.timeout)
        return code
    if args.command == "down":
        return compose("down")
    if args.command == "ps":
        return compose("ps")
    if args.command == "logs":
        return compose("logs", "-f", "--tail=200", "app")
    return 1


if __name__ == "__main__":
    sys.exit(main())
