# Session Recording - Ready to Test! 🎉

## ✅ Setup Complete

All configuration is done. Servers are starting. You're ready to test!

---

## 🚀 Quick Test (5 minutes)

### Step 1: Create a Test Study (2 min)

1. **Go to**: http://localhost:4001
2. **Create** a new Prototype Test study (or open existing one)
3. **Go to Builder** → **Settings tab**
4. **Scroll down** to "Session Recording" card (bottom of right column)
5. **Toggle ON** the recording switch
6. **Select**:
   - Capture mode: **"Audio Only"** (easiest to test)
   - Recording scope: **"Per Session"**
7. **Verify**: Card shows enabled state
8. **Add prototype** (if not already added):
   - Go to Prototype tab
   - Paste a Figma prototype URL
   - Sync frames
9. **Add tasks** (if not already added):
   - Go to Tasks tab
   - Add 1-2 simple tasks

### Step 2: Test Recording Flow (2 min)

10. **Click** "Preview" button (top right of builder)
11. **Read instructions** → Click "Continue"
12. **Consent screen appears**:
    - Should show "Microphone Access" checkbox
    - Check the box
    - Click "I Consent - Start Recording"
13. **Browser asks for mic permission** → Allow
14. **Recording starts**:
    - ✅ Red pulsing dot appears (top-right corner)
    - ✅ Says "Recording"
15. **Complete a task**:
    - Read task instruction
    - Click around the prototype
    - Click "I found it!" when done
16. **Finish study** → Complete all tasks
17. **Recording stops** → Shows "Uploading..." with progress bar

### Step 3: Verify Backend (1 min)

18. **Check database** (while upload finishes):
    ```sql
    SELECT id, status, capture_mode, duration_ms, chunks_uploaded, total_chunks
    FROM recordings
    ORDER BY created_at DESC
    LIMIT 1;
    ```
    Expected: `status = 'uploading'` → `'ready'` → `'transcribing'` → `'completed'`

19. **Check R2 bucket**:
    - Cloudflare Dashboard → R2 → veritio-session-recordings
    - Should see folder structure: `{study-id}/recordings/{participant-id}/{recording-id}/`
    - File: `recording.webm`

20. **Wait for transcription** (~30 seconds for short recording)
    ```sql
    SELECT * FROM transcripts
    ORDER BY created_at DESC
    LIMIT 1;
    ```
    Expected: `status = 'completed'`, `word_count > 0`, `full_text` has your spoken words

### Step 4: View Playback UI (1 min)

21. **Go to Results page** for your study
22. **Click "Recordings" tab** (should be visible)
23. **See your recording** in the table:
    - Shows participant ID, duration, status
    - Status should be "Completed"
    - Transcript column shows word count
24. **Click the recording row** → Detail dialog opens
25. **Video player loads**:
    - Click play button
    - Should hear your recorded audio
    - Progress bar should move
26. **Check transcript** (right panel):
    - Should show your spoken words
    - Segments with timestamps
    - Click a segment → video seeks to that time
27. **Test controls**:
    - Pause/play
    - Scrub timeline
    - Change speed (0.5x, 1x, 1.5x, 2x)
    - Volume control

---

## 🧪 Advanced Testing

### Test Screen Recording (Desktop Only)

1. **Builder**: Change capture mode to **"Screen + Audio"**
2. **Preview**: Consent screen now shows both mic + screen checkboxes
3. **Browser prompts**: Allow mic, then choose tab/window to share
4. **Recording**: Video should show your screen + audio
5. **Playback**: Video player shows screen recording

### Test Per-Task Recording

1. **Builder**: Change scope to **"Per Task"**
2. **Create 3 tasks** in the study
3. **Preview**: Complete all 3 tasks
4. **Database**: Should see 3 separate recordings with `task_attempt_id`
5. **Results**: Recordings tab shows 3 rows

### Test Mobile Fallback

1. **Open preview link** on mobile device (or use mobile view in DevTools)
2. **Should only request microphone** (no screen capture on mobile)
3. **Recording works** with audio only

---

## 🐛 What to Watch For

### Expected Behavior

✅ **Consent screen appears** after instructions (only if recording enabled)
✅ **Red dot indicator** appears when recording starts
✅ **Upload progress** shows when chunks upload (every 5 seconds)
✅ **Transcription runs** automatically in background (30-60 seconds)
✅ **Playback works** in Results → Recordings tab

### Common Issues & Fixes

**❌ Consent screen doesn't appear**
- Check: Settings tab → Session Recording is toggled ON
- Check: Not in embedded mode (only works in standalone player)

**❌ Browser doesn't ask for permissions**
- Check: Browser supports MediaRecorder (Chrome/Edge/Safari modern versions)
- Check: Using HTTPS or localhost (required for getUserMedia)
- Try: Refresh page and try again

**❌ Recording won't start**
- Check: Browser console for errors
- Check: R2 credentials in .env.local are correct
- Check: Backend server is running (port 4000)

**❌ Upload fails**
- Check: R2 bucket exists and name matches
- Check: R2 credentials have Read + Edit permissions
- Check: Network tab for failed requests

**❌ Transcription doesn't work**
- Check: DEEPGRAM_API_KEY is valid
- Check: Recording has audio track (not video-only)
- Check: Backend logs for `recording-finalized` event
- Wait: Transcription takes 30-60 seconds

**❌ Can't see Recordings tab**
- Check: Study type is "Prototype Test" (not Card Sort/Tree Test)
- Check: Study has at least one recording
- Check: You're on the Results page, not Builder

---

## 📊 Database Quick Checks

```sql
-- See all recordings
SELECT
  id,
  participant_id,
  status,
  capture_mode,
  duration_ms,
  file_size_bytes,
  chunks_uploaded,
  total_chunks,
  created_at
FROM recordings
ORDER BY created_at DESC;

-- See transcription status
SELECT
  r.id as recording_id,
  r.status as recording_status,
  t.status as transcript_status,
  t.word_count,
  t.confidence_avg,
  t.full_text
FROM recordings r
LEFT JOIN transcripts t ON t.recording_id = r.id
ORDER BY r.created_at DESC;

-- See recording events (task markers)
SELECT
  recording_id,
  event_type,
  timestamp_ms,
  data
FROM recording_events
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🎯 Success Criteria

Your feature is working correctly if:

1. ✅ Settings card appears and can be toggled
2. ✅ Consent screen appears in player
3. ✅ Browser requests microphone permission
4. ✅ Red recording indicator appears
5. ✅ Upload progress shows every 5 seconds
6. ✅ Database `recordings` table has row with status progression
7. ✅ R2 bucket has `recording.webm` file
8. ✅ Transcription completes within 1 minute
9. ✅ Recordings tab appears in Results page
10. ✅ Video player loads and plays recording
11. ✅ Transcript appears with clickable segments

---

## 📞 Need Help?

**Check Logs:**
```bash
# Backend logs (Motia)
# Should show: recording-initialized, recording-finalized, transcription-completed events

# Browser console
# Should show: MediaRecorder starting, chunks uploading, recording finalized
```

**Verify Environment:**
```bash
bun run scripts/verify-recording-setup.ts
# Should show all green checkmarks
```

**Database Health:**
```sql
-- Check if migration applied
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'recordings'
) as recordings_table_exists;
-- Should return: true
```

---

## 🎉 You're All Set!

The session recording feature is **fully implemented and configured**.

**Next**: Open http://localhost:4001 and test the flow!

**Documentation**: See SESSION_RECORDING_IMPLEMENTATION.md for complete technical details.
