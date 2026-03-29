const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMIN_ID = 1949612933;
const CHANNEL_ID = '@moodie_mc';
const CHANNEL_URL = 'https://t.me/moodie_mc';

// Хранилище временных состояний (кто сейчас в режиме задания вопроса)
// На Vercel это работает в пределах одного запуска, для простых задач достаточно
const userState = new Map();

const videoDatabase = {
  "91_1": "BAACAgIAAxkBAAMPaVfqSQfXGqzbcOu65RLso0I6FPQAAn2LAALoFcFKOz5ZXfx4j3A4BA", 
  "91_2": "BAACAgIAAxkBAAMSaVfv4zY002eSZQI-vtdgJZpWlP4AAtCLAALoFcFKffgaa2M3A_84BA",
  "91_3": "BAACAgIAAxkBAAMUaVfxPmwEIIys0pyjpsTSu_evD6oAAueLAALoFcFK9EcKn_n3HkQ4BA",
  "91_4": "BAACAgIAAxkBAAMWaVfyrQgmWcWZeLiyJgzW_5bYDZYAAv-LAALoFcFKFW6UwKj23kU4BA",
  "82": "BAACAgIAAxkBAAP-acjgtv1kcBKy9aNj4ekbE1jLrOAAAr-JAAJH6clIEaAu2y179dY6BA"
};

async function checkSubscription(ctx) {
  try {
    const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (e) {
    return false;
  }
}

// --- 1. КОМАНДЫ (САМЫЙ ВЫСОКИЙ ПРИОРИТЕТ) ---

bot.start((ctx) => {
  userState.delete(ctx.from.id);
  ctx.reply('Введите код для просмотра фильма или сериала');
});

bot.command('movie', (ctx) => {
  userState.delete(ctx.from.id);
  ctx.reply(
    'Не знаешь что посмотреть? Можешь выбрать фильм или сериал для просмотра через наш YouTube.',
    Markup.inlineKeyboard([
      Markup.button.url('Moodie MC', 'https://www.youtube.com/@moodie_mc')
    ])
  );
});

bot.command('question', (ctx) => {
  // Включаем режим вопроса для этого пользователя
  userState.set(ctx.from.id, 'awaiting_question');
  ctx.reply('Какой вопрос хочешь задать?');
});

// --- 2. ОБРАБОТКА ВИДЕО (ДЛЯ АДМИНА) ---
bot.on('video', async (ctx) => {
  if (ctx.from.id === ADMIN_ID) {
    return ctx.reply(`✅ Код для базы:\n\n"${ctx.message.video.file_id}"`);
  }
});

// --- 3. ОБРАБОТКА ТЕКСТА ---

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  const userId = ctx.from.id;

  // А) Если пишет АДМИН в режиме ответа (Reply)
  if (userId === ADMIN_ID && ctx.message.reply_to_message) {
    const replyMessage = ctx.message.reply_to_message;
    const originalText = replyMessage.text || replyMessage.caption || "";
    // Ищем ID в тексте сообщения, на которое отвечаем
    const match = originalText.match(/ID:\s*(\d+)/i);

    if (match) {
      const targetUserId = match[1];
      try {
        await ctx.telegram.sendMessage(targetUserId, `✉️ **Ответ от админа:**\n\n${text}`, { parse_mode: 'Markdown' });
        return ctx.reply('✅ Ответ отправлен пользователю!');
      } catch (e) {
        return ctx.reply('❌ Ошибка: пользователь заблокировал бота или ID не найден.');
      }
    }
  }

  // Б) Проверка кодов видео
  if (text === "91") {
    userState.delete(userId);
    return ctx.replyWithVideo(videoDatabase["91_1"], {
      caption: "🍿 Серия 1",
      ...Markup.inlineKeyboard([
        Markup.button.callback("Перейти ко 2 серии", "check_91_2")
      ])
    });
  }

  // Код 82 без подписки
  if (text === "82") {
    userState.delete(userId);
    return ctx.replyWithVideo(videoDatabase["82"], {
      caption: "СНЫ — это НЕ ТО, ЧТО вы ДУМАЕТЕ!"
    });
  }

  // В) Если пользователь в режиме вопроса (после /question)
  if (userState.get(userId) === 'awaiting_question') {
    userState.delete(userId); // Выключаем режим вопроса после получения
    await ctx.telegram.sendMessage(
      ADMIN_ID,
      `📩 **Новый вопрос.**\nОт: ${ctx.from.first_name}\nID: ${userId}\n\nТекст: ${text}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('Ответить', `reply_to_${userId}`)]
      ])
    );
    return ctx.reply('Вопрос принят. Скоро модераторы ответят на него.');
  }

  // Г) Если это не код, не админ и не режим вопроса
  if (userId !== ADMIN_ID) {
    return ctx.reply('❌ Неверный код или формат.');
  }
});

// --- 4. CALLBACK_QUERY (КНОПКИ) ---

bot.on('callback_query', async (ctx) => {
  const action = ctx.callbackQuery.data;

  if (action.startsWith('reply_to_')) {
    if (ctx.from.id === ADMIN_ID) {
      await ctx.reply('Чтобы ответить, используйте функцию "Reply" (Ответить) на сообщение выше.');
    }
    return ctx.answerCbQuery();
  }

  const isSubscribed = await checkSubscription(ctx);

  // Группировка логики серий
  const seriesData = {
    "check_91_2": { id: "91_2", next: "check_91_3", cap: "🍿 Серия 2", btn: "Перейти к 3 серии" },
    "check_91_3": { id: "91_3", next: "check_91_4", cap: "🍿 Серия 3", btn: "Перейти к 4 серии" },
    "check_91_4": { id: "91_4", next: null, cap: "🍿 Серия 4 (Финал)", btn: null }
  };

  const currentSeries = seriesData[action];
  if (currentSeries) {
    if (isSubscribed) {
      const keyboard = currentSeries.next 
        ? Markup.inlineKeyboard([Markup.button.callback(currentSeries.btn, currentSeries.next)])
        : undefined;
      
      await ctx.replyWithVideo(videoDatabase[currentSeries.id], {
        caption: currentSeries.cap,
        ...keyboard
      });
    } else {
      await ctx.reply("Для просмотра нужно подписаться на наш канал:", 
        Markup.inlineKeyboard([
          [Markup.button.url("Подписаться на Moodie MC", CHANNEL_URL)],
          [Markup.button.callback("✅ Я подписался", action)]
        ])
      );
    }
  }

  await ctx.answerCbQuery();
});

module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (err) {
    res.status(200).send('OK'); // Vercel не любит 500 ошибки от ботов
  }
};
