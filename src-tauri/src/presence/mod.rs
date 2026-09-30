//! Our presence data model and its conversion into a `discord-rich-presence` `Activity`.
//!
//! This is the single source of truth for what a "preset" looks like; the
//! frontend's `PresencePayload` TS type must stay structurally identical.

use discord_rich_presence::activity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ActivityKind {
    Playing,
    Listening,
    Watching,
    Competing,
}

impl From<ActivityKind> for activity::ActivityType {
    fn from(kind: ActivityKind) -> Self {
        match kind {
            ActivityKind::Playing => activity::ActivityType::Playing,
            ActivityKind::Listening => activity::ActivityType::Listening,
            ActivityKind::Watching => activity::ActivityType::Watching,
            ActivityKind::Competing => activity::ActivityType::Competing,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StatusDisplay {
    Name,
    State,
    Details,
}

impl From<StatusDisplay> for activity::StatusDisplayType {
    fn from(display: StatusDisplay) -> Self {
        match display {
            StatusDisplay::Name => activity::StatusDisplayType::Name,
            StatusDisplay::State => activity::StatusDisplayType::State,
            StatusDisplay::Details => activity::StatusDisplayType::Details,
        }
    }
}

/// How the activity's time bar behaves. Start/end are unix milliseconds,
/// per Discord's documented Activity object.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "mode", rename_all = "snake_case")]
pub enum Timing {
    Off,
    ElapsedSinceStart { start_ms: i64 },
    Countdown { end_ms: i64 },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PresenceButton {
    pub label: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct PresencePayload {
    /// Attempted "Playing X" override. Local RPC may ignore this in favor
    /// of the connecting application's registered name (only reliably
    /// honored for your own registered application).
    pub name: Option<String>,
    pub activity_type: Option<ActivityKind>,
    pub status_display: Option<StatusDisplay>,

    pub details: Option<String>,
    pub details_url: Option<String>,
    pub state: Option<String>,
    pub state_url: Option<String>,

    pub large_image: Option<String>,
    pub large_text: Option<String>,
    pub large_url: Option<String>,
    pub small_image: Option<String>,
    pub small_text: Option<String>,
    pub small_url: Option<String>,

    pub timing: Option<Timing>,

    pub party_size: Option<i32>,
    pub party_max: Option<i32>,

    pub buttons: Vec<PresenceButton>,
}

impl PresencePayload {
    pub fn to_activity(&self) -> activity::Activity<'_> {
        let mut act = activity::Activity::new();

        if let Some(name) = &self.name {
            act = act.name(name.as_str());
        }
        if let Some(kind) = self.activity_type {
            act = act.activity_type(kind.into());
        }
        if let Some(display) = self.status_display {
            act = act.status_display_type(display.into());
        }
        if let Some(details) = &self.details {
            act = act.details(details.as_str());
        }
        if let Some(url) = &self.details_url {
            act = act.details_url(url.as_str());
        }
        if let Some(state) = &self.state {
            act = act.state(state.as_str());
        }
        if let Some(url) = &self.state_url {
            act = act.state_url(url.as_str());
        }

        let mut assets = activity::Assets::new();
        let mut has_assets = false;
        if let Some(v) = &self.large_image {
            assets = assets.large_image(v.as_str());
            has_assets = true;
        }
        if let Some(v) = &self.large_text {
            assets = assets.large_text(v.as_str());
            has_assets = true;
        }
        if let Some(v) = &self.large_url {
            assets = assets.large_url(v.as_str());
            has_assets = true;
        }
        if let Some(v) = &self.small_image {
            assets = assets.small_image(v.as_str());
            has_assets = true;
        }
        if let Some(v) = &self.small_text {
            assets = assets.small_text(v.as_str());
            has_assets = true;
        }
        if let Some(v) = &self.small_url {
            assets = assets.small_url(v.as_str());
            has_assets = true;
        }
        if has_assets {
            act = act.assets(assets);
        }

        match self.timing {
            Some(Timing::ElapsedSinceStart { start_ms }) => {
                act = act.timestamps(activity::Timestamps::new().start(start_ms));
            }
            Some(Timing::Countdown { end_ms }) => {
                act = act.timestamps(activity::Timestamps::new().end(end_ms));
            }
            Some(Timing::Off) | None => {}
        }

        if let (Some(size), Some(max)) = (self.party_size, self.party_max) {
            // Discord silently drops the party size unless an `id` is present
            // (confirmed against Discord's own RPC docs, which always pair
            // `party.id` with `party.size`): generate one so the user never
            // has to think about it. The id must stay STABLE across repeated
            // sends: it used to be re-derived from the current timestamp on
            // every call, so every Start/Update/rotation tick looked to
            // Discord like a brand new party, and the size stopped rendering
            // even though every individual SET_ACTIVITY was acked with no
            // error. `party_id()` is stable for the lifetime of this process.
            act = act.party(activity::Party::new().id(party_id()).size([size, max]));
        }

        if !self.buttons.is_empty() {
            let buttons = self
                .buttons
                .iter()
                .take(2)
                .map(|b| activity::Button::new(b.label.as_str(), b.url.as_str()))
                .collect();
            act = act.buttons(buttons);
        }

        act
    }
}

/// A party id that's stable for as long as this process runs. Discord only
/// needs *a* non-empty id to render `party.size` at all (it isn't used for
/// any join/invite flow here), so process identity is enough. There's no
/// need to persist it across restarts.
fn party_id() -> &'static str {
    use std::sync::OnceLock;
    static PARTY_ID: OnceLock<String> = OnceLock::new();
    PARTY_ID.get_or_init(|| format!("glint-{}", std::process::id()))
}
