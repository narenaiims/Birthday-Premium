import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Uses the SERVICE ROLE key (server-side only — never expose to browser)
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(url, key);
}

// ─── Send Web Push notification ───────────────────────────────────────────────
async function sendPush(subscription: any, title: string, body: string) {
  // Using the web-push library approach via fetch to our own push endpoint
  // Simple implementation: just POST to the subscription endpoint
  try {
    const payload = JSON.stringify({ title, body, icon: '/icon-192.png' });
    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'TTL': '86400' },
      body: payload,
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Birthday Check Logic ─────────────────────────────────────────────────────
async function checkBirthdays() {
  const supabase = getSupabase();
  let sentCount = 0;

  const today = new Date();
  const offsets = [0, 1, 3];
  const targetSuffixes = offsets.map(offset => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return { offset, suffix: `-${mm}-${dd}` };
  });

  // Get all birthdays
  const { data: birthdays, error: bdayErr } = await supabase.from('birthdays').select('id,name,dob,group_id');
  if (bdayErr || !birthdays?.length) return { success: true, message: 'No birthdays found', sentCount: 0 };

  // Find matching ones
  const matching = birthdays
    .map(b => {
      const match = targetSuffixes.find(t => b.dob?.endsWith(t.suffix));
      return match ? { ...b, offset: match.offset } : null;
    })
    .filter(Boolean) as any[];

  if (!matching.length) return { success: true, message: 'No birthdays today/upcoming', sentCount: 0 };

  // Group by group_id
  const byGroup: Record<string, Record<number, any[]>> = {};
  for (const b of matching) {
    byGroup[b.group_id] ??= {};
    byGroup[b.group_id][b.offset] ??= [];
    byGroup[b.group_id][b.offset].push(b);
  }

  // For each group, find members and send push
  for (const [groupId, reminders] of Object.entries(byGroup)) {
    const { data: groupRow } = await supabase.from('groups').select('name').eq('id', groupId).single();
    const groupName = groupRow?.name ?? 'Your Group';

    const { data: members } = await supabase
      .from('group_members').select('user_id').eq('group_id', groupId);
    if (!members?.length) continue;

    const userIds = members.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles').select('id,push_subscription,remind_on_day,remind_1_day_before,remind_3_days_before')
      .in('id', userIds);
    if (!profiles?.length) continue;

    for (const profile of profiles) {
      if (!profile.push_subscription) continue;
      let sub: any;
      try { sub = JSON.parse(profile.push_subscription); } catch { continue; }

      for (const [offsetStr, bdayList] of Object.entries(reminders as Record<number, any[]>)) {
        const offset = parseInt(offsetStr);
        const names = bdayList.map((b: any) => b.name).join(', ');
        let shouldSend = false, title = '', body = '';

        if (offset === 0 && profile.remind_on_day !== false) {
          shouldSend = true;
          title = `🎂 Birthday Today! — ${groupName}`;
          body = `It's ${names}'s birthday! Don't forget to wish them 🎉`;
        } else if (offset === 1 && profile.remind_1_day_before) {
          shouldSend = true;
          title = `🎁 Birthday Tomorrow — ${groupName}`;
          body = `${names}'s birthday is tomorrow! Get ready 🎈`;
        } else if (offset === 3 && profile.remind_3_days_before) {
          shouldSend = true;
          title = `🗓️ Birthday in 3 Days — ${groupName}`;
          body = `${names}'s birthday is in 3 days! Time to plan ✨`;
        }

        if (shouldSend) {
          const ok = await sendPush(sub, title, body);
          if (ok) sentCount++;
        }
      }
    }
  }

  return { success: true, message: 'Check complete', sentCount };
}

// ─── Vercel Handler ────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Vercel Cron header (GET requests)
  if (req.method === 'GET') {
    const auth = req.headers['authorization'];
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Verify manual POST secret
  if (req.method === 'POST') {
    const secret = req.headers['x-birthday-secret'] ?? req.query.secret;
    if (process.env.BIRTHDAY_CHECK_SECRET && secret !== process.env.BIRTHDAY_CHECK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const result = await checkBirthdays();
    return res.json(result);
  } catch (err: any) {
    console.error('Birthday check failed:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
