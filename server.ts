import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Firebase Admin Setup ─────────────────────────────────────────────────────
let db: admin.firestore.Firestore | null = null;
let messaging: admin.messaging.Messaging | null = null;

async function initFirebaseAdmin() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      
      // Use service account if provided in env, else try default
      const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (saEnv) {
        let serviceAccount;
        try {
          if (saEnv.trim().startsWith("{")) {
            serviceAccount = JSON.parse(saEnv);
          } else if (fs.existsSync(saEnv)) {
            serviceAccount = JSON.parse(fs.readFileSync(saEnv, "utf-8"));
          }
        } catch (e) {
          console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", e);
        }

        if (serviceAccount) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
        } else {
          console.warn("FIREBASE_SERVICE_ACCOUNT provided but could not be parsed as JSON or found as a file.");
          admin.initializeApp({ projectId: config.projectId });
        }
      } else {
        // Fallback for local/dev if no service account
        admin.initializeApp({
          projectId: config.projectId
        });
      }
      
      db = admin.firestore(config.firestoreDatabaseId);
      messaging = admin.messaging();
      console.log("Firebase Admin initialized successfully.");
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
  }
}

// ─── Birthday Check Logic ─────────────────────────────────────────────────────
async function checkBirthdays() {
  console.log("Running birthday check...");
  if (!db || !messaging) {
    console.warn("Firebase Admin not initialized, skipping birthday check.");
    return { success: false, message: "Firebase Admin not initialized", sentCount: 0 };
  }

  let sentCount = 0;
  try {
    const today = new Date();
    
    // Target offsets: 0 (today), 1 (tomorrow), 3 (in 3 days)
    const offsets = [0, 1, 3];
    const targetDates = offsets.map(offset => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      const monthStr = (d.getMonth() + 1).toString().padStart(2, "0");
      const dayStr = d.getDate().toString().padStart(2, "0");
      return { offset, suffix: `-${monthStr}-${dayStr}` };
    });

    // 1. Find all birthdays occurring on target dates
    const birthdaysSnap = await db.collectionGroup("birthdays").get();
    const matchingBirthdays = birthdaysSnap.docs.map(doc => {
      const dob = doc.data().dob;
      const match = targetDates.find(td => dob && dob.endsWith(td.suffix));
      return match ? { data: doc.data(), offset: match.offset, groupId: doc.ref.parent.parent?.id } : null;
    }).filter(Boolean) as any[];

    if (matchingBirthdays.length === 0) {
      console.log("No matching birthdays found for today or upcoming reminders.");
      return { success: true, message: "No birthdays found", sentCount: 0 };
    }

    // 2. Group matching birthdays by groupId and offset
    const groupReminders: Record<string, Record<number, any[]>> = {};
    matchingBirthdays.forEach(b => {
      if (!b.groupId) return;
      if (!groupReminders[b.groupId]) groupReminders[b.groupId] = {};
      if (!groupReminders[b.groupId][b.offset]) groupReminders[b.groupId][b.offset] = [];
      groupReminders[b.groupId][b.offset].push(b.data);
    });

    // 3. For each group with reminders, find members and send notifications
    for (const groupId in groupReminders) {
      const groupDoc = await db.collection("groups").doc(groupId).get();
      const groupName = groupDoc.data()?.name || "Shared Group";
      const reminders = groupReminders[groupId];

      // Find all members for this group
      const membersSnap = await db.collection("groups").doc(groupId).collection("members").get();
      
      for (const memberDoc of membersSnap.docs) {
        const memberUid = memberDoc.id;
        const userDoc = await db.collection("users").doc(memberUid).get();
        const userData = userDoc.data();
        const fcmToken = userData?.fcmToken;

        if (!fcmToken) continue;

        // Check preferences for each offset
        for (const offsetStr in reminders) {
          const offset = parseInt(offsetStr);
          const birthdays = reminders[offset];
          
          let shouldRemind = false;
          let title = "";
          let body = "";
          const names = birthdays.map(b => b.name).join(", ");

          if (offset === 0 && (userData?.remindOnDay !== false)) { // Default to true
            shouldRemind = true;
            title = `🎂 Birthday Today: ${groupName}`;
            body = `Today is the birthday of: ${names}! Don't forget to wish them! 🎉`;
          } else if (offset === 1 && userData?.remind1DayBefore) {
            shouldRemind = true;
            title = `🎁 Birthday Tomorrow: ${groupName}`;
            body = `Tomorrow is the birthday of: ${names}! Get ready to celebrate! 🎈`;
          } else if (offset === 3 && userData?.remind3DaysBefore) {
            shouldRemind = true;
            title = `🗓️ Birthday in 3 Days: ${groupName}`;
            body = `${names} will have a birthday in 3 days! Time to plan something special! ✨`;
          }

          if (shouldRemind) {
            const message = {
              notification: { title, body },
              token: fcmToken
            };

            try {
              await messaging.send(message);
              sentCount++;
              console.log(`Sent ${offset}-day reminder to ${memberUid} for ${groupName}`);
            } catch (err) {
              console.error(`Failed to send notification to ${memberUid}:`, err);
            }
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

// ─── Scheduled Job (Daily at 8 AM) ─────────────────────────────────────────────
cron.schedule("0 8 * * *", async () => {
  console.log("Running daily birthday check at 8 AM...");
  await checkBirthdays();
});

// ─── Express Server ───────────────────────────────────────────────────────────
async function startServer() {
  await initFirebaseAdmin();
  
  const app = express();
  const PORT = 3000;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Manual trigger for testing (protected by secret)
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
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
