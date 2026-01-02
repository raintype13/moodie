const { Markup } = require('telegraf');

module.exports = (bot, ADMIN_ID) => {
  
  // --- КОМАНДА /movie ---
  bot.command('movie', (ctx) => {
    ctx.reply(
      'Не знаешь что посмотреть? Можешь выбрать фильм или сериал для просмотра через наш YouTube.',
      Markup.inlineKeyboard([
        Markup.button.url('Moodie MC', 'https://www.youtube.com/@moodie_mc')
      ])
    );
  });

  // --- КОМАНДА /question (Для пользователя) ---
  bot.command('question', (ctx) => {
    ctx.reply('Какой вопрос хочешь задать?');
    // Помечаем, что следующее сообщение от этого пользователя — это вопрос
    // В простом варианте без БД мы будем ловить текст ниже
  });

  // Обработка самого вопроса и ответа админа
  bot.on('text', async (ctx, next) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    // 1. Если это пишет НЕ админ — значит это потенциальный вопрос
    if (userId !== ADMIN_ID) {
      // Проверяем, не является ли это командой
      if (text.startsWith('/')) return next();

      // Пересылаем вопрос админу
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

    // 2. Если пишет админ и это ответ на сообщение
    if (userId === ADMIN_ID && ctx.message.reply_to_message) {
      // Пытаемся вытащить ID пользователя из текста сообщения, на которое отвечаем
      const replyText = ctx.message.reply_to_message.text;
      const match = replyText.match(/ID: `(\d+)`/);

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

    return next();
  });

  // Обработка кнопки "Ответить" для админа
  bot.on('callback_query', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('У вас нет прав.');

    const data = ctx.callbackQuery.data;
    if (data.startsWith('reply_to_')) {
      await ctx.reply('Просто напишите ответное сообщение, используя функцию "Reply" (Ответить) на сообщение с вопросом.');
    }
    await ctx.answerCbQuery();
  });
};