# Privacy

Glint collects nothing.

- No analytics, no telemetry, no crash reporting, no tracking of any kind.
- No account, no sign-in, no Discord token. Glint never asks for your
  Discord password or account token.
- The only network activity Glint makes on its own is talking to the
  Discord desktop app over its official local IPC connection, on your own
  machine. Glint never calls Discord's HTTP API and never talks to any
  server of ours (we don't run one).
- The only other network requests Glint makes are ones you trigger
  yourself, like clicking a details/state URL you set on your own
  presence.
- Everything you configure (application profiles, presets, rotation
  settings, appearance) is stored in a single local file on your own
  computer, managed by [Tauri's store
  plugin](https://v2.tauri.app/plugin/store/). Nothing you enter ever
  leaves your machine.

If any of this ever changes, it'll be called out clearly in the README
and the release notes first.
