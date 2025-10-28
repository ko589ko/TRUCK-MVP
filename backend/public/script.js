
// 共通関数

/*function logout() {
  localStorage.clear();
  location.href = "index.html";
}
function getRole() { return localStorage.getItem("role"); }
function getDriverName() { return localStorage.getItem("driver") || "未設定"; }


// ドライバー画面

async function initDriverHome() {
  const driver = getDriverName();
  document.getElementById("hello").textContent = `こんにちは、${driver}さん`;
  await renderSchedule(driver);
  await renderMessages(driver);
  switchTab("today");
}

function switchTab(tab) {
  document.querySelectorAll(".section").forEach(s => s.style.display = "none");
  document.getElementById(`${tab}Section`).style.display = "block";
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("btn-primary"));
  document.getElementById(`tab${tab.charAt(0).toUpperCase()+tab.slice(1)}`).classList.add("btn-primary");
}

async function renderSchedule(driver) {
  try {
    const res = await fetch(`/api/schedule?driver=${encodeURIComponent(driver)}`);
    const list = await res.json();
    const now = new Date(); const jst = new Date(now.getTime()+9*3600*1000);
    const today = jst.toISOString().slice(0,10);
    const tomorrow = new Date(jst.getTime()+86400000).toISOString().slice(0,10);
    const tData = list.find(d=>d.date===today), nData = list.find(d=>d.date===tomorrow);

    const makeHTML = d => d ? `
      <div>📅 ${d.date}</div>
      <div>📍 行き先：${d.destination}</div>
      <div>📦 荷物：${d.cargo}</div>
      <div>🏢 指示：${d.company_message||"（なし）"}</div>
    ` : "予定なし";

    document.getElementById("todayBox").innerHTML = makeHTML(tData);
    document.getElementById("tomorrowBox").innerHTML = makeHTML(nData);
  } catch (e) {
    console.error(e);
  }
}

async function renderMessages(driver) {
  try {
    const res = await fetch(`/api/messages?driver=${encodeURIComponent(driver)}`);
    const msgs = await res.json();
    const now = new Date(); const jst = new Date(now.getTime()+9*3600*1000);
    const today = jst.toISOString().slice(0,10);
    const tomorrow = new Date(jst.getTime()+86400000).toISOString().slice(0,10);

    const todayMsgs = msgs.filter(m=>m.date===today && m.role==="company").map(m=>`💬 ${m.message}`);
    const tomorrowMsgs = msgs.filter(m=>m.date===tomorrow && m.role==="company").map(m=>`💬 ${m.message}`);

    document.getElementById("todayMsgs").innerHTML = todayMsgs.length ? todayMsgs.join("<br>") : "メッセージなし";
    document.getElementById("tomorrowMsgs").innerHTML = tomorrowMsgs.length ? tomorrowMsgs.join("<br>") : "メッセージなし";
  } catch (e) {
    console.error(e);
  }
}

function goHistory() {
  const driver = getDriverName();
  location.href = `driver_history.html?driver=${encodeURIComponent(driver)}`;
}
function goInquiry(day) {
  const driver = getDriverName();
  const date = (day==="today") ? new Date().toISOString().slice(0,10)
    : new Date(Date.now()+86400000).toISOString().slice(0,10);
  location.href = `driver_inquiry.html?driver=${encodeURIComponent(driver)}&date=${encodeURIComponent(date)}`;
}


// 問い合わせ送信
// ====================
async function sendInquiry() {
  const params = new URLSearchParams(location.search);
  const driver = params.get("driver") || getDriverName();
  const date = params.get("date") || new Date().toISOString().slice(0,10);
  const subject = document.getElementById("subject").value.trim();
  const message = document.getElementById("message").value.trim();
  if (!message) { alert("内容を入力してください。"); return; }

  try {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driver, role:"driver", subject, message, date })
    });
    if (!res.ok) throw new Error("送信エラー");
    alert("問い合わせを送信しました。");
    history.back();
  } catch (e) {
    console.error("sendInquiry", e);
    alert("サーバーエラーが発生しました。");
  }
}

// ====================
// 履歴
// ====================
async function renderHistory() {
  const params = new URLSearchParams(location.search);
  const driver = params.get("driver") || getDriverName();
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = "<tr><td colspan='5'>読み込み中...</td></tr>";
  try {
    const res = await fetch(`/api/history?driver=${encodeURIComponent(driver)}`);
    const list = await res.json();
    tbody.innerHTML = list.length
      ? list.map(d=>`<tr><td>${d.date}</td><td>${d.destination}</td><td>${d.cargo}</td><td>${d.company_message||"-"}</td><td>${d.driver_comment||"-"}</td></tr>`).join("")
      : "<tr><td colspan='5'>履歴がありません。</td></tr>";
  } catch (e) {
    console.error(e);
    tbody.innerHTML = "<tr><td colspan='5'>読み込みエラー</td></tr>";
  }
}
const notificationSound = new Audio("sound_pop.mp3");

function playChatSound() {
  notificationSound.currentTime = 0;
  notificationSound.play();
}
