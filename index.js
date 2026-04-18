// index.js
const GAS_URL = "https://script.google.com/macros/s/AKfycbw1R3VVsXwZnlo0whZY4jGufYB4uGr-120knnGsranSOCYxaZCBxAqsMc2-tiKi9uJL/exec";
const TARGET_YEAR = 2026; // 運用に合わせて年を設定
const TARGET_MONTH = 4;

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

window.onload = async function () {
  const resultDiv = document.getElementById("result");
  const shiftListDiv = document.getElementById("shift-list");
  const submitBtn = document.getElementById("submit-btn");

  try {
    await liff.init({ liffId: "2009569390-ToBfmkCN" });

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

    const profile = await liff.getProfile();
    const url = `${GAS_URL}?action=fetch&userId=${encodeURIComponent(profile.userId)}&name=${encodeURIComponent(profile.displayName)}&idToken=${encodeURIComponent(idToken)}&t=${Date.now()}`;
    
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "シフト取得に失敗しました");
    }

    renderMayShifts(data.shifts || {});
    submitBtn.style.display = "block";

  } catch (err) {
    console.error(err);
    resultDiv.textContent = "取得エラー: " + err.message;
  } finally {
    resultDiv.classList.remove("kousintyu");
    if (!resultDiv.textContent.includes("エラー")) resultDiv.textContent = "";
  }

  // 提出ボタンの確認画面（送信用ロジックは次の段階用）
  submitBtn.addEventListener("click", () => {
    if(confirm("シフトを提出しますか？")) {
      // 次のステップでここにAnycrossへ送信する処理を追加します
      alert("送信準備完了（次のステップで実装）");
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
    row.dataset.shiftId = existingShift ? (existingShift.id || "") : ""; // 更新用にIDを保持

    const dateLabel = document.createElement("span");
    dateLabel.textContent = `${day}日`;
    dateLabel.style.width = "40px";
    row.appendChild(dateLabel);

    // 休業日判定
    if (holidays.includes(dateStr)) {
      const holidaySpan = document.createElement("span");
      holidaySpan.className = "holiday-text";
      holidaySpan.textContent = "休業日";
      row.appendChild(holidaySpan);
      shiftListDiv.appendChild(row);
      continue;
    }

    // 過去日判定（今日より前）
    if (targetDate < today) {
      const pastSpan = document.createElement("span");
      pastSpan.className = "past-text";
      pastSpan.textContent = existingShift ? `${startVal} - ${endVal}` : "入力不可";
      row.appendChild(pastSpan);
      shiftListDiv.appendChild(row);
      continue;
    }

    // プルダウン生成（今日以降） ★ dateStrを引数に追加
    const startSelect = createDropdown(startRules, startVal, dateStr);
    startSelect.className = "start-time";
    
    const separator = document.createElement("span");
    separator.textContent = " - ";

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
      
      // 今の時間以降かどうかの判定
      const dt = new Date(`${dateStr}T${timeStr}:00`);
      if (dt < now) continue; 

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