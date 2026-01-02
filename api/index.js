const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Ваш Telegram ID
const ADMIN_ID = 1949612933;

// База кодов. Когда получите file_id, просто заменяйте ими FILE_ID_...
const videoDatabase = {
  "91": "FILE_ID_1", 
  "102": "FILE_ID_2",
  "secret": "FILE_ID_3"
};

// Функция для получения file_id (работает ТОЛЬКО для вас)
bot.on('video', async (ctx) => {
  if (ctx.from.id === ADMIN_ID) {
    const fileId = ctx.message.video.file_id;
    return ctx.reply(`✅ Код для базы:\n\n"${fileId}"`);
  }
  // Для обычных пользователей на отправку видео ничего не отвечаем или шлем ошибку
  return ctx.reply('Отправьте текстовый код видео.');
});

// Команда /start
bot.start((ctx) => {
  ctx.reply('Привет! Чтобы получить эксклюзивное видео, просто пришли мне его код (например, 91). \n\nУ нас всё честно: БЕЗ принудительных подписок!');
});

// Обработка кодов
bot.on('text', async (ctx) => {
  const userCode = ctx.message.text.trim();
  const videoId = videoDatabase[userCode];

  if (videoId) {
    try {
      // Отправляем видео по file_id
      await ctx.replyWithVideo(videoId, {
        caption: `Вот ваше видео по коду ${userCode}!`
      });
    } catch (error) {
      console.error('Ошибка отправки:', error);
      ctx.reply('Произошла ошибка при загрузке видео. Свяжитесь с поддержкой.');
    }
  } else {
    ctx.reply('❌ Неверный код. Попробуйте еще раз.');
  }
});

// Экспорт для Vercel
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error');
    }
  } else {
    res.status(200).send('Бот запущен и ждет обновлений через Webhook');
  }
};