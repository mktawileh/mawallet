import TelegarmBot from "./TelegramBot";
import Storage, { Commands } from "./storage";
import TEXT from "./locale";

export default class MaWalletBot extends TelegarmBot {
  storage?: Storage;
  allowedUsers: string[];

  constructor(token: string, allowedUsers: string) {
    super(token);
    this.allowedUsers = allowedUsers.split(',');
  }

  async handleMessage(msg: any) {
    const { id } = msg.chat;

    if (!this.allowedUsers.includes(msg.from.username)) {
      this.sendMessage(id, "Sorry you're not allowed to use this bot");
      return;
    }

    if (!this.storage) return new Response("nothing");
    let chat = await this.storage.getChat(id);
    if (!chat) {
      await this.createChat(msg);
    }
    chat = await this.storage.getChat(id);
    if (!chat) return;
    let res;
    const trans_rgex = /([-+]?[0-9]+(?:\.[0-9]+)?)(?:\s?(.*)?)/;
    if (/[0-9]+/.test(msg.text) && chat.last_command == 'choose-month') {
      const year = parseInt(chat.last_msg_text as string);
      const month = parseInt(msg.text) - 1
      await this.sendStat(id, year, month);
    } else if (/[0-9]+/.test(msg.text) && chat.last_command == 'date') {
      await this.updateLastMsgText(id, msg.text);
      await this.askForDate(id, false);
      await this.updateLastCommand(id, 'choose-month');
    } else if (/\/show.*/.test(msg.text)) {
      await this.sendCurrentWallet(id);
    } else if (trans_rgex.test(msg.text)) {
      const match = msg.text.match(trans_rgex)
      const value = parseFloat(match[1]);
      let note = match[2];
      if (!note) note = "";
      await this.makeTransaction(id, value, msg.date, note.trim());
      await this.updateLastCommand(id, 'trans');
    } else if (/\/start/.test(msg.text)) {
      await this.sendMessage(id, "Welcome to MaWalletBot ☺\n");
      await this.updateLastCommand(id, 'start');
      return;
    } else if (/\/date/.test(msg.text)) {
      await this.askForDate(id, true);
      await this.updateLastCommand(id, 'date');
    }

    await this.deleteMessage(id, msg.message_id);
  }

  async updateLastCommand(id: number, command: Commands) {
    if (!this.storage) return;
    const chat = await this.storage.getChat(id);
    if (!chat) return;
    chat.last_command = command;
    await this.storage.saveChat(id, chat);
  }

  async updateLastMsgText(id: number, text: string) {
    if (!this.storage) return;
    const chat = await this.storage.getChat(id);
    if (!chat) return;
    chat.last_msg_text = text;
    await this.storage.saveChat(id, chat);
  }

  async updateLastBotMsg(id: number, msg_id: number) {
    if (!this.storage) return;
    const chat = await this.storage.getChat(id);
    if (!chat) return;
    chat.last_bot_msg = msg_id;
    await this.storage.saveChat(id, chat);
  }

  async sendStat(id: number, year: number, month: number) {
    if (!this.storage) return
    const chat = await this.storage.getChat(id);
    if (!chat) return;
    let income = 0;
    let outcome = 0;
    let prev = 0;
    let cnt = 0;
    for (let tran of chat.trans) {
      const tran_year = new Date(tran.date * 1000).getFullYear();
      const tarn_month = new Date(tran.date * 1000).getMonth();
      // if (tran_year <= year && tarn_month < month) {
      //   prev += tran.value;
      // }
      if (tran_year != year || tarn_month != month) continue;
      if (tran.value >= 0) income += tran.value;
      else outcome += -tran.value;
      cnt++;
    }
    let res;
    const net = income - outcome;
    if (cnt > 0) {
      let text = '';
      text += `*${year} / ${month + 1}*\n\n`;
      text += `💰 *${prev.toLocaleString()}*\n`;
      text += `➕ ${income.toLocaleString()}\n`;
      text += `➖ ${outcome.toLocaleString()}\n`;
      text += `🟰 *${net.toLocaleString()}*\n`;
      res = await this.sendMessage(id, text);
    } else {
      res = await this.sendMessage(id, `${TEXT.ar.NO_DATA}`);
    }
    if (res.message_id) {
      if (chat.last_bot_msg) {
        await this.deleteMessage(id, chat.last_bot_msg);
      }
      await this.updateLastBotMsg(id, res.message_id);
    }
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
    });
    chat.wallet += value;
    let res = value >= 0 ? '➕' : '➖';
    res += ' ' + Math.abs(value).toLocaleString();
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
    const { wallet, last_bot_msg } = chat;
    const message = await this.sendMessage(id, `💰: *${wallet.toLocaleString()}*`);
    if (last_bot_msg !== undefined) {
      await this.deleteMessage(id, last_bot_msg);
    }
    chat.last_bot_msg = message.message_id;
    await this.storage.saveChat(id, chat);
  }

  async askForDate(id: number, year: boolean) {
    if (!this.storage) return;
    const chat = await this.storage?.getChat(id);
    if (!chat) return;
    const optionsSet = new Set();
    for (let tran of chat.trans) {
      if (year)
        optionsSet.add(new Date(tran.date * 1000).getFullYear());
      else
        optionsSet.add(new Date(tran.date * 1000).getMonth() + 1);
    }
    const options: any = Array.from(optionsSet.values()).reduce((acc: any, cur, i) => {
      if (i % 2 == 0) {
        acc.push([`${cur}`]);
      } else {
        acc[acc.length - 1].push(`${cur}`);
      }
      return acc;
    }, []);

    const res = await this.sendMessage(id, year ? TEXT.ar.ASK_YEAR : TEXT.ar.ASK_MONTH, {
      reply_markup: {
        keyboard: options,
        one_time_keyboard: true,
        resize_keyboard: true
      }
    });
    if (chat.last_bot_msg) {
      await this.deleteMessage(id, chat.last_bot_msg);
    }
    await this.updateLastBotMsg(id, res.message_id)
  }


  private async createChat(msg: any) {
    if (!this.storage) return;
    await this.storage.saveChat(msg.chat.id, {
      first_name: msg.chat.first_name,
      username: msg.chat.username,
      language_code: msg.chat.language_code,
      wallet: 0,
      last_command: "start",
      trans: [],
    });
  }

}