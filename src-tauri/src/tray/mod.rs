//! System tray icon, menu, and click handling.
//!
//! Rust has no independent knowledge of presets: they live only in the
//! frontend's local store, so the menu is built from whatever list the
//! frontend last pushed via `commands::sync_tray_presets`, cached on
//! `AppState::tray_presets`, and rebuilt whenever that changes.

use std::sync::mpsc;

use tauri::{
    image::Image,
    menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, Wry,
};

/// A monochrome (alpha-only) sparkle glyph. macOS recolors template icons
/// to match the menu bar automatically via `icon_as_template`, so this
/// works in both light and dark menu bars without a separate asset per
/// theme. Other platforms just show it as a flat icon.
const TRAY_TEMPLATE_ICON: &[u8] = include_bytes!("../../icons/tray-template.png");

use crate::presence::PresencePayload;
use crate::state::{AppState, ConnectionCommand};

pub const TRAY_ID: &str = "main";

#[derive(Debug, Clone, serde::Deserialize)]
pub struct TrayPreset {
    pub id: String,
    pub name: String,
    pub app_id: String,
    pub payload: PresencePayload,
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let menu = build_menu(app, &[])?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(handle_menu_event)
        .icon_as_template(true);

    // Falls back to the platform's own default tray glyph if decoding the
    // bundled icon somehow fails at runtime, rather than failing startup
    // over a missing tray icon.
    match Image::from_bytes(TRAY_TEMPLATE_ICON) {
        Ok(icon) => builder = builder.icon(icon),
        Err(_) => {
            if let Some(icon) = app.default_window_icon() {
                builder = builder.icon(icon.clone());
            }
        }
    }

    builder.build(app)?;

    Ok(())
}

/// Rebuilds the tray menu to reflect a new preset list. Errors are swallowed
/// (best-effort UI refresh) rather than propagated: a stale tray menu
/// isn't worth failing over.
pub fn rebuild_menu(app: &AppHandle, presets: &[TrayPreset]) {
    if let Ok(menu) = build_menu(app, presets) {
        if let Some(tray) = app.tray_by_id(TRAY_ID) {
            let _ = tray.set_menu(Some(menu));
        }
    }
}

fn build_menu(app: &AppHandle, presets: &[TrayPreset]) -> tauri::Result<Menu<Wry>> {
    let show = MenuItem::with_id(app, "show", "Show Glint", true, None::<&str>)?;
    let stop = MenuItem::with_id(app, "stop", "Stop presence", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let sep_top = PredefinedMenuItem::separator(app)?;
    let sep_bottom = PredefinedMenuItem::separator(app)?;

    let preset_items: Vec<MenuItem<Wry>> = if presets.is_empty() {
        vec![MenuItem::with_id(
            app,
            "no_presets",
            "No presets saved",
            false,
            None::<&str>,
        )?]
    } else {
        presets
            .iter()
            .map(|p| {
                MenuItem::with_id(app, format!("preset:{}", p.id), &p.name, true, None::<&str>)
            })
            .collect::<tauri::Result<_>>()?
    };

    let mut items: Vec<&dyn IsMenuItem<Wry>> = vec![&show, &stop, &sep_top];
    items.extend(preset_items.iter().map(|item| item as &dyn IsMenuItem<Wry>));
    items.push(&sep_bottom);
    items.push(&quit);

    Menu::with_items(app, &items)
}

fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let Some(state) = app.try_state::<AppState>() else {
        return;
    };

    match event.id.as_ref() {
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "quit" => app.exit(0),
        "stop" => {
            // Clears every connected client, not just the primary one, so
            // "Stop presence" always means nothing is showing anywhere.
            for commands in state.all_command_senders() {
                let (reply_tx, _reply_rx) = mpsc::channel();
                let _ = commands.send(ConnectionCommand::ClearActivity(reply_tx));
            }
        }
        "no_presets" => {}
        id => {
            let Some(preset_id) = id.strip_prefix("preset:") else {
                return;
            };
            let Some(commands) = state.primary_command_sender() else {
                return;
            };
            let presets = state
                .tray_presets
                .lock()
                .expect("tray presets mutex poisoned");
            if let Some(preset) = presets.iter().find(|p| p.id == preset_id) {
                let (reply_tx, _reply_rx) = mpsc::channel();
                let _ = commands.send(ConnectionCommand::SetApplicationId(preset.app_id.clone()));
                let _ = commands.send(ConnectionCommand::SetActivity(
                    Box::new(preset.payload.clone()),
                    reply_tx,
                ));
            }
        }
    }
}
