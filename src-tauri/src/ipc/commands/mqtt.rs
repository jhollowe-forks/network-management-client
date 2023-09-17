use crate::ipc::CommandError;
use crate::state;
use crate::state::DeviceKey;

use log::{debug, info};
use rumqttc::EventLoop;
use rumqttc::{AsyncClient, MqttOptions, QoS};

pub struct MqttClient {
    pub client: AsyncClient,
    pub event_loop: EventLoop,
}

impl From<(AsyncClient, EventLoop)> for MqttClient {
    fn from((client, event_loop): (AsyncClient, EventLoop)) -> Self {
        Self { client, event_loop }
    }
}

// EventLoop doesn't implement std::fmt::Debug
impl std::fmt::Debug for MqttClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MqttClient")
            .field("client", &self.client)
            .finish()
    }
}

#[tauri::command]
pub async fn initialize_mqtt_client_proxy(
    client_proxy_state: tauri::State<'_, state::MqttClientProxyState>,
    device_key: DeviceKey,
    host: String,
    port: u16,
    topic: String,
) -> Result<(), CommandError> {
    debug!("Called initialize_mqtt_client_proxy command");

    let mqtt_options = MqttOptions::new(device_key.clone(), host.clone(), port);
    let mqtt_client: MqttClient = AsyncClient::new(mqtt_options, 64).into();

    info!(
        "Connecting MQTT client for device key \"{}\" with host \"{}\" and port \"{}\" on topic \"{}\"",
        device_key, host, port, topic.clone()
    );

    mqtt_client
        .client
        .subscribe(topic, QoS::AtLeastOnce)
        .await
        .map_err(|e| e.to_string())?;

    {
        let mut client_proxy_state_guard = client_proxy_state.inner.lock().await;
        client_proxy_state_guard.insert(device_key, mqtt_client);
    }

    Ok(())
}

#[tauri::command]
pub async fn destroy_mqtt_client_proxy(
    client_proxy_state: tauri::State<'_, state::MqttClientProxyState>,
    device_key: DeviceKey,
) -> Result<(), CommandError> {
    debug!("Called destroy_mqtt_client_proxy command");

    let mut client_proxy_state_guard = client_proxy_state.inner.lock().await;
    let mqtt_client = client_proxy_state_guard.remove(&device_key).ok_or(format!(
        "No MQTT client found for device key \"{}\"",
        device_key
    ))?;

    info!(
        "Disconnecting MQTT client for device key \"{}\"",
        device_key
    );

    mqtt_client
        .client
        .disconnect()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn destroy_all_mqtt_client_proxies(
    client_proxy_state: tauri::State<'_, state::MqttClientProxyState>,
) -> Result<(), CommandError> {
    debug!("Called destroy_all_mqtt_client_proxies command");

    let mut client_proxy_state_guard = client_proxy_state.inner.lock().await;

    for (device_key, mqtt_client) in client_proxy_state_guard.iter_mut() {
        info!(
            "Disconnecting MQTT client for device key \"{}\"",
            device_key
        );

        mqtt_client
            .client
            .disconnect()
            .await
            .map_err(|e| e.to_string())?;
    }

    client_proxy_state_guard.clear();

    Ok(())
}
