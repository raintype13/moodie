const { Telegraf } = require('telegraf');

// Берем токен из переменных окружения
const bot = new Telegraf(process.env.BOT_TOKEN);

// База кодов и соответствующих видео (file_id или прямая ссылка)
// Рекомендую использовать file_id (как его получить — написал ниже)
const videoDatabase = {
  "91": "FILE_ID_OR_URL_1", 
  "102": "FILE_ID_OR_URL_2",
  "secret": "FILE_ID_OR_URL_3"
};

// Команда /start
bot.start((ctx) => {
  ctx.reply('Привет! Чтобы получить эксклюзивное видео, просто пришли мне его код (например, 91). \n\nУ нас всё честно: БЕЗ подписок на каналы!');
});

// Обработка любого текстового сообщения (проверка кода)
bot.on('text', async (ctx) => {
  const userCode = ctx.message.text.trim();
  const video = videoDatabase[userCode];

  if (video) {
    // Если код верный, отправляем видео
    try {
      await ctx.replyWithVideo(video, {
        caption: `Вот ваше видео по коду ${userCode}!`
      });
    } catch (error) {
      console.error(error);
      ctx.reply('Ошибка при отправке видео. Проверьте правильность ссылки или file_id.');
    }
  } else {
    // Если код не найден в базе
    ctx.reply('❌ Неверный код. Попробуйте еще раз или уточните код там, где вы его нашли.');
  }
});

// Экспорт для Vercel (чтобы он работал как Webhook)
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};

// Если запускаете локально для теста, раскомментируйте строку ниже:
// bot.launch();