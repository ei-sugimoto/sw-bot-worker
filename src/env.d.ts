/**
 * Environment variable types for SwitchBot Worker
 * Secrets are set via `wrangler secret put`
 */
declare global {
	interface Env {
		// SwitchBot API credentials
		SWITCHBOT_TOKEN: string;
		SWITCHBOT_SECRET: string;

		// LINE Messaging API credentials
		LINE_CHANNEL_ACCESS_TOKEN: string;
		LINE_USER_ID: string;

		// KV Namespace for alert state management
		CO2_ALERT_STATE: KVNamespace;
	}
}

export {};
