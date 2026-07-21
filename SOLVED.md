# Detailed Problems & Solutions: AlgoPilot Implementation

This document provides a comprehensive log of the technical problems encountered during development/deployment of the **AlgoPilot** AI Coding Interview Platform on Vercel, along with their solutions.

---

## 1. Vercel Build-time vs. Runtime Environment Variables
### Problem
The AI interviewer and code execution APIs returned `401 Unauthorized` errors on Vercel, even though the keys were set in the dashboard.
*   **Cause**: The environment variables (e.g. `DEEPSEEK_API_KEY` and `JUDGE0_API_KEY`) were read at the top of the files (module scope). Next.js evaluated these variables at build-time, compiling them as empty strings (`""`) into the production bundle.

### Solution
Refactored the code to read the environment variables dynamically at runtime *inside* the execution scopes:
- **AI Service**: Moved variable checks inside `deepseekChat()`.
- **Code Executor**: Moved `JUDGE0_API_KEY` and `JUDGE0_API_URL` inside the `POST` route function.
This forces Next.js serverless functions to read live keys from the environment variables context at runtime.

---

## 2. Text Mode AI Speaking Bug
### Problem
In Text Mode, the user submits typed messages, but the AI interviewer would still play the spoken voice response. This was disruptive for text-only usage.

### Solution
- Updated the text submission logic in `text-input.tsx`.
- Removed the automatic call to the Speech Synthesis API when responding to text inputs.
- Speech synthesis is now exclusively triggered in Voice Mode when the user speaks through the microphone.

---

## 3. High-availability AI Fallback (OpenRouter & DeepSeek)
### Problem
Relying on a single API endpoint (like OpenRouter) for the AI interviewer meant the platform would fail completely if the API hit limits, ran out of credits, or timed out.

### Solution
Implemented a resilient fallback architecture in `ai-service.ts`:
1.  **Primary**: Sends requests to **OpenRouter** (configured with the `deepseek/deepseek-v4-flash` model).
2.  **Fallback**: If the OpenRouter request fails, it catches the error and immediately retries the request using the official **DeepSeek API** endpoint and keys.

---

## 4. Report Generation Gateway Timeouts (504 Errors)
### Problem
When ending an interview, the page hung for over 5 minutes.
*   **Cause**: Vercel serverless functions on the Hobby/Free tier default to a strict **15-second execution timeout**. Generating a thorough JSON evaluation report (processing code and a full transcript) takes the LLM 20–30 seconds, causing Vercel to terminate the function.

### Solution
- Added `export const maxDuration = 60;` to `/api/interviews/[id]/report/route.ts`.
- This increases Vercel's serverless function timeout ceiling to **60 seconds**, giving the API ample time to generate the full JSON evaluation report.

---

## 5. Web Speech API Playback Blocks & Cutoffs
### Problem
In Voice Mode, the AI's audio response was muted/silent.
*   **Causes**:
    1.  Browsers block async Speech Synthesis if not triggered immediately by a user click (to prevent unsolicited audio spam).
    2.  Chrome garbage-collects long-running utterances, silencing the voice randomly mid-paragraph.

### Solution
Updated `use-web-speech.ts` with browser workarounds:
- **Audio Unlock**: Tapping the microphone button triggers a silent utterance (`volume = 0`) to "unlock" the browser's audio engine for future async speech.
- **GC Prevention**: Stored the current utterance globally on the window object (`window._currentUtterance`) so the garbage collector does not delete it.
- **Speech Heartbeat**: Added a 10-second pause/resume heartbeat loop that keeps long-running speech active in Chrome.

---

## 6. Microphone Feedback Loop Control
### Problem
When the AI spoke, the user's microphone remained open and picked up the computer speakers, leading to infinite loops of the AI listening to itself.

### Solution
- Implemented `pauseListening()` and `resumeListening()` callbacks in `useWebSpeech`.
- The microphone is programmatically paused when the AI starts speaking and resumes automatically once the AI finishes.

---

## 7. Hindi & Hinglish Voice Support
### Problem
Bilingual candidates speaking Hindi or Hinglish (English + Hindi mixed) had their voice input incorrectly transcribed or ignored.

### Solution
- Configured the voice input language parameter to `"en-IN"` (Indian English).
- Chrome's Indian English recognition handles Hindi/Hinglish terms with high accuracy.

---

## 8. Compilation Migration (JDoodle Primary + Judge0 Fallback)
### Problem
The Judge0 RapidAPI engine threw subscription errors (`{"message":"You are not subscribed to this API."}`), breaking compilation.

### Solution
- Integrated **JDoodle REST API** (`https://api.jdoodle.com/v1/execute`) as the primary compiler.
- If JDoodle credentials are set, the app uses JDoodle for C++, Java, Python, JavaScript, TypeScript, and Go.
- Added a graceful try/catch block so that if JDoodle returns an error, the execution pipeline automatically falls back to the Judge0 RapidAPI engine.

---

## 9. Redirect to Report on Code Submission
### Problem
When the user clicked "Submit" under the code editor, the code saved to the database, but the UI stayed on the editor screen without giving feedback.

### Solution
- Updated `editor-controls.tsx` to set the store status to `"completed"` when the database PATCH request succeeds.
- Added a `useEffect` inside `interview-client.tsx` that listens to `status === "completed"` and performs a client-side redirect (`router.push`) to the `/report/[id]` dashboard.
