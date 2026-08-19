---
name: Running a self-managed background service (e.g. MySQL) on Replit
description: Pattern for databases/services Replit doesn't manage (like MySQL, since the built-in DB is Postgres) — start them inside the workflow process, not via ShellExec background/nohup.
---

# Self-managed background services on Replit

Replit's managed database is PostgreSQL only. If a project's stack requires
something else (e.g. MySQL, per its existing schema/backend config), install
it as a system dependency (`installSystemDependencies`, e.g. `mysql80`) and
run it yourself rather than trying to use the DB skill/connector for it.

**Why:** Background processes started via `ShellExec` with `nohup`/`setsid`/`disown`
do NOT survive past that tool call in this sandbox — each `ShellExec` invocation's
process tree gets torn down when the call ends, even though `ps aux` shows the
process as alive *within* that same call. A `mysqld` (or similar) started this way
will be dead by the next tool call.

**How to apply:** Start the service as the first step of the same shell script/command
that a long-running `configureWorkflow` executes (e.g. a `start-backend.sh` that
launches `mysqld &`, waits for it to accept connections, then `exec`s the real
app in the foreground). This keeps the service alive for as long as the workflow
runs, and it restarts naturally with the workflow. Persist its data directory
inside the project (e.g. `.mysql/data`, gitignored) so it survives workflow restarts.
