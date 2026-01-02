const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMIN_ID = 1949612933;
const CHANNEL_ID = '@moodie_mc'; // Юзернейм вашего канала
const CHANNEL_URL = 'https://t.me/moodie_mc';

const videoDatabase = {
  "91_1": "BAACAgIAAxkBAAMPaVfqSQfXGqzbcOu65RLso0I6FPQAAn2LAALoFcFKOz5ZXfx4j3A4BA", 
  "91_2": "BAACAgIAAxkBAAMSaVfv4zY002eSZQI-vtdgJZpWlP4AAtCLAALoFcFKffgaa2M3A_84BA",
  "91_3": "BAACAgIAAxkBAAMUaVfxPmwEIIys0pyjpsTSu_evD6oAAueLAALoFcFK9EcKn_n3HkQ4BA",
  "91_4": "BAACAgIAAxkBAAMWaVfyrQgmWcWZeLiyJgzW_5bYDZYAAv-LAALoFcFKFW6UwKj23kU4BA"
};

// Проверка подписки
async function checkSubscription(ctx) {
  try {
    const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (e) {
    console.error("Ошибка проверки подписки:", e);
    return false;
  }
}

// --- КОМАНДЫ ---

bot.start((ctx) => {
  ctx.reply('Введите код для просмотра видео');
});

bot.command('movie', (ctx) => {
  ctx.reply(
    'Не знаешь что посмотреть? Можешь выбрать видео для просмотра через наш YouTube.',
    Markup.inlineKeyboard([
      Markup.button.url('Moodie MC', 'https://www.youtube.com/@moodie_mc')
    ])
  );
});

bot.command('question', (ctx) => {
  ctx.reply('Какой вопрос хочешь задать?');
});

bot.on('video', async (ctx) => {
  if (ctx.from.id === ADMIN_ID) {
    return ctx.reply(`✅ Код для базы:\n\n"${ctx.message.video.file_id}"`);
  }
});

// --- ЕДИНЫЙ ОБРАБОТЧИК ТЕКСТА ---

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  const userId = ctx.from.id;

  // 1. Если пишет админ и это ответ (REPLY) на вопрос пользователя
  if (userId === ADMIN_ID && ctx.message.reply_to_message) {
    const replyMessage = ctx.message.reply_to_message;
    const originalText = replyMessage.text || replyMessage.caption || "";
    const match = originalText.match(/ID: `(\d+)`/);

    if (match) {
      const targetUserId = match[1];
      try {
        await ctx.telegram.sendMessage(targetUserId, `✉️ **Ответ от админа:**\n\n${text}`, { parse_mode: 'Markdown' });
        return ctx.reply('✅ Ответ отправлен пользователю!');
      } catch (e) {
        return ctx.reply('❌ Не удалось отправить ответ. Возможно, пользователь заблокировал бота.');
      }
    }
  }

  // 2. Проверка кодов видео
  if (text === "91") {
    return ctx.replyWithVideo(videoDatabase["91_1"], {
      caption: "🍿 Серия 1",
      ...Markup.inlineKeyboard([
        Markup.button.callback("Перейти ко 2 серии", "check_91_2")
      ])
    });
  }

  // 3. Если это не код, не команда и пишет НЕ админ — значит это вопрос
  if (userId !== ADMIN_ID && !text.startsWith('/')) {
    await ctx.telegram.sendMessage(
      ADMIN_ID,
      `📩 **Новый вопрос.**\nОт: [${ctx.from.first_name}](tg://user?id=${userId})\nID: \`${userId}\`\n\nТекст: ${text}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('Ответить', `reply_to_${userId}`)]
        ])
      }
    );
    return ctx.reply('Вопрос принят. Скоро модераторы ответят на него.');
  }
  
  // Если админ просто пишет текст (не как ответ)
  if (userId === ADMIN_ID && !text.startsWith('/')) {
    ctx.reply('Чтобы ответить пользователю, используйте функцию "Reply" (Ответить) на сообщение с его вопросом.');
  }
});

// --- ОБРАБОТКА КНОПОК (CALLBACK) ---

bot.on('callback_query', async (ctx) => {
  const action = ctx.callbackQuery.data;

  // Кнопка помощи для админа
  if (action.startsWith('reply_to_')) {
    if (ctx.from.id === ADMIN_ID) {
      await ctx.reply('Просто напишите ответное сообщение, используя функцию "Reply" (Ответить) на сообщение с вопросом.');
    }
    return ctx.answerCbQuery();
  }

  const isSubscribed = await checkSubscription(ctx);

  // Логика переходов по сериям
  if (action === "check_91_2") {
    if (isSubscribed) {
      await ctx.replyWithVideo(videoDatabase["91_2"], {
        caption: "🍿 Серия 2",
        ...Markup.inlineKeyboard([
          Markup.button.callback("Перейти к 3 серии", "check_91_3")
        ])
      });
    } else {
      await ctx.reply("Для просмотра 2-й и следующих серий нужно подписаться на наш канал:", 
        Markup.inlineKeyboard([
          [Markup.button.url("🚀 Подписаться на Moodie MC", CHANNEL_URL)],
          [Markup.button.callback("✅ Я подписался, смотреть 2 серию", "check_91_2")]
        ])
      );
    }
  }

  if (action === "check_91_3") {
    if (isSubscribed) {
      await ctx.replyWithVideo(videoDatabase["91_3"], {
        caption: "🍿 Серия 3",
        ...Markup.inlineKeyboard([
          Markup.button.callback("Перейти к 4 серии", "check_91_4")
        ])
      });
    } else {
      await ctx.reply("Не удалось проверить подписку. Подпишись, чтобы смотреть дальше.", 
        Markup.inlineKeyboard([
          [Markup.button.url("Подписаться", CHANNEL_URL)],
          [Markup.button.callback("🔄Проверить и смотреть", "check_91_3")]
        ])
      );
    }
  }

  if (action === "check_91_4") {
    if (isSubscribed) {
      await ctx.replyWithVideo(videoDatabase["91_4"], {
        caption: "🍿 Серия 4 (Финал)"
      });
    } else {
      await ctx.reply("Подписка обязательна для финала!", 
        Markup.inlineKeyboard([
          [Markup.button.url("Подписаться", CHANNEL_URL)],
          [Markup.button.callback("🔄 Проверить и смотреть", "check_91_4")]
        ])
      );
    }
  }

  await ctx.answerCbQuery();
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      res.status(500).send('Error');
    }
  } else {
    res.status(200).send('Bot is running');
  }
};