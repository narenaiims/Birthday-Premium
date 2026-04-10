import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Supabase Setup ───────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ─── Send Web Push notification ───────────────────────────────────────────────
async function sendPush(subscription: any, title: string, body: string) {
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
  console.log("Running birthday check...");
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("Supabase credentials missing, skipping birthday check.");
    return { success: false, message: "Supabase credentials missing", sentCount: 0 };
  }

  let sentCount = 0;
  try {
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
    console.log(`Birthday check complete. Total notifications sent: ${sentCount}`);
    return { success: true, message: "Check complete", sentCount };
  } catch (error) {
    console.error("Error in birthday check:", error);
    return { success: false, message: "Error occurred", sentCount };
  }
}

// ─── Scheduled Job (Daily at 2:30 AM) ──────────────────────────────────────────
cron.schedule("30 2 * * *", async () => {
  console.log("Running daily birthday check at 2:30 AM...");
  await checkBirthdays();
});

// ─── Express Server ───────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Manual trigger for testing (protected by secret)
  app.all("/api/trigger-birthday-check", async (req, res) => {
    const secret = req.headers["x-birthday-secret"] || req.query.secret;
    const isVercelCron = req.headers["x-vercel-cron"] === "1";

    if (!isVercelCron && process.env.BIRTHDAY_CHECK_SECRET && secret !== process.env.BIRTHDAY_CHECK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    console.log("Triggering birthday check via API...");
    const result = await checkBirthdays();
    res.json(result);
  });

  app.post("/api/admin/trigger-birthday-check", async (req, res) => {
    const secret = req.headers["x-birthday-secret"] || req.query.secret;
    if (process.env.BIRTHDAY_CHECK_SECRET && secret !== process.env.BIRTHDAY_CHECK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    console.log("Triggering birthday check...");
    const result = await checkBirthdays();
    res.json(result);
  });

  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    const possiblePaths = [
      path.join(process.cwd(), "dist"),
      path.join(__dirname, "dist"),
      path.join(__dirname, "..", "dist")
    ];
    
    let distPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
    
    console.log("Using dist path:", distPath);

    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send("Frontend build not found. Please run 'npm run build'.");
        }
      });
    } else {
      app.get("*", (req, res) => {
        res.status(404).send("Dist directory not found. Please run 'npm run build'.");
      });
    }
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

export const appPromise = startServer();
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
