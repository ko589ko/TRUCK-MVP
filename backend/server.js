import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("./public"));

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
// 📅 スケジュール取得（ドライバー別）
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
// 📝 スケジュール作成 / 更新
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
// 💬 メッセージ一覧取得（チャット）
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

// ==============================
// ✉️ メッセージ送信（会社 ⇄ ドライバー）
// ==============================
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
// ✅ 既読処理
// ==============================
app.post("/api/messages/read", async (req, res) => {
  const { driver } = req.body;
  try {
    await pool.query(
      "UPDATE messages SET read_flag = TRUE WHERE driver=$1 AND role='driver'",
      [driver]
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("❌ /api/messages/read error:", err);
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

// ==============================
// 📜 履歴（ドライバー別）
// ==============================
app.get("/api/history", async (req, res) => {
  const { driver } = req.query;
  try {
    const result = await pool.query(
      `SELECT date, destination, cargo, truck_number, company_message
       FROM schedule WHERE driver=$1 ORDER BY date DESC`,
      [driver]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ /api/history error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ==============================
// ❌ ドライバー削除（非アクティブ化）
// ==============================
app.post("/api/drivers/delete", async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query("UPDATE driver_list SET active = FALSE WHERE name=$1", [name]);
    await pool.query("DELETE FROM schedule WHERE driver=$1", [name]);
    await pool.query("DELETE FROM messages WHERE driver=$1", [name]);
    res.json({ message: `${name} を削除しました` });
  } catch (err) {
    console.error("❌ /api/drivers/delete error:", err);
    res.status(500).json({ error: "Failed to delete driver" });
  }
});

// ==============================
// ➕ 新規ドライバー登録
// ==============================
app.post("/api/drivers/add", async (req, res) => {
  const { name, phone, address } = req.body;
  try {
    await pool.query(
      "INSERT INTO driver_list (name, phone, address, active) VALUES ($1,$2,$3, TRUE)",
      [name, phone, address]
    );
    res.json({ message: "登録しました" });
  } catch (err) {
    console.error("❌ /api/drivers/add error:", err);
    res.status(500).json({ error: "Failed to register driver" });
  }
});
// ==============================
// 🧹 古いメッセージ自動削除（3日）
// ==============================
async function cleanOldMessages() {
  await pool.query("DELETE FROM messages WHERE timestamp < NOW() - INTERVAL '3 days'");
  console.log("🧹 3日より前のメッセージを削除しました");
}

// 24時間ごとに自動実行
setInterval(cleanOldMessages, 24 * 60 * 60 * 1000);


// ==============================
// 🚀 サーバー起動
// ==============================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server Running → http://localhost:${PORT}`);
});
