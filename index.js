// index.js
const GAS_URL = "https://script.google.com/macros/s/AKfycbw1R3VVsXwZnlo0whZY4jGufYB4uGr-120knnGsranSOCYxaZCBxAqsMc2-tiKi9uJL/exec";
const TARGET_YEAR = 2026; // 運用に合わせて年を設定
const TARGET_MONTH = 5;

// 休業日の設定（YYYY-MM-DD形式）
const holidays = [
  // `${TARGET_YEAR}-05-03`,
  // `${TARGET_YEAR}-05-04`,
  // `${TARGET_YEAR}-05-05`
];

const startRules = {
  12: ["00", "15", "30", "45"], 13: ["00", "15", "30", "45"], 15: ["00", "15", "30", "45"],
  16: ["00", "15", "30"], 17: ["00", "15", "30", "45"], 18: ["00", "15", "30"],
  19: ["00", "15", "30", "45"], 20: ["00", "15", "30", "45"]
};

const endRules = {
  12: ["15", "30", "45"], 13: ["00", "15", "30", "45"], 14: ["00"],
  15: ["15", "30", "45"], 16: ["00", "15", "30", "45"], 17: ["00", "15", "30", "45"],
  18: ["00", "15", "30", "45"], 19: ["00", "15", "30", "45"], 20: ["00", "15", "30", "45"], 21: ["00"]
};

let nationalHolidays = {}; // ★追加：祝日データを保存する変数

// ★追加：日本の祝日データを取得する関数
async function loadHolidays() {
  try {
    const res = await fetch("https://holidays-jp.github.io/api/v1/date.json");
    nationalHolidays = await res.json();
  } catch (err) {
    console.error("祝日データの取得に失敗しました", err);
  }
}

