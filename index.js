const { Bot, Keyboard, session } = require('grammy');
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
require('dotenv').config();

const bot = new Bot(process.env.BOT_API_KEY);
const adminId = parseInt(process.env.ADMIN_ID, 10);

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

const executeCommand = async (command) => {
  const result = await ssh.execCommand(command);
  if (result.stderr) {
    throw new Error(result.stderr);
  }
  return result.stdout;
};

const executePM2Command = async (command, id) => {
  const result = await ssh.execCommand(`pm2 ${command} ${id}`);
  if (result.stderr) {
    throw new Error(result.stderr);
  }
  return result.stdout;
};

// Проверка пользователя
const checkUser = (ctx, next) => {
  const userId = ctx.from?.id;
  if (userId === adminId) {
    return next();
  } else {
    ctx.reply('У вас нет доступа к этому боту.');
  }
};

const mainKeyboard = new Keyboard()
  .text('PM2').row()
  .text('Серверные команды').row();

const pm2Keyboard = new Keyboard()
  .text('Статус PM2').row()
  .text('Остановить процесс').row()
  .text('Перезапустить процесс').row()
  .text('Запустить процесс').row()
  .text('Назад').row();

const serverCommandsKeyboard = new Keyboard()
  .text('Перезапуск сервера').row()
  .text('Обновления пакетов').row()
  .text('Назад').row();

bot.use(session({ initial: () => ({}) }));

bot.command('start', checkUser, async (ctx) => {
  await ctx.reply('Выберите категорию:', { reply_markup: { keyboard: mainKeyboard.build() } });
});

bot.hears('Назад', checkUser, async (ctx) => {
  await ctx.reply('Выберите категорию:', { reply_markup: { keyboard: mainKeyboard.build() } });
});

bot.hears('PM2', checkUser, async (ctx) => {
  await ctx.reply('Выберите действие для PM2:', { reply_markup: { keyboard: pm2Keyboard.build() } });
});

bot.hears('Серверные команды', checkUser, async (ctx) => {
  await ctx.reply('Выберите команду для сервера:', { reply_markup: { keyboard: serverCommandsKeyboard.build() } });
});

bot.hears('Статус PM2', checkUser, async (ctx) => {
  try {
    await connectToServer();
    const status = await getPM2Status();
    const statusMessage = status
      .map((proc) => `${proc.pm_id}: ${proc.name} - ${proc.pm2_env.status}`)
      .join('\n');
    await ctx.reply(`Статус PM2:\n${statusMessage}`, { reply_markup: { keyboard: pm2Keyboard.build() } });
  } catch (error) {
    await ctx.reply(`Ошибка: ${error.message}`, { reply_markup: { keyboard: pm2Keyboard.build() } });
  }
});

const createProcessKeyboard = (processes) => {
  const keyboard = new Keyboard();
  processes.forEach((proc) => {
    keyboard.text(proc.name).row();
  });
  keyboard.text('Назад').row();
  return keyboard;
};

bot.hears('Остановить процесс', checkUser, async (ctx) => {
  try {
    await connectToServer();
    const status = await getPM2Status();
    const keyboard = createProcessKeyboard(status);
    ctx.session.currentCommand = 'stop';
    await ctx.reply('Выберите процесс для остановки:', { reply_markup: { keyboard: keyboard.build() } });
  } catch (error) {
    await ctx.reply(`Ошибка: ${error.message}`, { reply_markup: { keyboard: pm2Keyboard.build() } });
  }
});

bot.hears('Перезапустить процесс', checkUser, async (ctx) => {
  try {
    await connectToServer();
    const status = await getPM2Status();
    const keyboard = createProcessKeyboard(status);
    ctx.session.currentCommand = 'restart';
    await ctx.reply('Выберите процесс для перезапуска:', { reply_markup: { keyboard: keyboard.build() } });
  } catch (error) {
    await ctx.reply(`Ошибка: ${error.message}`, { reply_markup: { keyboard: pm2Keyboard.build() } });
  }
});

bot.hears('Запустить процесс', checkUser, async (ctx) => {
  try {
    await connectToServer();
    const status = await getPM2Status();
    const keyboard = createProcessKeyboard(status);
    ctx.session.currentCommand = 'start';
    await ctx.reply('Выберите процесс для запуска:', { reply_markup: { keyboard: keyboard.build() } });
  } catch (error) {
    await ctx.reply(`Ошибка: ${error.message}`, { reply_markup: { keyboard: pm2Keyboard.build() } });
  }
});

bot.hears('Перезапуск сервера', checkUser, async (ctx) => {
  try {
    await connectToServer();
    await executeCommand('sudo reboot');
    await ctx.reply('Сервер успешно перезагружается.', { reply_markup: { keyboard: serverCommandsKeyboard.build() } });
  } catch (error) {
    await ctx.reply(`Ошибка: ${error.message}`, { reply_markup: { keyboard: serverCommandsKeyboard.build() } });
  }
});

bot.hears('Обновления пакетов', checkUser, async (ctx) => {
  try {
    await connectToServer();
    await executeCommand('sudo apt-get update && sudo apt-get upgrade -y');
    await ctx.reply('Все пакеты успешно обновлены.', { reply_markup: { keyboard: serverCommandsKeyboard.build() } });
  } catch (error) {
    await ctx.reply(`Ошибка: ${error.message}`, { reply_markup: { keyboard: serverCommandsKeyboard.build() } });
  }
});

const handlePM2Command = async (ctx) => {
  const command = ctx.session.currentCommand;
  const processName = ctx.message.text;
  if (processName === 'Назад') {
    await ctx.reply('Выберите действие для PM2:', { reply_markup: { keyboard: pm2Keyboard.build() } });
    return;
  }
  try {
    await connectToServer();
    const status = await getPM2Status();
    const process = status.find((proc) => proc.name === processName);
    if (!process) {
      await ctx.reply('Процесс не найден.', { reply_markup: { keyboard: pm2Keyboard.build() } });
      return;
    }
    await executePM2Command(command, process.pm_id);
    await ctx.reply(`Процесс ${processName} успешно ${command === 'stop' ? 'остановлен' : command === 'restart' ? 'перезапущен' : 'запущен'}.`, { reply_markup: { keyboard: pm2Keyboard.build() } });
  } catch (error) {
    await ctx.reply(`Ошибка: ${error.message}`, { reply_markup: { keyboard: pm2Keyboard.build() } });
  }
};

bot.hears(/^[\w-]+$/, checkUser, handlePM2Command);

bot.api.setMyCommands([
  { command: 'start', description: 'Запуск бота' },
]);

bot.start();
