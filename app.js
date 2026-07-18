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

// チェック項目データ(共通項目・コース一覧・コースごとの項目)。localStorageに保存し、設定画面で編集可能にする

const defaultChecklistData = {
  common: ["財布", "鍵", "スマホ"],
  courseOrder: ["shopping", "hospital", "walk", "outing"],
  courseMeta: {
    shopping: { label: "買い物", icon: "🛒" },
    hospital: { label: "病院", icon: "🏥" },
    walk:     { label: "散歩", icon: "🚶" },
    outing:   { label: "お出かけ", icon: "🎉" },
  },
  courseItems: {
    shopping: ["エコバッグ"],
    hospital: ["保険証", "診察券", "お薬手帳"],
    walk: ["水筒", "帽子"],
    outing: [],
  },
};

function loadChecklistData() {
  const raw = localStorage.getItem("checklistData");
  if (!raw) return JSON.parse(JSON.stringify(defaultChecklistData));

  const data = JSON.parse(raw);
  // 古いバージョン(コース追加機能がなかった頃)のデータ形式からの移行
  if (!data.courseMeta || !data.courseOrder || !data.courseItems) {
    const oldCourses = data.courses || {};
    data.courseMeta = JSON.parse(JSON.stringify(defaultChecklistData.courseMeta));
    data.courseOrder = Object.keys(data.courseMeta);
    data.courseItems = Object.keys(oldCourses).length > 0
      ? oldCourses
      : JSON.parse(JSON.stringify(defaultChecklistData.courseItems));
    delete data.courses;
  }
  if (!data.common) data.common = [...defaultChecklistData.common];
  return data;
}

function saveChecklistData() {
  localStorage.setItem("checklistData", JSON.stringify(checklistData));
}

let checklistData = loadChecklistData();
let checkedState = {};

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
  const meta = checklistData.courseMeta[activeCourseId];
  const label = meta ? meta.label : "前回のコース";
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
  const meta = checklistData.courseMeta[courseId];
  const label = meta ? meta.label : "";
  document.getElementById("goal-sub").textContent = label ? `${label}、ゴール` : "ゴール";
  showScreen("goal");
}

// ホーム画面・チェックリスト画面

function renderHome() {
  const list = document.getElementById("course-list");
  list.innerHTML = "";
  checklistData.courseOrder.forEach(id => {
    const meta = checklistData.courseMeta[id];
    const btn = document.createElement("button");
    btn.className = "course-btn";
    btn.innerHTML = `<span class="course-icon">${meta.icon}</span><span>${meta.label}</span>`;
    btn.addEventListener("click", () => attemptOpenCourse(id));
    list.appendChild(btn);
  });
}

function openChecklist(courseId) {
  currentCourseId = courseId;
  const meta = checklistData.courseMeta[courseId];
  const courseItems = checklistData.courseItems[courseId];
  checkedState = {};

  document.getElementById("checklist-title").textContent = meta.label;
  const body = document.getElementById("checklist-body");
  body.innerHTML = "";

  const allItems = [...checklistData.common, ...courseItems];
  allItems.forEach(name => body.appendChild(makeCheckItem(name)));

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

document.getElementById("common-add-btn").addEventListener("click", () => {
  const input = document.getElementById("common-add-input");
  const val = input.value.trim();
  if (!val) return;
  checklistData.common.push(val);
  input.value = "";
  saveChecklistData();
  renderCommonEditList();
});

// コース別チェック項目の編集(タブ切り替え)

let selectedEditCourse = checklistData.courseOrder[0];

function renderCourseTabs() {
  const container = document.getElementById("course-edit-tabs");
  container.innerHTML = "";
  checklistData.courseOrder.forEach(id => {
    const meta = checklistData.courseMeta[id];
    const btn = document.createElement("button");
    btn.className = "segmented-btn";
    btn.dataset.course = id;
    btn.textContent = `${meta.icon} ${meta.label}`;
    if (id === selectedEditCourse) btn.classList.add("active");
    btn.addEventListener("click", () => {
      selectedEditCourse = id;
      renderCourseTabs();
      renderCourseEditList();
    });
    container.appendChild(btn);
  });
}

function renderCourseEditList() {
  const items = checklistData.courseItems[selectedEditCourse];
  renderEditList(
    "course-items-list",
    items,
    (idx) => { items.splice(idx, 1); saveChecklistData(); renderCourseEditList(); },
    (idx) => { swapItems(items, idx, idx - 1); saveChecklistData(); renderCourseEditList(); },
    (idx) => { swapItems(items, idx, idx + 1); saveChecklistData(); renderCourseEditList(); }
  );
  updateCourseDeleteButton();
}

function updateCourseDeleteButton() {
  const btn = document.getElementById("course-delete-btn");
  btn.disabled = checklistData.courseOrder.length <= 1;
}

document.getElementById("course-add-btn").addEventListener("click", () => {
  const input = document.getElementById("course-add-input");
  const val = input.value.trim();
  if (!val) return;
  checklistData.courseItems[selectedEditCourse].push(val);
  input.value = "";
  saveChecklistData();
  renderCourseEditList();
});

document.getElementById("course-delete-btn").addEventListener("click", () => {
  if (checklistData.courseOrder.length <= 1) return;

  const session = getActiveSession();
  if (session && session.courseId === selectedEditCourse) {
    alert("進行中のコースは削除できません。先にゴールしてから削除してください。");
    return;
  }

  const meta = checklistData.courseMeta[selectedEditCourse];
  const confirmed = confirm(`「${meta.label}」を削除しますか？中の項目もすべて削除されます。`);
  if (!confirmed) return;

  const deletedId = selectedEditCourse;
  checklistData.courseOrder = checklistData.courseOrder.filter(id => id !== deletedId);
  delete checklistData.courseMeta[deletedId];
  delete checklistData.courseItems[deletedId];
  saveChecklistData();

  selectedEditCourse = checklistData.courseOrder[0];
  renderCourseTabs();
  renderCourseEditList();
  renderHome();
});

// 新しいコースの追加(アイコンは用意した絵文字リストから選択)

const newCourseIconChoices = ["🛒", "🏥", "🚶", "🎉", "💇", "🏦", "🏫", "🚗", "🐕", "🏋️", "🍽️", "🍱", "🎨", "🎵", "✈️", "🌳", "⚽"];
let selectedNewCourseIcon = newCourseIconChoices[0];

function renderNewCourseIconPicker() {
  const container = document.getElementById("new-course-icon-picker");
  container.innerHTML = "";
  newCourseIconChoices.forEach(icon => {
    const btn = document.createElement("button");
    btn.className = "icon-choice-btn";
    btn.textContent = icon;
    btn.type = "button";
    if (icon === selectedNewCourseIcon) btn.classList.add("active");
    btn.addEventListener("click", () => {
      selectedNewCourseIcon = icon;
      renderNewCourseIconPicker();
    });
    container.appendChild(btn);
  });
}

document.getElementById("new-course-add-btn").addEventListener("click", () => {
  const input = document.getElementById("new-course-name-input");
  const name = input.value.trim();
  if (!name) return;

  const newId = "course_" + Date.now();
  checklistData.courseMeta[newId] = { label: name, icon: selectedNewCourseIcon };
  checklistData.courseItems[newId] = [];
  checklistData.courseOrder.push(newId);
  saveChecklistData();

  input.value = "";
  selectedEditCourse = newId;
  renderHome();
  renderCourseTabs();
  renderCourseEditList();
});

renderCommonEditList();
renderCourseTabs();
renderCourseEditList();
renderNewCourseIconPicker();