window.onload = async function () {
  const resultDiv = document.getElementById("result");
  const shiftListDiv = document.getElementById("shift-list");
  const submitBtn = document.getElementById("submit-btn");
  const pageTitle = document.getElementById("page-title");

  let isFetchError = false; // ★追加：エラー発生を判定するフラグ

  try {
    await liff.init({ liffId: "2009827198-MNhumUto" });

    if (!liff.isLoggedIn()) {
      resultDiv.innerHTML = "LINEログインへ移動します…";
      liff.login({ redirectUri: window.location.origin + window.location.pathname });
      return;
    }

    const idToken = liff.getIDToken();
    if (!idToken) {
      liff.login();
      return;
    }

    // 更新中ステータス表示
    resultDiv.textContent = "更新中...";
    resultDiv.classList.add("kousintyu");

    await loadHolidays(); // ★追加：シフトを取得する前に祝日データを読み込む

    const profile = await liff.getProfile();
    const url = `${GAS_URL}?action=fetch&userId=${encodeURIComponent(profile.userId)}&name=${encodeURIComponent(profile.displayName)}&idToken=${encodeURIComponent(idToken)}&t=${Date.now()}`;
    
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) {
      // エラーメッセージの重複を避けるため、シンプルなテキストにする
      throw new Error(data.message || "シフト取得に失敗しました");
    }

    renderMayShifts(data.shifts || {});

    pageTitle.textContent = `${TARGET_MONTH}月シフト提出`;
    pageTitle.style.display = "block";
    submitBtn.style.display = "block";

  } catch (err) {
    console.error(err);
    isFetchError = true; // ★エラーフラグを立てる

    // ★修正：エラーメッセージと登録画面への遷移ボタンを動的に作成
    resultDiv.innerHTML = `
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #ff4d8d; font-weight: bold; margin-bottom: 15px;">
          取得エラー：${err.message}<br>
          先にメニュー「登録」から自分の名前を登録してください。
        </p>
        <p style="font-size: 12px; margin-bottom: 15px;">
          ※登録完了後、再度メニューからこの画面を開き直してください。
        </p>
        <button id="go-register-btn" style="padding: 10px 20px; background-color: #06C755; color: white; border: none; border-radius: 5px; cursor: pointer;">
          登録画面へ進む
        </button>
      </div>
    `;

    // ★修正：ボタンクリック時の処理（別LIFFを開く）
    document.getElementById("go-register-btn").addEventListener("click", () => {
      liff.openWindow({
        url: "https://liff.line.me/2009827198-qvnHhjxl", // ←実際のURLに変更してください
        external: false // LINE内ブラウザで開く
      });
    });

  } finally {
    resultDiv.classList.remove("kousintyu");
    // ★修正：エラーが発生していない時だけ、初期化の「更新中...」を消す
    if (!isFetchError) {
      resultDiv.textContent = "";
    }
  }

  // 提出ボタンの処理
  submitBtn.addEventListener("click", async () => {
    const shiftsToSubmit = [];
    let confirmationMessage = "【入力内容の確認】\n";
    const rows = document.querySelectorAll(".shift-row");
    let hasError = false;

    rows.forEach(row => {
      const dateStr = row.dataset.date;
      const shiftId = row.dataset.shiftId || "";
      // ここ
      // const originalStart = row.dataset.originalStart || "";
      // const originalEnd = row.dataset.originalEnd || "";
      let originalStart = (row.dataset.originalStart || "").trim();
      if (originalStart === "null" || originalStart === "undefined") originalStart = "";

      let originalEnd = (row.dataset.originalEnd || "").trim();
      if (originalEnd === "null" || originalEnd === "undefined") originalEnd = "";
      // ここ

      const startSelect = row.querySelector(".start-time");
      const endSelect = row.querySelector(".end-time");

      // プルダウンがない行（過去や休業日）はスキップ
      if (!startSelect || !endSelect) return;

      const start = startSelect.value;
      const end = endSelect.value;

      // 日付の表示形式を整える (例: 2026-04-18 -> 18日)
      const dayDisplay = `${parseInt(dateStr.split("-")[2])}日`;

      // 確認画面用のテキスト作成
      if (start && end) {
        confirmationMessage += `${dayDisplay}: ${start} - ${end}\n`;
      } else {
        confirmationMessage += `${dayDisplay}: シフトなし\n`;
      }

      // エラーチェック
      if ((start && !end) || (!start && end)) {
        hasError = true;
        return;
      }
      if (start && end) {
        const startDt = new Date(`${dateStr}T${start}:00`);
        const endDt = new Date(`${dateStr}T${end}:00`);
        if (startDt >= endDt) {
          hasError = true;
          return;
        }
      }

      // 変更があったデータだけを送信リストに入れる
      if (start !== originalStart || end !== originalEnd) {
        shiftsToSubmit.push({
          date: dateStr,
          start: start,
          end: end,
          id: shiftId
        });
      }
    });

    if (hasError) {
      alert("出勤・退勤時間の入力に誤りがある日が含まれています。\n時間を確認してください。");
      return;
    }

    if (shiftsToSubmit.length === 0) {
      alert("変更されたシフトがありません。");
      return;
    }

    // 確認画面：今日以降の全スケジュールを表示
    confirmationMessage += "\n以上の内容で提出してもよろしいですか？";
    if (!confirm(confirmationMessage)) {
      return;
    }

    // --- 以下、GASへの送信処理 ---
    try {
      submitBtn.disabled = true;
      resultDiv.textContent = "提出中...";
      resultDiv.classList.add("kousintyu");

      const profile = await liff.getProfile();
      const idToken = liff.getIDToken();

      const formBody = new URLSearchParams({
        action: "submitAll",
        userId: profile.userId,
        name: profile.displayName,
        idToken: idToken,
        shiftsData: JSON.stringify(shiftsToSubmit)
      });

      const res = await fetch(GAS_URL, {
        method: "POST",
        body: formBody
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "提出に失敗しました");

      alert("シフトの提出が完了しました！");
      liff.closeWindow();

    } catch (err) {
      console.error(err);
      alert("エラーが発生しました: " + err.message);
    } finally {
      submitBtn.disabled = false;
      resultDiv.textContent = "";
      resultDiv.classList.remove("kousintyu");
    }
  });
};

