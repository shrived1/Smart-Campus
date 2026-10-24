import { Router } from 'express';
import QRCode from 'qrcode';

const router = Router();

// Generate safe workflow QR codes
router.get('/generate', async (req, res) => {
  try {
    const type = req.query.type as string; // 'ADMISSION' | 'LOGIN' | 'EVENT' | 'DOCUMENT' | 'DEVICE'
    const ref = req.query.ref as string;

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    let payloadUrl = baseUrl;

    switch (type) {
      case 'ADMISSION':
        payloadUrl = `${baseUrl}/admission${ref ? `?track=${encodeURIComponent(ref)}` : ''}`;
        break;
      case 'LOGIN':
        payloadUrl = `${baseUrl}/login`;
        break;
      case 'EVENT':
        payloadUrl = `${baseUrl}/events${ref ? `?id=${encodeURIComponent(ref)}` : ''}`;
        break;
      case 'DOCUMENT':
        payloadUrl = `${baseUrl}/verify-document?hash=${encodeURIComponent(ref || 'SC-VERIFY-SECURE')}`;
        break;
      case 'DEVICE':
        payloadUrl = `${baseUrl}/api/attendance/heartbeat?nodeId=${encodeURIComponent(ref || 'ESP32-NEW')}`;
        break;
      default:
        payloadUrl = baseUrl;
    }

    const qrDataUrl = await QRCode.toDataURL(payloadUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      color: {
        dark: '#00E5FF', // Electric Cyan
        light: '#050505' // Z Black
      },
      width: 320
    });

    res.json({
      success: true,
      type,
      targetUrl: payloadUrl,
      qrDataUrl
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to generate QR code: ' + error.message });
  }
});

export default router;
