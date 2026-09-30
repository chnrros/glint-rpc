# Glint

A free, open-source desktop app for fully customizing your Discord Rich
Presence (the activity card on your profile), with a live preview, saved
presets, rotation, and a system tray icon. No Discord account token, no
tracking, everything stays on your machine.

<img width="1175" height="706" alt="Screenshot 2026-10-01 at 9 28 47 am" src="https://github.com/user-attachments/assets/da249794-a58f-434c-848e-98e528888562" />

<img width="1190" height="706" alt="Screenshot 2026-10-01 at 9 27 49 am" src="https://github.com/user-attachments/assets/05e4fc45-b042-4127-a259-cb953d2b8789" />

<!-- TODO: replace the two images above with real screenshots before your first release. -->

## Features

- **Every field Discord's local RPC supports**: activity name, type
  (Playing/Listening/Watching/Competing), status display, details + state
  (with clickable URLs), large/small images with hover text, timestamps
  (elapsed or countdown), party size, and up to two buttons. See the
  in-app hints for the couple of fields Discord only shows under specific
  conditions (like party size, which only displays for Playing).
- **Live preview** of your profile card and the member-list line as you
  type.
- **Presets**: save, rename, duplicate, reorder, import/export as JSON.
- **Rotation**: cycle through a set of presets automatically, with a
  built-in 15-second-minimum interval so you can't accidentally trip
  Discord's rate limit.
- **Application profiles**: use your own Discord Application ID (instead
  of Glint's) so the "Playing ___" name shows whatever you want. See
  [Creating your own Discord Application](#creating-your-own-discord-application)
  below.
- **Runs quietly in the tray**: closing the window keeps Glint running in
  the background; auto-reconnects if Discord restarts; launch-on-startup
  is a toggle away.
- **No token, no tracking, 100% local.** Glint talks to Discord only
  through its official local IPC connection to the Discord desktop app,
  never your account token, never the Discord HTTP API. Glint makes no
  network requests of its own beyond opening links you click in your
  browser.

## Download

Grab the latest build for your platform from the
[Releases page](../../releases/latest).

| Platform | File |
|---|---|
| Windows | `.msi` or `.exe` installer |
| macOS (Apple Silicon) | `.dmg` |
| macOS (Intel) | `.dmg` |
| Linux | `.AppImage` or `.deb` |

Builds are unsigned (see below for why), so your OS will warn you the
first time you open Glint. That's expected for free, open-source software
without a paid code-signing certificate.

### Windows: "Windows protected your PC"

Click **More info**, then **Run anyway**. Windows shows this for any app
from a developer who hasn't paid for a code-signing certificate. It
doesn't mean anything is wrong with Glint specifically.

### macOS: "unidentified developer" or "Glint is damaged and can't be opened"

First try **System Settings → Privacy & Security**, scroll down, and click
**Open Anyway** next to the message about Glint. You only need to do this
once. This happens because Glint isn't notarized by Apple, which costs a
paid developer account. Not a sign anything is wrong.

If macOS still says Glint is damaged after that, open Terminal and run:

```bash
xattr -cr /Applications/Glint.app
```

This clears the quarantine flag macOS puts on anything downloaded from
the internet. It's needed because Glint's builds are ad-hoc signed rather
than signed with a paid Apple Developer certificate, which macOS
sometimes reports as "damaged" instead of the usual unidentified
developer warning.

### Why it's safe

Glint is fully open source: every line of code that gets built into the
app you download is in this repository, and the [release
workflow](.github/workflows/release.yml) builds it directly from that
source on GitHub's own servers (not on anyone's personal machine), so you
can verify exactly what went into any given release. It never asks for
your Discord password or account token, makes no network requests other
than opening a link in your browser when you click one, and stores
everything (profiles, presets, settings) in a single local file on your
own computer. If you'd rather not trust a downloaded binary at all,
building from source (below) takes about five minutes.

## Creating your own Discord Application

By default, Glint uses its own Discord Application, so "Playing ___"
shows "Glint". To show your own name instead:

1. Go to <https://discord.com/developers/applications> and sign in with
   your Discord account.
2. Click **New Application**, give it a name (this is what'll show up as
   "Playing ___"), and create it.
3. On the **General Information** page, copy the **Application ID**.
4. In Glint, go to **Settings → Advanced → Application profiles**, add a
   new profile with that ID, and pick it for any preset you want to use
   it.

## Multiple accounts

Glint talks to every Discord client running locally at once: Discord,
Discord PTB, and Discord Canary, each with its own account if you're
logged into them separately. Open the Presets tab and a Clients section
appears once more than one client is running, listing each connected
account with its own preset picker. Pick a different preset for each
account, apply the same one to all of them, or set an account to None to
keep its presence cleared no matter what else you do.

## Building from source

Requirements: [Node.js](https://nodejs.org/) 20+, [Rust](https://rustup.rs/),
and platform build tools (Xcode Command Line Tools on macOS, the
"Desktop development with C++" workload on Windows, or `libwebkit2gtk`
and friends on Linux; see the [Tauri prerequisites
guide](https://v2.tauri.app/start/prerequisites/) for exact package
names per OS).

```bash
git clone https://github.com/chnrros/glint-rpc.git
cd glint-rpc
npm install
npm run tauri dev    # run it locally
npm run tauri build  # produce an installer for your OS
```

Before committing any change, run:

```bash
npm run typecheck && npm run lint && npm run build
cd src-tauri && cargo fmt && cargo clippy --all-targets -- -D warnings && cargo check
```

## FAQ / Troubleshooting

**Glint says "Discord not running" but Discord is open.**
Glint only talks to the **Discord desktop app** (not the browser
version, not Discord's website). Make sure the desktop app is running
and fully logged in.

**My activity isn't showing up on my profile.**
Open Discord → **User Settings → Activity Privacy** and make sure
**"Share your activity status"** is turned on.

**I added buttons but I don't see them on my own profile.**
That's expected: Discord never shows your own Rich Presence buttons to
you. Ask someone else to check your profile, or check from a second
account.

**Party size ("2 of 5") isn't showing.**
This only displays when Activity type is set to **Playing**. It's a
Discord display rule for Watching/Listening/Competing, not a Glint bug.

**Can I use a custom word instead of Playing/Listening/Watching/Competing?**
No, Discord's local RPC rejects any activity type outside those four
outright. This isn't something Glint can work around.

## Privacy and security

See [PRIVACY.md](PRIVACY.md) for what Glint does and doesn't collect (nothing),
and [SECURITY.md](SECURITY.md) for how to report a vulnerability privately.

## Roadmap

- Auto-updater
- Community preset sharing
- Auto-switch presets based on which app is open

## License

[MIT](LICENSE), free to use, modify, and redistribute.
