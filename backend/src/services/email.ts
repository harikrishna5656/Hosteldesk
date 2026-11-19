import nodemailer from 'nodemailer';

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASS;

  if (!user || !pass) {
    console.warn('[Email] GMAIL_USER or GMAIL_APP_PASS is not configured. Email will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
}

export async function sendRentReminder(
  tenantEmail: string,
  tenantName: string,
  amount: number,
  dueDate: string,
  roomNumber: string,
  hostelName: string,
  cycleLabel?: string
): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[Email Mock] Rent reminder would be sent to ${tenantEmail} for ₹${amount}`);
    return;
  }

  await transporter.sendMail({
    from: `"${hostelName}" <${process.env.GMAIL_USER}>`,
    to: tenantEmail,
    subject: `Monthly Rent Due Reminder (${cycleLabel || 'Current Cycle'}) — ${hostelName}`,
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#0B0B0B;padding:26px 24px;">
          <h1 style="color:#ffffff;margin:0;font-size:20px;display:flex;align-items:center;gap:6px;">
            <span style="color:#EEFF2E;">★</span> ${hostelName}
          </h1>
          <p style="color:#9CA3AF;margin:4px 0 0;font-size:13px;">Monthly Rent Notice & Reminder</p>
        </div>
        <div style="padding:24px;">
          <p style="color:#111827;font-size:15px;margin-top:0;">Dear <strong>${tenantName}</strong>,</p>
          <p style="color:#4B5563;font-size:13px;line-height:1.5;">
            This is a friendly notification that your monthly accommodation fee for your room is due.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
            ${cycleLabel ? `<tr><td style="padding:10px 14px;background:#f9fafb;color:#6B7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Billing Cycle</td>
                <td style="padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;"><strong style="color:#111827;">${cycleLabel}</strong></td></tr>` : ''}
            <tr><td style="padding:10px 14px;background:#fff;color:#6B7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Room No</td>
                <td style="padding:10px 14px;background:#fff;border-bottom:1px solid #e5e7eb;"><strong style="color:#111827;">${roomNumber}</strong></td></tr>
            <tr><td style="padding:10px 14px;background:#f9fafb;color:#6B7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Amount Due</td>
                <td style="padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;"><strong style="color:#0B0B0B;font-size:16px;">₹${amount.toLocaleString('en-IN')}</strong></td></tr>
            <tr><td style="padding:10px 14px;background:#fff;color:#6B7280;font-size:13px;">Due Date</td>
                <td style="padding:10px 14px;background:#fff;"><strong style="color:#DC2626;">${dueDate}</strong></td></tr>
          </table>
          <p style="color:#4B5563;font-size:13px;line-height:1.5;">
            Please clear your dues via UPI, Bank Transfer or at the office counter to continue your room reservation.
          </p>
          <p style="color:#9CA3AF;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:14px;">
            — ${hostelName} Management • Automated Notification
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendPaymentConfirmation(
  tenantEmail: string,
  tenantName: string,
  amount: number,
  method: string,
  date: string,
  roomNumber: string,
  hostelName: string
): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[Email Mock] Payment confirmation would be sent to ${tenantEmail} for ₹${amount}`);
    return;
  }

  await transporter.sendMail({
    from: `"${hostelName}" <${process.env.GMAIL_USER}>`,
    to: tenantEmail,
    subject: `Payment Received ✅ — ${hostelName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:28px 24px;">
          <h1 style="color:#fff;margin:0;font-size:22px;">✅ Payment Confirmed</h1>
          <p style="color:#dcfce7;margin:4px 0 0;font-size:14px;">${hostelName}</p>
        </div>
        <div style="padding:24px;">
          <p style="color:#1e293b;font-size:16px;">Dear <strong>${tenantName}</strong>,</p>
          <p style="color:#475569;">We have received your rent payment. Thank you!</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr><td style="padding:12px 16px;background:#f8fafc;color:#64748b;font-size:14px;">Room No</td>
                <td style="padding:12px 16px;background:#f8fafc;"><strong>${roomNumber}</strong></td></tr>
            <tr><td style="padding:12px 16px;color:#64748b;font-size:14px;">Amount Paid</td>
                <td style="padding:12px 16px;"><strong style="color:#22c55e;font-size:18px;">₹${amount.toLocaleString('en-IN')}</strong></td></tr>
            <tr><td style="padding:12px 16px;background:#f8fafc;color:#64748b;font-size:14px;">Payment Method</td>
                <td style="padding:12px 16px;background:#f8fafc;">${method}</td></tr>
            <tr><td style="padding:12px 16px;color:#64748b;font-size:14px;">Date</td>
                <td style="padding:12px 16px;">${date}</td></tr>
          </table>
          <p style="color:#94a3b8;font-size:13px;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;">— ${hostelName} Management</p>
        </div>
      </div>
    `,
  });
}
