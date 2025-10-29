import express from "express";
import cors from "cors";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ✅ 静的ファイル配信（絶対パスで指定）
app.use(express.static(path.join(__dirname, "public")));

// ==============================
// ✅ PostgreSQL 接続設定
// ==============================
const pool = new Pool({
  user: "postgres",
  host: "db",
  database: "truckdb",
  password: "password",
  port: 5432,
});

// ==============================
// 🚚 ドライバー一覧
// ==============================
app.get("/api/drivers", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT name FROM driver_list WHERE active = TRUE ORDER BY id ASC"
    );
    res.json(result.rows.map(r => r.name));
  } catch (err) {
    console.error("❌ /api/drivers error:", err);
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
});

// ==============================
// 📅 スケジュール取得
// ==============================
app.get("/api/schedule", async (req, res) => {
  const { driver } = req.query;
  try {
    const result = await pool.query(
      "SELECT * FROM schedule WHERE driver=$1 ORDER BY date ASC",
      [driver]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ /api/schedule error:", err);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

// ==============================
// 📝 スケジュール作成・更新
// ==============================
app.post("/api/schedule", async (req, res) => {
  const { driver, date, destination, cargo, truck_number, company_message } = req.body;

  try {
    const exists = await pool.query(
      "SELECT id FROM schedule WHERE driver=$1 AND date=$2",
      [driver, date]
    );

    if (exists.rows.length > 0) {
      await pool.query(
        `UPDATE schedule SET destination=$1, cargo=$2, truck_number=$3, company_message=$4
         WHERE driver=$5 AND date=$6`,
        [destination, cargo, truck_number, company_message, driver, date]
      );
      res.json({ message: "Schedule updated" });
    } else {
      await pool.query(
        `INSERT INTO schedule (driver, date, destination, cargo, truck_number, company_message)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [driver, date, destination, cargo, truck_number, company_message]
      );
      res.json({ message: "Schedule created" });
    }
  } catch (err) {
    console.error("❌ /api/schedule POST error:", err);
    res.status(500).json({ error: "Failed to save schedule" });
  }
});

// ==============================
// 💬 メッセージ取得・作成
// ==============================
app.get("/api/messages", async (req, res) => {
  const { driver } = req.query;
  try {
    const result = await pool.query(
      "SELECT * FROM messages WHERE driver=$1 ORDER BY timestamp ASC",
      [driver]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ /api/messages GET error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/messages", async (req, res) => {
  const { driver, role, subject, message, date } = req.body;
  try {
    await pool.query(
      `INSERT INTO messages (driver, role, subject, message, date, timestamp, read_flag)
       VALUES ($1,$2,$3,$4,$5, NOW(), FALSE)`,
      [driver, role, subject, message, date]
    );
    res.json({ message: "Message sent" });
  } catch (err) {
    console.error("❌ /api/messages POST error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ==============================
// ✅ 静的HTML ルート設定（重要!!）
// ==============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ==============================
// 🧹 古いメッセージ削除
// ==============================
async function cleanOldMessages() {
  await pool.query("DELETE FROM messages WHERE timestamp < NOW() - INTERVAL '3 days'");
  console.log("🧹 3日より前のメッセージを削除しました");
}
setInterval(cleanOldMessages, 24 * 60 * 60 * 1000);

// ==============================
// 🚀 サーバー起動 (Fly.io対応)
// ==============================
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server Running → http://0.0.0.0:${PORT}`);
});
