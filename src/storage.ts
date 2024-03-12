import { Env } from ".";


export type Commands = 'date' | 'show' | 'start' | 'choose-month' | 'trans' | 'get-stat';

type Chat = {
  first_name: string;
  username: string;
  language_code?: string;
  last_show_msg_id?: number;
  last_command?: Commands;
  last_msg_text?: string;
  last_bot_msg?: number;
  wallet: number;
  trans: Transaction[]
}

type Transaction = {
  value: number;
  date: number;
  note?: string;
}

export default class Storage {
  env: Env;
  constructor(env: Env) {
    this.env = env;
  }

  async getChat(id: number): Promise<Chat | undefined> {
    const data = await this.env.DATA.get(id.toString());
    if (!data) return undefined;
    const chat: Chat = JSON.parse(data);
    return chat;
  }

  async saveChat(id: number, chat: Chat) {
    await this.env.DATA.put(id.toString(), JSON.stringify(chat));
  }

  async list() {
    return await this.env.DATA.list();
  }
}
