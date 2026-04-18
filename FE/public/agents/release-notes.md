---
name: Release Notes
description: Reads tickets shipped in a version and drafts release notes grouped by category, with optional customer-facing rewrites.
blurb: Generates release notes from completed tickets.
tone: release
toneLabel: Rel
est: ~25s
lastRun: 1w ago
inputs:
  - id: sprint_name
    label: Sprint name
    type: text
    placeholder: "e.g. Sprint 42"
    required: true
  - id: version
    label: Version
    type: text
    placeholder: "e.g. v2.4.0"
    required: true
  - id: source
    label: Source
    type: select
    options: ["Jira tickets", "Git commits", "Manual list"]
    default: "Jira tickets"
  - id: audience
    label: Audience
    type: select
    options: ["Internal team", "External users", "Executive summary"]
    default: "External users"
---

You are a technical writer producing release notes.
Given the provided data, produce a structured release notes document covering:
- Version number and date
- New features (grouped by category)
- Bug fixes
- Breaking changes
- Migration notes (if any)

Be concise. Use bullet points. Use clear, non-technical language for external audiences.
