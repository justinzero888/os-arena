Use one video under three minutes that presents the three planned flows in sequence:  
1. Arena gameplay  
2. Twitch chat interaction  
3. OBS broadcast overlay  
# Video script — approximately 2:45  
## 0:00–0:12 — Introduction  
**Screen:** Title card and live Twitch channel.  
**Narration:**  
Orbace Sudoku Arena turns a Sudoku round into a live Twitch event. The streamer hosts the match, viewers vote and follow the action, and OBS displays the shared game state on stream.  
## 0:12–1:15 — Flow 1: Host, audience, and Arena round  
**Show:**  
* Host creates an Arena session.  
* Guest opens the audience link.  
* Guest join confirmation and participant count.  
* Voting phase and countdown.  
* Guest casts a time-mode vote.  
* Host starts the round.  
* Sudoku grid, Extreme label, and synchronized timer.  
* Host enters or submits the solution.  
* Result screen and rematch.  
**Narration:**  
The host creates a session and shares the audience link. Viewers join anonymously and their presence is shown separately from votes received. During the ballot, the audience selects the time mode. When the required participation is present, the host starts the round. The server selects an approved Extreme puzzle, owns the timer and deadline, validates the solve, publishes the result, and supports a fresh-puzzle rematch.  
## 1:15–1:50 — Flow 2: Twitch chat  
**Show:**  
* Twitch chat with a viewer sending !arena.  
* Bot response containing the current mode, difficulty, and time remaining.  
* Optional short view of the EventSub listener showing the subscription and received message.  
* Do not show tokens or .env contents.  
**Narration:**  
Twitch is an active control and communication surface. EventSub receives chat messages, and the bot responds through Twitch’s Send Chat Message API. The !arena command reports the current round so viewers can follow the match without leaving chat.  
## 1:50–2:30 — Flow 3: OBS overlay  
**Show:**  
* OBS Browser Source displaying the Arena overlay.  
* Live board and timer changing.  
* Twitch chat visible beside or below the overlay.  
* Result appearing in the overlay.  
* Rematch or completed-round state.  
**Narration:**  
The same authoritative state is available as a read-only OBS Browser Source. The overlay stays synchronized with the host and audience views, including the board, timer, and final result. This gives the streamer a clean broadcast view without exposing host controls or the stored solution.  
## 2:30–2:45 — Closing  
**Screen:** Composite of Twitch chat, Arena board, and OBS overlay.  
**Narration:**  
Orbace Sudoku Arena combines server-authoritative Sudoku gameplay, audience participation, Twitch chat, and broadcast overlays into one repeatable community experience.  
# Evidence to capture  
## Image gallery  
Use five or six clean screenshots:  
1. **Hero image:** Host Arena view, guest view, and OBS overlay visible together.  
2. **Voting:** Guest joined, participant count visible, voting countdown active.  
3. **Playing round:** Extreme Sudoku grid with timer and host/audience state.  
4. **Twitch integration:** !arena in chat and the bot’s status reply.  
5. **OBS integration:** Browser Source showing the live board and countdown.  
6. **Result/rematch:** Authoritative result followed by the new rematch session or fresh puzzle.  
Crop out:  
* .env files and tokens  
* terminal output containing credentials  
* private user IDs  
* browser tabs unrelated to the demo  
* local filesystem paths where possible  