function renderMayShifts(shiftData) {
  const shiftListDiv = document.getElementById("shift-list");
  shiftListDiv.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ★ 31固定ではなく、その月の最終日を取得するように修正
  const lastDay = new Date(TARGET_YEAR, TARGET_MONTH, 0).getDate();

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${TARGET_YEAR}-${String(TARGET_MONTH).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const targetDate = new Date(`${dateStr}T00:00:00`);
    
    // 既存シフトの取得（配列の最初の要素を想定）
    const existingShift = (shiftData[dateStr] && shiftData[dateStr].length > 0) ? shiftData[dateStr][0] : null;
    const startVal = existingShift ? (existingShift.start || "") : "";
    const endVal = existingShift ? (existingShift.end || "") : "";

    const row = document.createElement("div");
    row.className = "shift-row";
    row.dataset.date = dateStr;
    row.dataset.shiftId = existingShift ? (existingShift.id || "") : "";
    row.dataset.originalStart = startVal; // ★追加：元の出勤時間
    row.dataset.originalEnd = endVal;

    // === ★追加：曜日を日本語にするためのリスト ===
    const weekNames = ["日", "月", "火", "水", "木", "金", "土"];
    const dayOfWeek = targetDate.getDay();

    const dateLabel = document.createElement("span");
    dateLabel.className = "shift-row_date";
    dateLabel.textContent = `${day}日(${weekNames[dayOfWeek]})`; 
    dateLabel.style.width = "60px";

    // === ★ここから追加：祝日と土日の色を変更 ===
    if (nationalHolidays[dateStr]) {
      dateLabel.style.color = "#ff4d8d"; // 祝日（赤）
    } else if (dayOfWeek === 0) {
      dateLabel.style.color = "#ff4d8d"; // 日曜日（赤）
    } else if (dayOfWeek === 6) {
      dateLabel.style.color = "#01b6ff"; // 土曜日（青）
    }
    // === ★ここまで ===

    row.appendChild(dateLabel);

    // 休業日判定
    if (holidays.includes(dateStr)) {
      const holidaySpan = document.createElement("span");
      holidaySpan.className = "holiday-text";
      holidaySpan.textContent = "休業日";
      row.appendChild(holidaySpan);
      row.classList.add("dont");
      shiftListDiv.appendChild(row);
      continue;
    }

    // 過去日判定（今日より前）
    if (targetDate < today) {
      const pastSpan = document.createElement("span");
      pastSpan.className = "past-text";
      pastSpan.textContent = existingShift ? `${startVal} - ${endVal}` : "入力不可";
      row.appendChild(pastSpan);
      row.classList.add("dont");
      shiftListDiv.appendChild(row);
      continue;
    }

    // プルダウン生成（今日以降） ★ dateStrを引数に追加
    const startSelect = createDropdown(startRules, startVal, dateStr);
    startSelect.className = "start-time";
    
    const separator = document.createElement("span");
    // separator.textContent = " - ";
    separator.className = "separator";

    const endSelect = createDropdown(endRules, endVal, dateStr);
    endSelect.className = "end-time";

    row.appendChild(startSelect);
    row.appendChild(separator);
    row.appendChild(endSelect);

    shiftListDiv.appendChild(row);
  }
}

// ★ 引数に dateStr を追加し、過去の時間を除外する処理を実装
function createDropdown(rules, selectedValue, dateStr) {
  const select = document.createElement("select");
  
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "選択";
  select.appendChild(defaultOpt);

  const now = new Date();

  for (const h in rules) {
    for (const m of rules[h]) {
      const timeStr = `${String(h).padStart(2, "0")}:${m}`;
      
      const dt = new Date(`${dateStr}T${timeStr}:00`);
      
      // ▼ ここを変更：過去の時間でも、既存シフトと同じ時間なら残す ▼
      if (dt < now && timeStr !== selectedValue) continue; 
      // ▲ ここまで ▲

      const opt = document.createElement("option");
      opt.value = timeStr;
      opt.textContent = timeStr;
      
      if (timeStr === selectedValue) {
        opt.selected = true;
      }
      select.appendChild(opt);
    }
  }
  return select;
}