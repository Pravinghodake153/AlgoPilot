---
description: use this for UI and UX
---

# UI/UX Prompt — InterviewAI V1

Design the application to feel like a modern remote technical interview platform inspired by Zoom, Google Meet, Microsoft Teams, Cursor, and Linear.

Do **NOT** clone or copy any product. Instead, capture the experience users already expect from online coding interviews.

---

## Design Principles

The interface should communicate:

* Professional
* Calm
* Minimal
* Focused
* No visual clutter
* Enterprise quality
* Fast
* Premium

The user should immediately understand that this is a live technical interview, not a chat application.

Every screen should prioritize focus.

Avoid dashboards full of cards, gradients, animations, and unnecessary widgets.

Use whitespace generously.

---

# Overall Theme

Dark mode first.

Primary colors:

* Neutral dark backgrounds
* Soft gray surfaces
* White typography
* One accent color for active states

Avoid:

* Bright colors
* Large gradients
* Heavy shadows
* Rounded "bubble" UI
* Gaming aesthetics

The experience should feel closer to Cursor, Linear, and modern IDEs than consumer apps.

---

# Layout

Use a professional desktop layout.

```
---------------------------------------------------------
Top Navigation
---------------------------------------------------------

Question + Editor                  AI Interview Panel

Question

Monaco Editor                      Interviewer Avatar

                                  Live Conversation

                                  Voice Status

                                  Timer

---------------------------------------------------------

Run Code

Submit

---------------------------------------------------------
```

The coding editor should always be the primary focus.

Recommended proportions:

* Left panel (editor + problem): 70%
* Right panel (AI interviewer): 30%

Allow the divider to be resizable.

---

# Navigation

Top navigation should remain minimal.

Left

* Logo

Center

Current Interview

Right

* User Avatar
* Settings

No sidebar.

No unnecessary menu items.

---

# Interview Screen

The interview page should feel similar to joining a Google Meet call.

The interviewer is always visible.

Display:

* AI avatar
* Speaking indicator
* Listening indicator
* Live transcript
* Current interview status

The candidate should feel like someone is interviewing them.

---

# AI Interview Panel

Include

AI Avatar

Status indicator

Examples

● Speaking

● Listening

● Thinking

Conversation

Auto-scroll

Latest messages always visible

Voice controls

Mute

Speaker

End Interview

Transcript

Professional message styling

Do not make it look like WhatsApp or Discord.

---

# Timer

Place timer in the top-right of the interview panel.

Example

18:42 Remaining

When under five minutes:

Change color subtly.

Avoid flashing animations.

---

# Code Editor

Use Monaco Editor.

Large font.

Comfortable spacing.

Line numbers.

Syntax highlighting.

Dark theme.

Below editor:

Run Code

Submit

Console Output

Test Results

Keep controls minimal.

---

# Coding Question

Display above the editor.

Include

Title

Difficulty badge

Problem statement

Examples

Constraints

No unnecessary borders.

Readable typography.

---

# Voice Experience

When AI is speaking:

Animate a subtle waveform or pulsing ring around the avatar.

When user is speaking:

Show

Listening...

When processing:

Show

Thinking...

Keep animations smooth and understated.

---

# Micro Interactions

Buttons

Subtle hover

Quick response

Small scale effect

Cards

Minimal elevation

Smooth transitions

Inputs

Soft focus ring

Fast interaction

Avoid excessive animations.

---

# Responsive Design

Desktop is the primary experience.

Support laptops from 13" to 27".

On tablets:

Stack panels vertically.

Mobile support is not required for V1.

---

# Typography

Use clean fonts.

Examples

Inter

Geist

System UI

Hierarchy

Question title

Bold

Problem text

Regular

Transcript

Readable

Metadata

Small

Avoid decorative fonts.

---

# Color Usage

Success

Green

Warning

Amber

Error

Red

Primary

One accent color only.

Avoid rainbow-colored UI.

---

# Empty States

Professional illustrations are not required.

Simple messages.

Example

"No previous interviews."

---

# Loading States

Use skeleton loaders.

Never show blank pages.

AI responses should display

Thinking...

instead of freezing.

---

# Dashboard

Simple.

Display

Welcome

Start Interview

Previous Interviews

Recent Reports

Nothing else.

No analytics for Version 1.

---

# Visual Inspiration

Take inspiration from:

* Google Meet (clean call layout)
* Zoom (interview familiarity)
* Microsoft Teams (professional structure)
* Cursor (minimal editor experience)
* Linear (spacing, typography, polish)
* VS Code (editor ergonomics)

Do NOT duplicate their UI.

Use them only as inspiration for interaction patterns.

---

# User Experience Goals

A first-time user should instinctively know:

* where to read the problem
* where to write code
* where to talk to the interviewer
* how much time remains
* when the AI is listening
* when the AI is speaking
* how to submit

No onboarding should be required.

---

# Accessibility

Support:

* Keyboard navigation
* High contrast text
* Visible focus states
* Screen-reader friendly labels
* Proper semantic HTML

---

# Final Design Goal

When a software engineer opens the application, their first thought should be:

"This feels like joining a real remote coding interview."

The interface should create confidence, reduce distractions, and keep the user's attention on solving the problem while interacting naturally with the AI interviewer.
