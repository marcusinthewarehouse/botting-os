use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscordMessage {
    pub id: String,
    pub channel_id: String,
    pub guild_id: Option<String>,
    pub content: String,
    pub author_name: String,
    pub author_bot: bool,
    pub timestamp: String,
    pub embeds: Vec<serde_json::Value>,
    pub attachments: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize, Clone)]
pub struct CdpCommand {
    pub id: u64,
    pub method: String,
    pub params: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct CdpResponse {
    pub id: Option<u64>,
    pub method: Option<String>,
    pub params: Option<serde_json::Value>,
    pub result: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscordStatusEvent {
    pub connected: bool,
    pub message: String,
}

pub const FLUX_HOOK_SCRIPT: &str = r#"(function() {
    if (window.__bottingos_hooked) return 'already_hooked';
    window.__bottingos_hooked = true;

    let wpRequire;
    webpackChunkdiscord_app.push([[Symbol()], {}, (r) => { wpRequire = r; }]);
    webpackChunkdiscord_app.pop();

    const dispatcher = Object.values(wpRequire.c)
        .map(m => m?.exports).filter(Boolean)
        .flatMap(e => [e, e.default, e.Z, e.ZP].filter(Boolean))
        .find(m => m?.dispatch && m?.subscribe && m?.unsubscribe);

    if (!dispatcher) return 'dispatcher_not_found';

    window.__bottingos_channels = new Set();

    dispatcher.subscribe('MESSAGE_CREATE', (event) => {
        if (window.__bottingos_channels.size > 0
            && !window.__bottingos_channels.has(event.channelId)) return;

        const msg = {
            id: event.message.id,
            channel_id: event.channelId,
            guild_id: event.guildId || null,
            content: event.message.content,
            author_name: event.message.author?.username || 'Unknown',
            author_bot: event.message.author?.bot || false,
            timestamp: event.message.timestamp,
            embeds: event.message.embeds || [],
            attachments: event.message.attachments || [],
        };
        console.log('__BOTTINGOS_MSG__' + JSON.stringify(msg));
    });

    return 'hooked_successfully';
})()"#;

pub const MSG_PREFIX: &str = "__BOTTINGOS_MSG__";
