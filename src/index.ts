import TelegramBot from "./TelegramBot";
import Storage from "./storage";

export interface Env {
	DATA: KVNamespace;
	TELEGRAM_BOT_TOKEN: string;
	ALLOWED_USERS: string;
}

let bot: TelegramBot;

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;
		const webhookEndpoint = env.TELEGRAM_BOT_TOKEN.slice(0, 10);
		const workerUrl = `${url.protocol}//${url.host}/${webhookEndpoint}`;
		bot = bot || new TelegramBot(env.TELEGRAM_BOT_TOKEN, env.ALLOWED_USERS);
		bot.storage = new Storage(env);
		if (method === "POST" && path === '/' + webhookEndpoint) {
			const update: any = await request.json();
			if ("message" in update) {
				ctx.waitUntil(bot.handleMessage(update.message));
			}
		} else if (method === "GET" && path === "/configure-webhook") {
			const res = await bot.setWebHook(workerUrl);
			if (res.ok) {
				return new Response("Webhook set successfully");
			} else {
				return new Response("Failed to set Webhook");
			}
		}
		return new Response("Ok");
	},
};
