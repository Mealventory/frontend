const base = (process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
export async function updatePushDevice(access: string, token: string, platform?: 'ios' | 'android') {
  if (!base) throw new Error('The backend connection is not configured.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${base}/api/v1/notifications/device${platform ? '' : '/remove'}`, {
      method: platform ? 'PUT' : 'POST', signal: controller.signal,
      headers: {Authorization: `Bearer ${access}`, 'Content-Type':'application/json'},
      body: JSON.stringify(platform ? {token, platform} : {token}),
    });
    if (!response.ok) throw new Error('Could not update notification registration. Check your connection and retry.');
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Notification registration timed out. Please retry.');
    throw error;
  } finally { clearTimeout(timer); }
}
