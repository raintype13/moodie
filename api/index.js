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
    // Статусы, которые означают, что человек подписан
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (e) {
    console.error("Ошибка проверки подписки:", e);
    return false;
  }
}

bot.on('video', async (ctx) => {
  if (ctx.from.id === ADMIN_ID) {
    return ctx.reply(`✅ Код для базы:\n\n"${ctx.message.video.file_id}"`);
  }
});

bot.start((ctx) => {
  ctx.reply('Введите код для просмотра фильма');
});

bot.on('text', async (ctx) => {
  const userCode = ctx.message.text.trim();

  if (userCode === "91") {
    // 1-я серия всегда доступна сразу
    await ctx.replyWithVideo(videoDatabase["91_1"], {
      caption: "🍿 Серия 1",
      ...Markup.inlineKeyboard([
        Markup.button.callback("Перейти ко 2 серии", "check_91_2")
      ])
    });
  } else {
    ctx.reply('❌ Неверный код или формат.');
  }
});

// Обработка кнопок
bot.on('callback_query', async (ctx) => {
  const action = ctx.callbackQuery.data;
  const isSubscribed = await checkSubscription(ctx);

  // Логика для 2-й серии
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

  // Логика для 3-й серии
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

  // Логика для 4-й серии
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