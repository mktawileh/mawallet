import Storage from "./storage";

export type Params = { [key: string]: string };

export default class TelegramBot {
  token: string;
  api: string = 'https://api.telegram.org/bot';

  constructor(token: string,) {
    this.token = token;
  }

  async setWebHook(url: string): Promise<Response> {
    return this.sendGetRequest('setWebhook', { url });
  }

  async sendMessage(chat_id: number, text: string, options: any = {}): Promise<any> {
    const apiUrl = this.url + 'sendMessage';
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chat_id.toString(),
        text: text,
        parse_mode: "Markdown",
        ...options
      })
    });
    if (res.ok) {
      return (await res.json() as any).result;
    } return null;
  }

  async deleteMessage(chat_id: number, message_id: number) {
    await this.sendGetRequest('deleteMessage', {
      chat_id: chat_id.toString(),
      message_id: message_id.toString()
    });
  }

  private async sendGetRequest(path: string, params: Params): Promise<Response> {
    const apiUrl = this.url + path + this.flatParams(params);
    return await fetch(apiUrl);
  }

  private flatParams(params: Params) {
    let arr: string[] = [];
    for (let key in params) {
      arr.push(key + '=' + params[key]);
    }
    return "?" + arr.join('&');
  }

  private get url(): string {
    return this.api + this.token + '/';
  }
}