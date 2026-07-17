// 表示モード(ライト/ダーク)と文字・ボタンサイズ(通常/高齢者)の設定

function applyAppearanceSettings() {
  const theme = localStorage.getItem("theme") || "light";
  const mode = localStorage.getItem("uiMode") || "normal";

  document.body.classList.toggle("dark", theme === "dark");
  document.body.classList.toggle("elderly", mode === "elderly");

  document.querySelectorAll("#theme-toggle .segmented-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === theme);
  });
  document.querySelectorAll("#mode-toggle .segmented-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === mode);
  });
}

document.querySelectorAll("#theme-toggle .segmented-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    localStorage.setItem("theme", btn.dataset.value);
    applyAppearanceSettings();
  });
});

document.querySelectorAll("#mode-toggle .segmented-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    localStorage.setItem("uiMode", btn.dataset.value);
    applyAppearanceSettings();
  });
});

applyAppearanceSettings();

// 進行中セッションの管理(出発後、ゴールするまでの状態)

function getActiveSession() {
  const raw = localStorage.getItem("activeSession");
  return raw ? JSON.parse(raw) : null;
}

function setActiveSession(courseId) {
  localStorage.setItem("activeSession", JSON.stringify({
    courseId,
    startedAt: new Date().toISOString()
  }));
}

function clearActiveSession() {
  localStorage.removeItem("activeSession");
}

let currentCourseId = null;
let pendingCourseId = null;

function attemptOpenCourse(courseId) {
  const session = getActiveSession();
  if (session) {
    pendingCourseId = courseId;
    showConfirmDialog(session.courseId);
  } else {
    openChecklist(courseId);
  }
}

function showConfirmDialog(activeCourseId) {
  const label = courseMeta[activeCourseId] ? courseMeta[activeCourseId].label : "前回のコース";
  document.getElementById("dialog-text").textContent =
    `前回の「${label}」がまだ終わっていません。終わらせてから始めますか？`;
  document.getElementById("dialog-overlay").classList.remove("hidden");
}

function hideConfirmDialog() {
  document.getElementById("dialog-overlay").classList.add("hidden");
}

document.getElementById("dialog-continue").addEventListener("click", () => {
  hideConfirmDialog();
  const session = getActiveSession();
  showGoalScreen(session ? session.courseId : null);
});

document.getElementById("dialog-discard").addEventListener("click", () => {
  hideConfirmDialog();
  clearActiveSession();
  if (pendingCourseId) {
    openChecklist(pendingCourseId);
    pendingCourseId = null;
  }
});

function showGoalScreen(courseId) {
  const label = courseMeta[courseId] ? courseMeta[courseId].label : "";
  document.getElementById("goal-sub").textContent = label ? `${label}、ゴール` : "ゴール";
  showScreen("goal");
}

// チェック項目データ(共通項目・コース項目)。localStorageに保存し、設定画面で編集可能にする

const courseMeta = {
  shopping: { label: "買い物", icon: "🛒" },
  hospital: { label: "病院", icon: "🏥" },
  walk:     { label: "散歩", icon: "🚶" },
  outing:   { label: "お出かけ", icon: "🎉" },
};

const defaultChecklistData = {
  common: ["財布", "鍵", "スマホ"],
  courses: {
    shopping: ["エコバッグ"],
    hospital: ["保険証", "診察券", "お薬手帳"],
    walk: ["水筒", "帽子"],
    outing: [],
  },
};

function loadChecklistData() {
  const raw = localStorage.getItem("checklistData");
  if (raw) return JSON.parse(raw);
  return JSON.parse(JSON.stringify(defaultChecklistData));
}

function saveChecklistData() {
  localStorage.setItem("checklistData", JSON.stringify(checklistData));
}

let checklistData = loadChecklistData();
let checkedState = {};

function renderHome() {
  const list = document.getElementById("course-list");
  list.innerHTML = "";
  Object.entries(courseMeta).forEach(([id, meta]) => {
    const btn = document.createElement("button");
    btn.className = "course-btn";
    btn.innerHTML = `<span class="course-icon">${meta.icon}</span><span>${meta.label}</span>`;
    btn.addEventListener("click", () => attemptOpenCourse(id));
    list.appendChild(btn);
  });
}

function openChecklist(courseId) {
  currentCourseId = courseId;
  const meta = courseMeta[courseId];
  const courseItems = checklistData.courses[courseId];
  checkedState = {};

  document.getElementById("checklist-title").textContent = meta.label;
  const body = document.getElementById("checklist-body");
  body.innerHTML = "";

  const commonLabel = document.createElement("p");
  commonLabel.className = "section-label";
  commonLabel.textContent = "共通";
  body.appendChild(commonLabel);
  checklistData.common.forEach(name => body.appendChild(makeCheckItem(name)));

  if (courseItems.length > 0) {
    const courseLabel = document.createElement("p");
    courseLabel.className = "section-label";
    courseLabel.textContent = meta.label;
    body.appendChild(courseLabel);
    courseItems.forEach(name => body.appendChild(makeCheckItem(name)));
  }

  updateStartButton();
  showScreen("checklist");
}

