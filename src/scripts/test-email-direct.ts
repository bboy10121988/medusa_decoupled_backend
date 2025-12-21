
import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from the root of the project
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const targetEmail = 'bboy10121988@gmail.com';

async function main() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error('❌ CRITICAL: No RESEND_API_KEY found in environment variables.');
        return;
    }

    console.log(`🔑 API Key found (${apiKey.substring(0, 4)}...)`);

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    console.log(`📨 Attempting to send from: ${fromEmail} to: ${targetEmail}`);

    const resend = new Resend(apiKey);

    try {
        const response = await resend.emails.send({
            from: fromEmail,
            to: targetEmail,
            subject: '🔍 系統測試信 (Medusa Debugger)',
            html: `
        <h1>Email Delivery Test</h1>
        <p>這是一封測試信，確認您的 Email 系統運作正常。</p>
        <p>發送時間: ${new Date().toLocaleString()}</p>
        <hr/>
        <p>Sent via Resend API</p>
      `
        });

        if (response.error) {
            console.error('❌ Resend API returned error:', response.error);
        } else {
            console.log('✅ Resend API reported success:', response.data);
        }

    } catch (error) {
        console.error('❌ Exception occurred:', error);
    }
}

main();
