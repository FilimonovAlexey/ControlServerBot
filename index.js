const { Bot, InlineKeyboard } = require('grammy');
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
require('dotenv').config();

const bot = new Bot(process.env.BOT_API_KEY);

// Подключение к удаленному серверу
const connectToServer = async () => {
  await ssh.connect({
    host: process.env.SERVER_HOST,
    username: process.env.SERVER_USERNAME,
    password: process.env.SERVER_PASSWORD,
  });
};

const getPM2Status = async () => {
  const result = await ssh.execCommand('pm2 jlist');
  if (result.stderr) {
    throw new Error(result.stderr);
  }
  return JSON.parse(result.stdout);
};

const executePM2Command = async (command, id) => {
  const result = await ssh.execCommand(`pm2 ${command} ${id}`);
  if (result.stderr) {
    throw new Error(result.stderr);
  }
  return result.stdout;
};

bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text('Статус PM2', 'status').row()
    .text('Остановить процесс', 'stop').row()
    .text('Перезапустить процесс', 'restart').row()
    .text('Запустить процесс', 'start').row();
  await ctx.reply('Выберите действие:', { reply_markup: keyboard });
});

bot.callbackQuery('status', async (ctx) => {
  try {
    await connectToServer();
    const status = await getPM2Status();
    const statusMessage = status
      .map((proc) => `${proc.pm_id}: ${proc.name} - ${proc.pm2_env.status}`)
      .join('\n');
    await ctx.reply(`Статус PM2:\n${statusMessage}`);
  } catch (error) {
    await ctx.reply(`Ошибка: ${error.message}`);
  }
});

bot.callbackQuery('stop', async (ctx) => {
  try {
    await connectToServer();
    const status = await getPM2Status();
    const keyboard = new InlineKeyboard();
    status.forEach((proc) => {
      keyboard.text(proc.name, `stop_${proc.pm_id}`).row();
    });
    await ctx.reply('Выберите процесс для остановки:', { reply_markup: keyboard });
  } catch (error) {
    await ctx.reply(`Ошибка: ${error.message}`);
  }
});

bot.callbackQuery('restart', async (ctx) => {
  try {
    await connectToServer();
    const status = await getPM2Status();
    const keyboard = new InlineKeyboard();
    status.forEach((proc) => {
      keyboard.text(proc.name, `restart_${proc.pm_id}`).row();
    });
    await ctx.reply('Выберите процесс для перезапуска:', { reply_markup: keyboard });
  } catch (error) {
    await ctx.reply(`Ошибка: ${error.message}`);
  }
});

bot.callbackQuery('start', async (ctx) => {
  try {
    await connectToServer();
    const status = await getPM2Status();
    const keyboard = new InlineKeyboard();
    status.forEach((proc) => {
      keyboard.text(proc.name, `start_${proc.pm_id}`).row();
    });
    await ctx.reply('Выберите процесс для запуска:', { reply_markup: keyboard });
  } catch (error) {
    await ctx.reply(`Ошибка: ${error.message}`);
  }
});

const handlePM2Command = (command) => async (ctx) => {
  const id = ctx.callbackQuery.data.split('_')[1];
  try {
    await connectToServer();
    await executePM2Command(command, id);
    await ctx.reply(`Процесс ${id} успешно ${command === 'stop' ? 'остановлен' : command === 'restart' ? 'перезапущен' : 'запущен'}.`);
  } catch (error) {
    await ctx.reply(`Ошибка: ${error.message}`);
  }
};

bot.callbackQuery(/^stop_\d+$/, handlePM2Command('stop'));
bot.callbackQuery(/^restart_\d+$/, handlePM2Command('restart'));
bot.callbackQuery(/^start_\d+$/, handlePM2Command('start'));

bot.start();
