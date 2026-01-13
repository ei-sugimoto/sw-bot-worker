/**
 * SwitchBot CO2 Monitor Worker
 *
 * This Worker fetches CO2 data from SwitchBot API on a scheduled interval
 * and sends LINE notifications when CO2 levels exceed the threshold.
 * https://github.com/OpenWonderLabs/SwitchBotAPI
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` to test
 * - Run `npm run deploy` to publish your Worker
 *
 * Required secrets (set via `wrangler secret put`):
 * - SWITCHBOT_TOKEN
 * - SWITCHBOT_SECRET
 * - LINE_CHANNEL_ACCESS_TOKEN
 * - LINE_USER_ID
 */

/**
 * CO2 threshold for alerts (ppm)
 */
const CO2_THRESHOLD = 3000;

/**
 * KV key for tracking alert state
 */
const ALERT_STATE_KEY = 'co2_alert_active';

interface SwitchBotDevice {
	deviceId: string;
	deviceName: string;
	deviceType: string;
	hubDeviceId: string;
}

interface SwitchBotDeviceListResponse {
	statusCode: number;
	body: {
		deviceList: SwitchBotDevice[];
		infraredRemoteList: unknown[];
	};
	message: string;
}

interface SwitchBotDeviceStatus {
	deviceId: string;
	deviceType: string;
	temperature: number;
	humidity: number;
	CO2: number;
	battery: number;
}

interface SwitchBotStatusResponse {
	statusCode: number;
	body: SwitchBotDeviceStatus;
	message: string;
}

/**
 * Generate HMAC-SHA256 signature for SwitchBot API authentication
 */
async function generateSignature(token: string, secret: string, t: string, nonce: string): Promise<string> {
	const data = token + t + nonce;
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
	return btoa(String.fromCharCode(...new Uint8Array(signature))).toUpperCase();
}

/**
 * Generate headers for SwitchBot API requests
 */
async function generateHeaders(env: Env): Promise<Record<string, string>> {
	const t = Date.now().toString();
	const nonce = crypto.randomUUID();
	const sign = await generateSignature(env.SWITCHBOT_TOKEN, env.SWITCHBOT_SECRET, t, nonce);

	return {
		Authorization: env.SWITCHBOT_TOKEN,
		sign: sign,
		t: t,
		nonce: nonce,
		'Content-Type': 'application/json',
	};
}

/**
 * Fetch all devices and find the CO2 sensor
 */
async function findCO2SensorDeviceId(env: Env): Promise<string> {
	const headers = await generateHeaders(env);

	const response = await fetch('https://api.switch-bot.com/v1.1/devices', { headers });

	if (!response.ok) {
		throw new Error(`SwitchBot API error: ${response.status} ${response.statusText}`);
	}

	const data = (await response.json()) as SwitchBotDeviceListResponse;

	if (data.statusCode !== 100) {
		throw new Error(`SwitchBot API error: ${data.message}`);
	}

	// Find CO2 sensor device (deviceType: "MeterPro(CO2)" or contains "CO2")
	const co2Device = data.body.deviceList.find(
		(device) => device.deviceType === 'MeterPro(CO2)' || device.deviceType.includes('CO2')
	);

	if (!co2Device) {
		throw new Error('CO2 sensor device not found');
	}

	return co2Device.deviceId;
}

/**
 * Fetch device status from SwitchBot API
 */
async function getSwitchBotDeviceStatus(env: Env, deviceId: string): Promise<SwitchBotDeviceStatus> {
	const headers = await generateHeaders(env);

	const response = await fetch(`https://api.switch-bot.com/v1.1/devices/${deviceId}/status`, { headers });

	if (!response.ok) {
		throw new Error(`SwitchBot API error: ${response.status} ${response.statusText}`);
	}

	const data = (await response.json()) as SwitchBotStatusResponse;

	if (data.statusCode !== 100) {
		throw new Error(`SwitchBot API error: ${data.message}`);
	}

	return data.body;
}

/**
 * Send notification via LINE Messaging API (Push Message)
 */
async function sendLineMessage(channelAccessToken: string, userId: string, message: string): Promise<boolean> {
	const response = await fetch('https://api.line.me/v2/bot/message/push', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${channelAccessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			to: userId,
			messages: [
				{
					type: 'text',
					text: message,
				},
			],
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error(`LINE Messaging API error: ${response.status} ${response.statusText} - ${errorText}`);
		return false;
	}

	return true;
}

/**
 * Check if alert is currently active
 */
async function isAlertActive(kv: KVNamespace): Promise<boolean> {
	const state = await kv.get(ALERT_STATE_KEY);
	return state !== null;
}

/**
 * Set alert state to active
 */
async function setAlertActive(kv: KVNamespace, co2Value: number): Promise<void> {
	await kv.put(ALERT_STATE_KEY, JSON.stringify({ co2Value, timestamp: new Date().toISOString() }));
}

/**
 * Clear alert state
 */
async function clearAlertState(kv: KVNamespace): Promise<void> {
	await kv.delete(ALERT_STATE_KEY);
}

/**
 * Build alert message for LINE
 */
function buildAlertMessage(status: SwitchBotDeviceStatus): string {
	return `[CO2警告] 換気が必要です!

CO2濃度: ${status.CO2} ppm
温度: ${status.temperature}°C
湿度: ${status.humidity}%

CO2濃度が ${CO2_THRESHOLD} ppm を超えました。
窓を開けるなどして換気してください。`;
}

export default {
	async fetch(req) {
		const url = new URL(req.url);
		url.pathname = '/__scheduled';
		url.searchParams.append('cron', '* * * * *');
		return new Response(
			`To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`
		);
	},

	async scheduled(event, env, ctx): Promise<void> {
		try {
			// Fetch CO2 data
			const deviceId = await findCO2SensorDeviceId(env);
			const status = await getSwitchBotDeviceStatus(env, deviceId);
			console.log(`[${event.cron}] CO2: ${status.CO2} ppm, Temp: ${status.temperature}°C, Humidity: ${status.humidity}%`);

			// Check current alert state
			const alertActive = await isAlertActive(env.CO2_ALERT_STATE);

			if (status.CO2 >= CO2_THRESHOLD) {
				// CO2 exceeds threshold
				if (!alertActive) {
					// Send notification only if not already notified
					console.log(`[${event.cron}] CO2 threshold exceeded. Sending LINE notification...`);
					const message = buildAlertMessage(status);
					const success = await sendLineMessage(env.LINE_CHANNEL_ACCESS_TOKEN, env.LINE_USER_ID, message);

					if (success) {
						await setAlertActive(env.CO2_ALERT_STATE, status.CO2);
						console.log(`[${event.cron}] LINE notification sent successfully.`);
					} else {
						console.error(`[${event.cron}] Failed to send LINE notification.`);
					}
				} else {
					console.log(`[${event.cron}] Alert already active. Skipping notification.`);
				}
			} else {
				// CO2 is below threshold
				if (alertActive) {
					await clearAlertState(env.CO2_ALERT_STATE);
					console.log(`[${event.cron}] CO2 level back to normal. Alert state cleared.`);
				}
			}
		} catch (error) {
			console.error(`[${event.cron}] Failed to process CO2 data:`, error);
		}
	},
} satisfies ExportedHandler<Env>;
