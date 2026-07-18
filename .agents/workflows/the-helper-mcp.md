---
description: this is only for interview app building
---

1. Browser QA MCP ⭐⭐⭐⭐⭐ (Highest Priority)

This becomes your AI frontend tester.

Tools
open_app()

navigate(page)

click(selector)

type(selector, value)

take_screenshot()

compare_screenshot()

inspect_dom()

measure_spacing()

measure_component()

record_video()

console_logs()

network_requests()

Prompt examples

Check if the interview page looks clean on a 13-inch laptop.

Verify the Monaco editor occupies about 70% of the width.

Compare today's UI with yesterday's screenshot.

2. UI Inspector MCP ⭐⭐⭐⭐⭐

This is something I don't think exists in exactly the form you want.

Instead of browser automation, it focuses on design quality.

Tools
analyze_layout()

detect_visual_noise()

spacing_score()

alignment_score()

accessibility_score()

component_hierarchy()

unused_components()

contrast_check()

responsive_report()

Example

Layout Score

92/100

Problems

Sidebar too wide

Button padding inconsistent

Transcript overlaps timer

Editor loses focus on mobile
3. Interview Simulator MCP ⭐⭐⭐⭐⭐

This is custom to your startup.

Instead of manually testing interviews.

The MCP simulates candidates.

Candidate types
Beginner

Average

Strong

Silent

Talkative

Nervous

Overconfident

Prompt

Simulate a nervous candidate solving Two Sum.

The MCP

types code
pauses
answers AI
makes mistakes
finishes interview

Amazing for testing.

4. Prompt Playground MCP ⭐⭐⭐⭐⭐

You'll have many prompts.

Instead of editing them manually.

Tools
test_prompt()

compare_prompt()

score_prompt()

benchmark()

latency()

cost()

hallucination_check()

Example

Prompt A

$0.003

9 sec

Accuracy 88%

------------------

Prompt B

$0.001

5 sec

Accuracy 86%
5. AI Conversation Replay MCP ⭐⭐⭐⭐☆

Very useful.

Every interview becomes searchable.

Tools

load_session()

play()

jump()

summarize()

find_errors()

find_long_silence()

Prompt

Show every time the AI interrupted unnecessarily.

6. Judge0 Debug MCP ⭐⭐⭐⭐☆

Instead of debugging Judge0 manually.

compile()

run()

memory_usage()

cpu_usage()

compare_languages()

sandbox_logs()
7. DeepSeek and Openrouter Cost MCP ⭐⭐⭐⭐⭐

As your users grow, cost matters.

Track

tokens

cost

latency

cache hit

cache miss

response time

Dashboard

Today's Cost

$3.18

Average

$0.04/interview

Most expensive interview

$0.17

Average latency

2.4 sec
8. UX Heatmap MCP ⭐⭐⭐⭐⭐

This would be fantastic.

AI watches users.

mouse movement

clicks

hesitation

scroll

typing speed

drop-off

Prompt

Where are users getting confused?

Output

82%

Couldn't find

Start Interview

43%

Didn't notice

Voice Mode

61%

Never clicked

Run Code
9. Component Generator MCP ⭐⭐⭐⭐☆

Instead of asking AI repeatedly.

generate_component()

refactor_component()

convert_to_shadcn()

optimize_tailwind()

Prompt

Create a Google Meet-style participant card using shadcn/ui.

10. Architecture MCP ⭐⭐⭐⭐⭐

As the project grows.

Ask

Draw my system architecture.

Output

Next.js

↓

API

↓

DeepSeek

↓

Judge0

↓

Postgres

↓

Reports

Or

Show dependency graph.