#!/bin/bash
# Ralph Setup Script - Creates all Ralph files atomically
# Usage: ./setup.ps1 <project-path> [feature-name]

set -e

PROJECT_PATH="${1:-.}"
FEATURE_NAME="${2:-01-feature}"

# Resolve absolute path
PROJECT_PATH=$(cd "$PROJECT_PATH" && pwd)
RALPH_DIR="$PROJECT_PATH/.codex/ralph"
TASKS_DIR="$RALPH_DIR/tasks"
FEATURE_DIR="$TASKS_DIR/$FEATURE_NAME"

echo "🚀 Setting up Ralph in: $PROJECT_PATH"
echo "📁 Feature: $FEATURE_NAME"

# Create directory structure
mkdir -p "$RALPH_DIR"
mkdir -p "$FEATURE_DIR"

# Create ralph.ps1 (main loop script)
cat > "$RALPH_DIR/ralph.ps1" << 'RALPH_PS1'
#!/usr/bin/env pwsh
# Ralph - Autonomous AI Coding Loop
# Usage: .\ralph.ps1 -Feature <feature-folder> [-MaxIterations <max-iterations>]

param(
    [Parameter(Mandatory=$false)]
    [Alias("f")]
    [string]$Feature,
    
    [Parameter(Mandatory=$false)]
    [Alias("n")]
    [int]$MaxIterations = 10
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if ([string]::IsNullOrEmpty($Feature)) {
    Write-Host "Error: Feature folder required" -ForegroundColor Red
    Write-Host "Usage: .\ralph.ps1 -Feature <feature-folder> [-MaxIterations <max-iterations>]"
    Write-Host ""
    Write-Host "Available features:"
    $tasksDir = Join-Path $ScriptDir "tasks"
    if (Test-Path $tasksDir) {
        Get-ChildItem -Path $tasksDir -Directory | ForEach-Object { Write-Host "  $($_.Name)" }
    } else {
        Write-Host "  No features found. Create one first!"
    }
    exit 1
}

$TaskDir = Join-Path $ScriptDir "tasks\$Feature"

if (-not (Test-Path $TaskDir)) {
    Write-Host "Error: Feature folder not found: $TaskDir" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available features:"
    $tasksDir = Join-Path $ScriptDir "tasks"
    if (Test-Path $tasksDir) {
        Get-ChildItem -Path $tasksDir -Directory | ForEach-Object { Write-Host "  $($_.Name)" }
    } else {
        Write-Host "  No features found"
    }
    exit 1
}

$PrdFile = Join-Path $TaskDir "prd.json"
$ProgressFile = Join-Path $TaskDir "progress.txt"
$PromptFile = Join-Path $ScriptDir "prompt.md"

if (-not (Test-Path $PrdFile)) {
    Write-Host "Error: prd.json not found in $TaskDir" -ForegroundColor Red
    exit 1
}

# Get story counts
$prdContent = Get-Content $PrdFile -Raw | ConvertFrom-Json
$TotalIssues = $prdContent.userStories.Count +
    $prdContent.bugs.Count +
    $prdContent.tasks.Count
$Completed = ($prdContent.userStories | Where-Object { $_.passes -eq $true }).Count +
    ($prdContent.bugs | Where-Object { $_.passes -eq $true }).Count +
    ($prdContent.tasks | Where-Object { $_.passes -eq $true }).Count

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                   RALPH STARTING                           " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Feature: $Feature"
Write-Host "Issues: $Completed / $TotalIssues completed"
Write-Host "Max iterations: $MaxIterations"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

for ($i = 1; $i -le $MaxIterations; $i++) {
    # Refresh counts
    $prdContent = Get-Content $PrdFile -Raw | ConvertFrom-Json
    $Completed = ($prdContent.userStories | Where-Object { $_.passes -eq $true }).Count +
    ($prdContent.bugs | Where-Object { $_.passes -eq $true }).Count +
    ($prdContent.tasks | Where-Object { $_.passes -eq $true }).Count
    $Remaining = $TotalIssues - $Completed

    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Yellow
    Write-Host "Iteration $i / $MaxIterations | Completed: $Completed / $TotalIssues | Remaining: $Remaining" -ForegroundColor Yellow
    Write-Host "===============================================================" -ForegroundColor Yellow
    Write-Host ""

    # Run codex with the prompt (avoid piping so stdout stays a TTY)
    $output = ""
    $codexError = $null
    $transcriptPath = (New-TemporaryFile).FullName
    try {
        Start-Transcript -Path $transcriptPath -Force | Out-Null
        
        # Use a single long-lived Codex exec session across iterations.
        # First iteration: start a new non-interactive session.
        # Next iterations: resume the most recent session for this working directory.
        if ($i -eq 1) {
            & codex exec --full-auto -m gpt-5.1-codex-max -c model_reasoning_effort=xhigh "$PrdFile $ProgressFile $PromptFile"
        } else {
            & codex exec --full-auto -m gpt-5.1-codex-max -c model_reasoning_effort=xhigh resume --last "$PrdFile $ProgressFile $PromptFile"
        }
    } catch {
        # Continue even if there's an error
        $codexError = $_.Exception.Message
    } finally {
        try { Stop-Transcript | Out-Null } catch { }
    }

    if (Test-Path $transcriptPath) {
        $output = Get-Content $transcriptPath -Raw
        Remove-Item $transcriptPath -Force -ErrorAction SilentlyContinue
    }
    if ($codexError) {
        $output = $output + "`n" + $codexError
    }

    # Check for completion signal
    if ($output -match "<promise>COMPLETE</promise>") {
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "                   RALPH COMPLETE                           " -ForegroundColor Green
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "All $TotalIssues issues completed in $i iterations!"
        Write-Host "============================================================" -ForegroundColor Green
        exit 0
    }

    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "                   MAX ITERATIONS                           " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "Reached $MaxIterations iterations. Run again to continue."
Write-Host "============================================================" -ForegroundColor Yellow
exit 1
RALPH_PS1

chmod +x "$RALPH_DIR/ralph.ps1"
echo "✅ Created ralph.ps1"

# Create prompt.md (agent instructions)
cat > "$RALPH_DIR/prompt.md" << 'PROMPT_MD'
# Ralph Agent Instructions

## Your Task

You are an autonomous AI coding agent running in a loop. Each iteration, you implement ONE user story from the PRD.

## Execution Sequence

1. **Read Context**
   - Read the PRD (prd.json) to understand all items (userStories, bugs, tasks)
   - Read progress.txt to see patterns and learnings from previous iterations
   - Identify the **highest priority** item where `passes: false` (check userStories, bugs, AND tasks)

2. **Check Git Branch**
   - Verify you're on the correct branch (see `branchName` in prd.json)
   - If not, checkout the branch: `git checkout <branchName>` or create it

3. **Implement ONE Story**
   - Focus on implementing ONLY the selected item (story, bug, or task)
   - Follow the acceptance criteria exactly
   - Make minimal changes to achieve the goal

4. **Verify Quality**
   - Run typecheck (if applicable): `pnpm tsc --noEmit` or `npm run typecheck`
   - Run tests (if applicable): `pnpm test` or `npm test`
   - Fix any issues before proceeding

5. **Commit Changes**
   - Stage your changes: `git add .`
   - Commit with format: `feat: [STORY-ID] - [Title]`
   - Example: `feat: US-001 - Add login form validation`

6. **Update PRD**
   - Update prd.json to mark the item as `passes: true`
   - Add any notes about the implementation

7. **Log Learnings**
   - Append to progress.txt with format:

```
## [Date] - [Story ID]: [Title]
- What was implemented
- Files changed
- **Learnings:**
  - Patterns discovered
  - Gotchas encountered
---
```

## Codebase Patterns

Check the TOP of progress.txt for patterns discovered by previous iterations:
- Follow existing patterns
- Add new patterns when you discover them
- Update patterns if they're outdated

## Stop Condition

**If ALL items (userStories, bugs, tasks) have `passes: true`**, output this exact text:

<promise>COMPLETE</promise>

This signals the loop to stop.

## Critical Rules

- 🛑 NEVER implement more than ONE item per iteration
- 🛑 NEVER skip the verification step (typecheck/tests)
- 🛑 NEVER commit if tests are failing
- ✅ ALWAYS check progress.txt for patterns FIRST
- ✅ ALWAYS update prd.json after implementing
- ✅ ALWAYS append learnings to progress.txt
PROMPT_MD

echo "✅ Created prompt.md"

# Create empty prd.json template
cat > "$FEATURE_DIR/prd.json" << 'PRD_JSON'
{
  "branchName": "feat/FEATURE_NAME",
  "userStories": []
}
PRD_JSON

# Replace placeholder
sed -i '' "s/FEATURE_NAME/${FEATURE_NAME}/g" "$FEATURE_DIR/prd.json" 2>/dev/null || \
sed -i "s/FEATURE_NAME/${FEATURE_NAME}/g" "$FEATURE_DIR/prd.json"

echo "✅ Created prd.json"

# Create progress.txt template
cat > "$FEATURE_DIR/progress.txt" << PROGRESS_TXT
# Ralph Progress Log
Started: $(date +%Y-%m-%d)
Feature: $FEATURE_NAME

## Codebase Patterns
(Add discovered patterns here - Ralph will read these each iteration)

---

PROGRESS_TXT

echo "✅ Created progress.txt"

# Create empty PRD.md
cat > "$FEATURE_DIR/PRD.md" << 'PRD_MD'
# Feature: [Feature Name]

## Vision
[What this feature accomplishes]

## Problem
[What problem does this solve]

## Solution
[High-level approach]

## User Stories
[Will be converted to prd.json]

## Technical Notes
[Implementation details, constraints, dependencies]
PRD_MD

echo "✅ Created PRD.md"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ✅ RALPH SETUP COMPLETE                  ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║ Structure created at: $RALPH_DIR"
echo "║ Feature folder: $FEATURE_DIR"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║ Next steps:"
echo "║ 1. Edit PRD.md with your feature requirements"
echo "║ 2. Run /ralph -i to brainstorm PRD interactively"
echo "║ 3. Transform PRD to user stories in prd.json"
echo "║ 4. Run: bun run $RALPH_DIR/ralph.ps1 -f $FEATURE_NAME"
echo "╚════════════════════════════════════════════════════════════╝"