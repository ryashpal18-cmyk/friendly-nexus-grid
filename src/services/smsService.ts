export async function sendSMS(mobile: string, message: string): Promise<boolean> {
  const digits = mobile.replace(/\D/g, "");
  const num = digits.startsWith("91") ? digits : `91${digits}`;
  try {
    const res = await fetch(import.meta.env.VITE_TEXTBEE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": import.meta.env.VITE_TEXTBEE_API_KEY,
      },
      body: JSON.stringify({
        deviceId: import.meta.env.VITE_TEXTBEE_DEVICE_ID,
        recipients: [num],
        message,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
