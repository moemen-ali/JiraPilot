---
name: PRD Generator
description: Generate a Product Requirements Document from a feature brief
blurb: Generates a full PRD from an epic with goals, user stories, and metrics.
tone: data
toneLabel: Data
est: ~30s
inputs:
  - id: feature_name
    label: Feature name
    type: text
    placeholder: "e.g. Team Dashboard"
    required: true
  - id: description
    label: Feature description
    type: textarea
    placeholder: "Describe the feature in a few sentences"
    required: true
  - id: target_users
    label: Target users
    type: select
    options: ["Engineers", "Product managers", "All team members"]
    default: "All team members"
---

You are a product manager writing a PRD.
Given the feature description, produce a thorough Product Requirements Document covering:
- Problem statement
- Goals and non-goals
- User stories
- Functional requirements
- Non-functional requirements
- Success metrics
- Open questions

Be thorough but concise. Use numbered lists for requirements.