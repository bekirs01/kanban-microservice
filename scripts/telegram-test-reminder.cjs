const { config } = require('dotenv');
const { resolve } = require('path');

config({ path: resolve(process.cwd(), '.env') });

const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
const personalChatId = process.env.TELEGRAM_PERSONAL_CHAT_ID?.trim() || '';

const status = {
  TELEGRAM_BOT_TOKEN: Boolean(botToken),
  TELEGRAM_PERSONAL_CHAT_ID: Boolean(personalChatId),
};

console.log('Telegram test reminder configuration:');
console.log(`  TELEGRAM_BOT_TOKEN: ${status.TELEGRAM_BOT_TOKEN ? 'configured' : 'missing'}`);
console.log(
  `  TELEGRAM_PERSONAL_CHAT_ID: ${status.TELEGRAM_PERSONAL_CHAT_ID ? 'configured' : 'missing'}`,
);

if (!status.TELEGRAM_BOT_TOKEN || !status.TELEGRAM_PERSONAL_CHAT_ID) {
  console.log('Cannot send test message until both variables are set in backend env.');
  process.exit(1);
}

if (!/^\d+$/.test(personalChatId) || BigInt(personalChatId) <= 0n) {
  console.log('TELEGRAM_PERSONAL_CHAT_ID must be a positive personal chat id (not a group/channel id).');
  process.exit(1);
}

async function main() {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: personalChatId,
      text: [
        '✅ <b>Тест напоминания Kanban</b>',
        '',
        'Это тестовое личное сообщение бота.',
        'Если вы видите это сообщение, TELEGRAM_BOT_TOKEN и TELEGRAM_PERSONAL_CHAT_ID настроены правильно.',
      ].join('\n'),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  const body = await response.json();
  if (!response.ok || !body.ok) {
    console.log('Test message failed. Check bot token, chat id, and that you started the bot in Telegram.');
    process.exit(1);
  }

  console.log('Test message sent successfully to your personal Telegram chat.');
}

main().catch((error) => {
  console.log(`Test message failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exit(1);
});
