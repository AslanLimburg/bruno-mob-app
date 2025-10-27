require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  try {
    console.log('📧 Отправка тестового письма...');
    
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',  // ← Тестовый адрес Resend
      to: 'aslanlimburg@mail.ru',
      subject: 'Test Email from brunotoken.com - DKIM Verification',
      html: `
        <h1>Тестовое письмо для верификации DKIM</h1>
        <p>Это тестовое письмо отправлено с домена <strong>brunotoken.com</strong></p>
        <p>Для проверки настроек DNS:</p>
        <ul>
          <li>DKIM: resend._domainkey.brunotoken.com</li>
          <li>SPF: send.brunotoken.com</li>
          <li>DMARC: _dmarc.brunotoken.com</li>
        </ul>
        <p>Отправлено через Resend.com</p>
        <p>Домен: brunotoken.com</p>
        <p>Дата: ${new Date().toLocaleString()}</p>
      `
    });
    
    console.log('✅ Письмо успешно отправлено!');
    console.log('ID письма:', result.id);
    console.log('\n📋 Проверьте почту aslanlimburg@mail.ru (не забудьте папку Спам!)');
    
  } catch (error) {
    console.error('❌ Ошибка при отправке:', error);
  }
}

sendTestEmail();
