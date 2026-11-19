import { Router, Request, Response } from 'express';
import { sendRentReminder, sendPaymentConfirmation } from '../services/email.js';
import nodemailer from 'nodemailer';

const router = Router();

// Test Nodemailer connection & send test email
router.post('/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASS;

    if (!user || !pass || pass.includes('xxxx')) {
      res.status(400).json({
        success: false,
        error: 'GMAIL_USER or GMAIL_APP_PASS is not properly configured in backend/.env',
      });
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    // Verify SMTP connection
    await transporter.verify();

    const targetEmail = req.body.to || user;

    await transporter.sendMail({
      from: `"HostelDesk" <${user}>`,
      to: targetEmail,
      subject: 'HostelDesk — Gmail / Nodemailer Connected Successfully 🎉',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:520px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:#0B0B0B;padding:28px 24px;">
            <h1 style="color:#FFFFFF;margin:0;font-size:22px;display:flex;align-items:center;gap:8px;">
              <span style="color:#EEFF2E;">★</span> HostelDesk
            </h1>
            <p style="color:#9CA3AF;margin:6px 0 0;font-size:13px;">Email Service Verification</p>
          </div>
          <div style="padding:24px;">
            <p style="color:#111827;font-size:15px;font-weight:600;margin-top:0;">Your Nodemailer Setup is Active!</p>
            <p style="color:#4B5563;font-size:14px;line-height:1.6;">
              Gmail App Password authentication succeeded. HostelDesk is now ready to send automated monthly rent reminders, payment confirmations, and checkout receipts.
            </p>
            <div style="background:#F5F5F0;border:1px solid #E5E7EB;border-radius:8px;padding:12px 16px;margin:20px 0;font-size:13px;color:#374151;">
              <strong>Sender Account:</strong> ${user}<br/>
              <strong>Delivered To:</strong> ${targetEmail}
            </div>
            <p style="color:#9CA3AF;font-size:12px;margin:24px 0 0;border-top:1px solid #E5E7EB;padding-top:12px;">
              HostelDesk Property Management System • Automated Notification
            </p>
          </div>
        </div>
      `,
    });

    res.json({
      success: true,
      message: `Test email sent successfully to ${targetEmail}`,
    });
  } catch (error: any) {
    console.error('Error testing Nodemailer connection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to authenticate with Gmail',
    });
  }
});

// Send rent reminder email
router.post('/rent-reminder', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantEmail, tenantName, amount, dueDate, roomNumber, hostelName, cycleLabel } = req.body;

    if (!tenantEmail || !tenantName || !amount || !dueDate || !roomNumber || !hostelName) {
      res.status(400).json({ error: 'Missing required fields for rent reminder' });
      return;
    }

    await sendRentReminder(
      tenantEmail,
      tenantName,
      Number(amount),
      dueDate,
      roomNumber,
      hostelName,
      cycleLabel
    );

    res.json({ success: true, message: 'Rent reminder email sent successfully' });
  } catch (error) {
    console.error('Error sending rent reminder:', error);
    res.status(500).json({ error: 'Failed to send rent reminder email' });
  }
});

// Send payment confirmation email
router.post('/payment-confirmation', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantEmail, tenantName, amount, method, date, roomNumber, hostelName } = req.body;

    if (!tenantEmail || !tenantName || !amount || !method || !date || !roomNumber || !hostelName) {
      res.status(400).json({ error: 'Missing required fields for payment confirmation' });
      return;
    }

    await sendPaymentConfirmation(
      tenantEmail,
      tenantName,
      Number(amount),
      method,
      date,
      roomNumber,
      hostelName
    );

    res.json({ success: true, message: 'Payment confirmation email sent successfully' });
  } catch (error) {
    console.error('Error sending payment confirmation:', error);
    res.status(500).json({ error: 'Failed to send payment confirmation email' });
  }
});

export default router;
