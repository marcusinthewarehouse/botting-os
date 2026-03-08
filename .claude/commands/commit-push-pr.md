---
name: commit-push-pr
description: Stage, commit, push, and create PR for current changes
context: fork
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *)
---

## Current state

- Status: !`cd /Users/marcushooshmand/Documents/Claude/bottingos && git status --short`
- Branch: !`cd /Users/marcushooshmand/Documents/Claude/bottingos && git branch --show-current`
- Diff: !`cd /Users/marcushooshmand/Documents/Claude/bottingos && git diff --cached --stat`

Stage all changed files, write a descriptive commit message in the format "Task N.M: what and why", push to origin, and create a PR with a summary of what was built and how to test it.