function makeCheckItem(name) {
  const label = document.createElement("label");
  label.className = "check-item";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.addEventListener("change", () => {
    checkedState[name] = input.checked;
    updateStartButton();
  });
  label.appendChild(input);
  const span = document.createElement("span");
  span.textContent = name;
  label.appendChild(span);
  return label;
}

function updateStartButton() {
  const boxes = document.querySelectorAll("#checklist-body input[type=checkbox]");
  const allChecked = boxes.length > 0 && Array.from(boxes).every(b => b.checked);
  document.getElementById("btn-start").disabled = !allChecked;
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  document.getElementById(`screen-${name}`).classList.remove("hidden");
}

document.getElementById("btn-start").addEventListener("click", () => {
  setActiveSession(currentCourseId);
  showScreen("departure");
});
document.getElementById("btn-departure-ok").addEventListener("click", () => showScreen("home"));
document.getElementById("btn-goal-ok").addEventListener("click", () => {
  clearActiveSession();
  showScreen("home");
});
document.getElementById("btn-back-home").addEventListener("click", () => showScreen("home"));
document.getElementById("btn-back-home-2").addEventListener("click", () => showScreen("home"));
document.getElementById("btn-settings").addEventListener("click", () => showScreen("settings"));

renderHome();

const existingSession = getActiveSession();
if (existingSession) {
  showGoalScreen(existingSession.courseId);
}

// 設定画面: 項目の追加・削除・並び替え

function swapItems(arr, i, j) {
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
}

function renderEditList(containerId, items, onDelete, onMoveUp, onMoveDown) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  items.forEach((name, idx) => {
    const row = document.createElement("div");
    row.className = "edit-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "edit-item-name";
    nameSpan.textContent = name;
    row.appendChild(nameSpan);

    const upBtn = document.createElement("button");
    upBtn.className = "edit-icon-btn";
    upBtn.textContent = "↑";
    upBtn.disabled = idx === 0;
    upBtn.addEventListener("click", () => onMoveUp(idx));
    row.appendChild(upBtn);

    const downBtn = document.createElement("button");
    downBtn.className = "edit-icon-btn";
    downBtn.textContent = "↓";
    downBtn.disabled = idx === items.length - 1;
    downBtn.addEventListener("click", () => onMoveDown(idx));
    row.appendChild(downBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "edit-icon-btn edit-delete";
    delBtn.textContent = "✕";
    delBtn.addEventListener("click", () => onDelete(idx));
    row.appendChild(delBtn);

    container.appendChild(row);
  });
}

function renderCommonEditList() {
  renderEditList(
    "common-items-list",
    checklistData.common,
    (idx) => { checklistData.common.splice(idx, 1); saveChecklistData(); renderCommonEditList(); },
    (idx) => { swapItems(checklistData.common, idx, idx - 1); saveChecklistData(); renderCommonEditList(); },
    (idx) => { swapItems(checklistData.common, idx, idx + 1); saveChecklistData(); renderCommonEditList(); }
  );
}

let selectedEditCourse = "shopping";

function renderCourseEditList() {
  const items = checklistData.courses[selectedEditCourse];
  renderEditList(
    "course-items-list",
    items,
    (idx) => { items.splice(idx, 1); saveChecklistData(); renderCourseEditList(); },
    (idx) => { swapItems(items, idx, idx - 1); saveChecklistData(); renderCourseEditList(); },
    (idx) => { swapItems(items, idx, idx + 1); saveChecklistData(); renderCourseEditList(); }
  );
}

document.querySelectorAll("#course-edit-tabs .segmented-btn").forEach(btn => {
  btn.classList.toggle("active", btn.dataset.course === selectedEditCourse);
  btn.addEventListener("click", () => {
    selectedEditCourse = btn.dataset.course;
    document.querySelectorAll("#course-edit-tabs .segmented-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.course === selectedEditCourse);
    });
    renderCourseEditList();
  });
});

document.getElementById("common-add-btn").addEventListener("click", () => {
  const input = document.getElementById("common-add-input");
  const val = input.value.trim();
  if (!val) return;
  checklistData.common.push(val);
  input.value = "";
  saveChecklistData();
  renderCommonEditList();
});

document.getElementById("course-add-btn").addEventListener("click", () => {
  const input = document.getElementById("course-add-input");
  const val = input.value.trim();
  if (!val) return;
  checklistData.courses[selectedEditCourse].push(val);
  input.value = "";
  saveChecklistData();
  renderCourseEditList();
});

renderCommonEditList();
renderCourseEditList();
