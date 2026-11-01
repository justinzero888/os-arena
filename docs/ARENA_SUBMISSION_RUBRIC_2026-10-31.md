# Codex x TwitchCon Hackathon — verified submission rubric

**Checked:** 2026-10-31 against the organizer's [overview](https://twitchcon-codex.devpost.com/), [official rules](https://twitchcon-codex.devpost.com/rules), and [FAQ](https://twitchcon-codex.devpost.com/resources).  
**Purpose:** Submission preparation for Orbace Sudoku Arena. This records the rules; it does not itself enter or submit a project.

## Deadline and submission location

| Item | Verified requirement |
| --- | --- |
| Deadline | **Monday, November 2, 2026, 2:00 p.m. Pacific Standard Time (PST)**. In Detroit this is **5:00 p.m. Eastern Standard Time (EST)**. Submit before the cutoff. [Rules, §1](https://twitchcon-codex.devpost.com/rules) |
| Destination | Join the [Codex x TwitchCon Hackathon on Devpost](https://twitchcon-codex.devpost.com/) and complete the **Enter a Submission** form. A saved draft is not an entry; Devpost must show **Submitted** before the deadline. [Rules, §4](https://twitchcon-codex.devpost.com/rules); [FAQ](https://twitchcon-codex.devpost.com/resources) |
| Time-zone note | The FAQ also prints a UTC conversion that conflicts with its own Pacific/ET deadline on the date after daylight-saving time ends. Use the organizer's **2:00 p.m. Pacific** deadline and the live Devpost countdown as the operational source of truth; leave a buffer. |

## Required submission materials

| Material | Requirement | Arena preparation |
| --- | --- | --- |
| Video | **Under 3 minutes**. Show the project **functioning on Twitch** and **how it was built with Codex**. Upload to **YouTube**; provide its URL on Devpost. The FAQ says **unlisted is acceptable**, private is not. Do not use unlicensed music, trademarks, or other third-party material. [Rules, §4](https://twitchcon-codex.devpost.com/rules); [FAQ](https://twitchcon-codex.devpost.com/resources) | The two-flow [capture brief](ARENA_SUBMISSION_VIDEO_CAPTURE_BRIEF.md) must reserve a short, genuine Codex-build segment in addition to the product and Twitch footage. Verify the YouTube link in a signed-out window. |
| Code repository | URL to GitHub, GitLab, or Bitbucket. It must contain **all source code, assets, and instructions needed to run/test the project**. A private repository is allowed only on GitHub or GitLab and must be shared with the organizer account identified in the rules. Judges need free, unrestricted access during judging. [Rules, §4](https://twitchcon-codex.devpost.com/rules) | Proposed control URL: `https://github.com/justinzero888/os-arena`. **Current gap:** the frozen Preview product source is in a separate local Orbace worktree, while local Twitch/OBS work is in this control repository; a GitHub URL to the current pushed `os-arena` branch alone has not been verified to contain the complete demonstrated project. Prepare an authorized, secret-free publication path covering both flows and run instructions. The current local working tree/review ZIP is not itself judge access. No publication is authorized by this checklist. |
| Project description | Explain features/functionality **and how Codex was used**. [Rules, §4](https://twitchcon-codex.devpost.com/rules) | Describe the two environments honestly: Orbace Preview product journey and separate local Twitch/OBS proof. |
| Codex session ID | Supply the session ID for the thread where **most of the project was built**. The FAQ says to use `/status` in that Codex thread. [Rules, §4](https://twitchcon-codex.devpost.com/rules); [FAQ](https://twitchcon-codex.devpost.com/resources) | Select and verify the build thread; do not substitute an Arena game session ID or Twitch channel ID. |
| Team / entrant | Individuals or teams of eligible individuals may enter; **organizations cannot**. A team appoints one eligible representative, who starts the Devpost project and invites members; each teammate accepts. [Rules, §§3–4](https://twitchcon-codex.devpost.com/rules); [FAQ](https://twitchcon-codex.devpost.com/resources) | Owner decides whether the entrant is Justin individually or a named team of individuals. “Orbace” may be the project/brand, but is not itself an eligible organizational entrant. Confirm team members and representative in Devpost. |

The event does **not** specify a required MP4 codec, resolution, frame rate, or separate hosted demo URL in the published submission requirements. Export a YouTube-compatible file and inspect the live Devpost form for any additional required fields. The **repository URL** is mandatory; a separate running demo URL is useful if accessible, but does not replace the repository or video.

## Actual Devpost draft inspection — submission 1268524

Initial read-only inspection of the owner's signed-in [submission form](https://devpost.com/submit-to/31742-codex-x-twitchcon-hackathon/manage/submissions/1268524-orbace-sudoku-arena/project-overview) on 2026-10-31 showed **Untitled / DRAFT / 1 of 5 steps done**. The only listed teammate is the creator, Justin Zero. At the owner's subsequent request, the project name and elevator pitch were saved; the form then showed **Orbace Sudoku Arena / DRAFT / 2 of 5 steps done**. No other fields were edited and no submission was attempted. Do not put the form's private teammate-invite link in a review artifact.

| Step | Actual fields visible |
| --- | --- |
| Manage team | Optional teammate invitations; solo entrant can skip. |
| Project overview | Required **Project name** (60-character limit) and **Elevator pitch** (200-character limit). Optional thumbnail: JPG/PNG/GIF, up to 5 MB; 3:2 recommended. |
| Project details | Required **About the project** story (inspiration, learning, build process, challenges); **Built with** tags (up to 25); **YouTube video URL**. Optional “Try it out” links and image gallery (up to 15 images; 5 MB each; 3:2 recommended). Form reiterates that video must show Twitch and Codex, with public/unlisted visibility. |
| Additional info | Required **Submitter Type** (Individual or Team of Individuals), **Country of Residence**, **code repository URL**, **Codex build-thread session ID**, explanation of **Codex use and Twitch connection**, explanation of **streamer/community use**, two experience-survey selections, and three eligibility attestations. The form identifies `testing@devpost.com` for access if the repository is private. |
| Submit | Final **Official Rules and Devpost Terms of Service agreement** plus **Submit project** action. The entrant must personally review the legal terms and submit; this checklist does not accept them. |

The form's “Try it out” link is available, but a separate deployed demo URL is **not marked required**. The required repository URL is in **Additional info**, not the optional link list in Project details.

**2026-11-01 draft progress:** Project Story and 14 verified “Built with” tags were saved in Project details. The optional “Try it out” link was left blank: the known dedicated Preview URL opened but remained at “Loading Arena” in a read-only check, so it is not yet a verified working demo destination. The required YouTube video URL is also pending; Devpost still shows **DRAFT / 2 of 5 steps done**. No submission or publication occurred.

## Project and judging constraints

- The project must be an interactive experience for Twitch streamers and their community, connected through a Twitch surface such as chat, EventSub, API, overlay, or Extension, and built with Codex. It must function as depicted. [Rules, §4](https://twitchcon-codex.devpost.com/rules)
- The submitted work must have been **newly created during October 23–November 2, 2026**. Existing frameworks, libraries, starter templates and AI tools may be used. Confirm the Arena-specific work and the code actually submitted meet this rule; do not claim an older Orbace product as newly built. [Rules, §4](https://twitchcon-codex.devpost.com/rules)
- Stage One is pass/fail for theme fit and reasonable use of the required tools. Stage Two weighs four criteria **equally**: **Innovation/Idea**, **Potential Impact**, **Technological implementation** (including Codex use), and **Design** (ease of use and watchability). [Rules, §6](https://twitchcon-codex.devpost.com/rules)
- Judges may evaluate solely from description, images and video; they are not required to run the repository. The video should therefore make the Twitch connection, audience value, and working interaction visible without relying on narration alone. [Rules, §4](https://twitchcon-codex.devpost.com/rules)
- Submission materials must be in English or have English translations. Entries cannot ordinarily be changed after the deadline. [Rules, §§4–5](https://twitchcon-codex.devpost.com/rules)

## Final owner checklist

- [ ] Confirm eligible entrant/representative and any teammates on Devpost; all invitations accepted.
- [ ] Identify the correct **Codex build-thread session ID** using `/status`.
- [ ] Verify the repository URL and judge access; ensure the submitted revision covers **both** demonstrated flows with complete, runnable source/instructions and no secrets. Obtain separate authorization before any commit/push/publication.
- [ ] Export an English video **under 3:00** with Twitch footage **and** a genuine Codex-build segment. Upload to YouTube as public or unlisted; test its link signed out.
- [ ] Complete project description, links, session ID, and every required Devpost form field.
- [ ] Click **Submit** and verify **Submitted** status before **Nov 2, 2:00 p.m. PST / 5:00 p.m. EST**. Do not rely on a saved draft.
