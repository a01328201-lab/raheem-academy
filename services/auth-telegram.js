const crypto = require('crypto');

/**
 * التحقق من بيانات Telegram Login Widget
 * https://core.telegram.org/widgets/login#checking-authorization
 */
function verifyTelegramAuth(data) {
    const { hash, ...rest } = data;
    if (!hash) return { ok: false, error: 'no_hash' };

    // ترتيب المفاتيح أبجدياً
    const dataCheckString = Object.keys(rest)
        .sort()
        .map(k => `${k}=${rest[k]}`)
        .join('\n');

    const secretKey = crypto
        .createHash('sha256')
        .update(process.env.TELEGRAM_BOT_TOKEN)
        .digest();

    const hmac = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    if (hmac !== hash) return { ok: false, error: 'invalid_hash' };

    // التحقق من انتهاء الصلاحية (24 ساعة)
    const authDate = parseInt(rest.auth_date, 10) * 1000;
    if (Date.now() - authDate > 86400000) {
        return { ok: false, error: 'expired' };
    }

    return {
        ok: true,
        user: {
            provider: 'telegram',
            providerId: String(rest.id),
            name: [rest.first_name, rest.last_name].filter(Boolean).join(' '),
            username: rest.username || null,
            picture: rest.photo_url || null
        }
    };
}

module.exports = { verifyTelegramAuth };
