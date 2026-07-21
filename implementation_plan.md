# Goal
Implement advanced Speech-to-Text (STT) and Text-to-Speech (TTS) using OpenRouter models (`deepgram/nova-3` and `hexgrad/kokoro-82m`), while keeping model names configurable in `.env.local`. Also, implement a "Push-to-Talk" (Record & Send) feature alongside the existing "Auto" Voice mode.

## Open Questions
- For TTS, should we wait for the full AI response to finish before generating the speech, or attempt to stream it sentence-by-sentence? (I will implement a simple full-response synthesis first for reliability).

## Proposed Changes

### Configuration
#### [MODIFY] `.env.local`
- Add `OPENROUTER_STT_MODEL="deepgram/nova-3"`
- Add `OPENROUTER_TTS_MODEL="hexgrad/kokoro-82m"`

### Backend Endpoints
#### [NEW] `app/api/interviews/[id]/stt/route.ts`
- Create a new POST endpoint that accepts `multipart/form-data` containing an audio file.
- Call `https://openrouter.ai/api/v1/audio/transcriptions` with the audio and `OPENROUTER_STT_MODEL`.
- Return the transcribed text.

#### [NEW] `app/api/interviews/[id]/tts/route.ts`
- Create a new POST endpoint that accepts JSON `text`.
- Call `https://openrouter.ai/api/v1/audio/speech` with the text and `OPENROUTER_TTS_MODEL`.
- Return the audio blob directly to the client.

### Frontend Components
#### [MODIFY] `features/interview/store/interview-store.ts`
- Add a new state `voiceInputMode: 'auto' | 'manual'` (default `'manual'`).
- Add action `setVoiceInputMode`.

#### [MODIFY] `features/interview/components/voice-input.tsx`
- Add a UI toggle to switch between "Auto" (Web Speech API) and "Manual" (Push-to-Talk) modes.
- Implement `MediaRecorder` logic for Manual mode:
  - Click to start recording (show visualizer).
  - Click to stop recording and send (upload audio to `/api/interviews/[id]/stt`).
  - On STT response, send message to chat.

#### [MODIFY] `features/interview/components/interview-client.tsx`
- Replace `window.speechSynthesis` TTS with backend TTS.
- When an AI message finishes generating (or when it's added), fetch `/api/interviews/[id]/tts` to get the audio blob.
- Play the audio using an HTML5 `Audio` object.
- Sync the `aiState` (`speaking`, `idle`) with the `Audio` object's `onended` and `onplay` events.

## Verification Plan
1. Start a Voice mode session.
2. Toggle to "Manual" mode. Record audio and send it. Verify it transcribes correctly using Deepgram.
3. Wait for AI response. Verify it speaks back using Kokoro-82m via the TTS endpoint.
4. Toggle back to "Auto" mode to ensure continuous listening still functions.
