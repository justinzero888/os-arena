# Twitch Chat + OBS demo validation

This is a local, controlled demonstration. It does not change production and the Twitch listener requires `ARENA_ENABLED=false`.

## 1. Configure the local bridge

In the ignored `.env`, retain the existing validated Twitch values and set:

```env
ARENA_ENABLED=false
TWITCH_TEST_SEND_ENABLED=true
TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID=1597519737
ARENA_STATUS_URL=http://127.0.0.1:4183/api/arena/sessions/live
```

The `live` alias follows the newest Arena session automatically. Do not put tokens, cookies, host capabilities, or solutions in this URL or in OBS.

## 2. Start the local Arena

From the repository root, start a separate process:

```sh
PORT=4183 ARENA_ENABLED=true npm run arena:dev
```

Open `http://127.0.0.1:4183`, create a session, and copy the session ID only for the host/guest links. Join from a separate browser profile, open voting, cast a vote, and start the round. The status endpoint must be in `PLAYING` before testing `!arena`.

## 3. Point the bridge at the session

The stable `ARENA_STATUS_URL` does not change between sessions. Restart the Twitch listener only if it is not already running:

```sh
npm run twitch:test
```

Wait for token validation, EventSub welcome, and an enabled `channel.chat.message` subscription.

## 4. Configure OBS Browser Source

1. Open OBS and select the authorized local test scene.
2. Add **Browser Source**.
3. Set URL to the stable alias:

   ```text
   http://127.0.0.1:4183/overlay/live
   ```

4. Use a starting width of `1280` and height of `720`; crop or scale the read-only overlay as needed.
5. Enable **Refresh browser when scene becomes active**.
6. Verify the overlay shows the same session phase, selected time mode, and countdown as the host browser.
7. Do not capture browser chrome, host URLs, cookies, terminal output, `.env`, or other private controls.

## 5. Run the Twitch proof

1. Keep the listener and Arena server running.
2. Log into Twitch chat as the separate Alex viewer account.
3. Open the Justinzero channel (`https://www.twitch.tv/justinzero888`).
4. Send exactly:

   ```text
   !arena
   ```

5. Confirm the listener logs only safe diagnostics and a successful status submission.
6. Confirm the chat reply is a safe status such as `Orbace Arena LIVE — Quick · Extreme · 02:58 remaining`.
7. Confirm the OBS broadcast displays the matching read-only overlay.

## 6. Negative checks

- End the round or stop Arena and send `!arena`; the reply must be `Orbace Arena is not currently live.`
- Send `!arena` from Justinzero/Bot B; the self-message guard must ignore it.
- Verify the chat reply contains no puzzle ID, solution, host token, cookie, internal database ID, or private URL.
- Keep `ARENA_ENABLED=false` in the listener environment. Only the separate local Arena process may use the explicit `ARENA_ENABLED=true` override.

## 7. Cleanup

Stop the Twitch listener and local Arena process with Ctrl-C. Set `TWITCH_TEST_SEND_ENABLED=false` after the demo if no further live reply test is planned. Do not deploy, push, merge, or change production settings.
