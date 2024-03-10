import Storage from "./storage";

export type Params = { [key: string]: string };

export default class TelegramBot {
  token: string;
  api: string = 'https://api.telegram.org/bot';
  allowedUsers: string[];
  storage?: Storage;

  constructor(token: string, allowedUsers: string) {
    this.token = token;
    this.allowedUsers = allowedUsers.split(',');
  }
  async setWebHook(url: string): Promise<Response> {
    return this.sendGetRequest('setWebhook', { url });
  }

  async handleMessage(msg: any) {
    const { id } = msg.chat;

    if (!this.allowedUsers.includes(msg.from.username)) {
      this.sendMessage(id, "Sorry you're not allowed to use this bot");
      return;
    }

    if (!this.storage) return new Response("nothing");
    const chat = await this.storage.getChat(id);
    if (!chat) {
      await this.createChat(msg);
    }

    const trans_rgex = /(\-?[0-9]+(?:\.[0-9]+)?)\s*?(\n.*)?/;
    if (/\/show.*/.test(msg.text)) {
      await this.sendCurrentWallet(id);
    } else if (trans_rgex.test(msg.text)) {
      const match = msg.text.match(trans_rgex)
      const value = parseFloat(match[1]);
      let note = match[2];
      if (!note) note = "";
      await this.makeTransaction(id, value, msg.date, note);
    } else if (/\/start/.test(msg.text)) {
      await this.sendMessage(id, "Welcome to MaWalletBot ☺\n");
      return;
    }
    await this.deleteMessage(id, msg.message_id);
  }

  async sendMessage(chat_id: number, text: string): Promise<any> {
    const apiUrl = this.url + 'sendMessage' + this.flatParams({
      chat_id: chat_id.toString(),
      text: encodeURIComponent(text),
      parse_mode: "Markdown"
    });
    const res = await fetch(apiUrl);
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


  async makeTransaction(id: number, value: number, date: number, note?: string) {
    if (value > 1000000000) {
      await this.sendMessage(id, "*❌ Can't add this amount to your wallet\n could cause overflow 🙂!*");
      return;
    }
    if (!this.storage) return;
    const chat = await this.storage.getChat(id);
    if (!chat) return;
    chat.trans.push({
      note,
      value,
      date
    })
    chat.wallet += value;
    let res = value >= 0 ? '➕' : '➖';
    res += ' ' + value.toLocaleString();
    if (note) {
      if (note.charAt(0) === '\n') {
        note = note.slice(1, note.length);
      }
      res += '\n🖋: ' + note;
    }
    await this.sendMessage(id, `*${res}*`);
    await this.storage.saveChat(id, chat);
  }

  async sendCurrentWallet(id: number) {
    if (!this.storage) return;
    const chat = await this.storage.getChat(id);
    if (!chat) return;
    const { wallet, last_show_msg_id } = chat;
    const message = await this.sendMessage(id, `💰: *${wallet.toLocaleString()}*`);
    if (last_show_msg_id !== undefined) {
      await this.deleteMessage(id, last_show_msg_id);
    }
    chat.last_show_msg_id = message.message_id;
    await this.storage.saveChat(id, chat);
  }

  private async createChat(msg: any) {
    if (!this.storage) return;
    await this.storage.saveChat(msg.chat.id, {
      first_name: msg.chat.first_name,
      username: msg.chat.username,
      wallet: 0,
      trans: [],
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