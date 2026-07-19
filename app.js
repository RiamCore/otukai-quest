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
  const label = meta ? meta.label : "前回のお出かけ";
  document.getElementById("dialog-text").textContent =
    `おかえりなさい。前回の「${label}」のお出かけを終わらせますか？`;
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
  updateHomeShoppingButton();
  updateHomeArrivedButton();
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

  if (courseId === "shopping") {
    const shopBtn = document.createElement("button");
    shopBtn.className = "shopping-list-entry-btn";
    shopBtn.textContent = "🛒 買い物リスト";
    shopBtn.addEventListener("click", () => {
      openShoppingEdit("checklist");
    });
    body.appendChild(shopBtn);
  }

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
  const allChecked = Array.from(boxes).every(b => b.checked);
  document.getElementById("btn-start").disabled = !allChecked;
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  document.getElementById(`screen-${name}`).classList.remove("hidden");
}

document.getElementById("btn-start").addEventListener("click", () => {
  if (currentCourseId === "shopping") {
    shoppingList.forEach(item => { item.checked = false; });
    saveShoppingList();
  }
  setActiveSession(currentCourseId);
  updateHomeShoppingButton();
  updateHomeArrivedButton();
  showScreen("departure");
});
document.getElementById("btn-departure-ok").addEventListener("click", () => showScreen("home"));
document.getElementById("btn-goal-ok").addEventListener("click", () => {
  clearActiveSession();
  updateHomeShoppingButton();
  updateHomeArrivedButton();
  showScreen("home");
});
document.getElementById("btn-back-home").addEventListener("click", () => showScreen("home"));
document.getElementById("btn-back-home-2").addEventListener("click", () => showScreen("home"));
document.getElementById("btn-settings").addEventListener("click", () => showScreen("settings"));

renderHome();
updateHomeShoppingButton();
updateHomeArrivedButton();

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

// よく使う商品(買い物リストのプルダウン用マスターリスト)。localStorageに保存し、設定画面で編集可能にする

function loadFrequentItems() {
  const raw = localStorage.getItem("frequentItems");
  return raw ? JSON.parse(raw) : [];
}

function saveFrequentItems() {
  localStorage.setItem("frequentItems", JSON.stringify(frequentItems));
}

let frequentItems = loadFrequentItems();

function renderFrequentEditList() {
  renderEditList(
    "frequent-items-list",
    frequentItems,
    (idx) => { frequentItems.splice(idx, 1); saveFrequentItems(); renderFrequentEditList(); },
    (idx) => { swapItems(frequentItems, idx, idx - 1); saveFrequentItems(); renderFrequentEditList(); },
    (idx) => { swapItems(frequentItems, idx, idx + 1); saveFrequentItems(); renderFrequentEditList(); }
  );
}

document.getElementById("frequent-add-btn").addEventListener("click", () => {
  const input = document.getElementById("frequent-add-input");
  const val = input.value.trim();
  if (!val) return;
  frequentItems.push(val);
  input.value = "";
  saveFrequentItems();
  renderFrequentEditList();
});

renderFrequentEditList();

// 賞味期限管理(商品名+実日付を登録し、残り日数を表示)

function loadExpirationItems() {
  const raw = localStorage.getItem("expirationItems");
  return raw ? JSON.parse(raw) : [];
}

function saveExpirationItems() {
  localStorage.setItem("expirationItems", JSON.stringify(expirationItems));
}

let expirationItems = loadExpirationItems();

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

function expirationLabel(days) {
  if (days < 0) return "期限切れ";
  if (days === 0) return "本日まで";
  return `あと${days}日`;
}

function renderExpirationList() {
  const container = document.getElementById("expiration-list");
  container.innerHTML = "";

  if (expirationItems.length === 0) {
    const p = document.createElement("p");
    p.className = "sub";
    p.textContent = "登録された賞味期限はありません。";
    container.appendChild(p);
    return;
  }

  const sorted = [...expirationItems].sort((a, b) => daysUntil(a.date) - daysUntil(b.date));

  sorted.forEach(item => {
    const days = daysUntil(item.date);
    const row = document.createElement("div");
    row.className = "edit-item expiration-item";
    if (days < 0) row.classList.add("expiration-overdue");
    else if (days <= 2) row.classList.add("expiration-soon");

    const nameSpan = document.createElement("span");
    nameSpan.className = "edit-item-name";
    nameSpan.textContent = item.name;
    row.appendChild(nameSpan);

    const daysSpan = document.createElement("span");
    daysSpan.className = "expiration-days";
    daysSpan.textContent = expirationLabel(days);
    row.appendChild(daysSpan);

    const delBtn = document.createElement("button");
    delBtn.className = "edit-icon-btn edit-delete";
    delBtn.textContent = "✕";
    delBtn.addEventListener("click", () => {
      const idx = expirationItems.indexOf(item);
      if (idx !== -1) expirationItems.splice(idx, 1);
      saveExpirationItems();
      renderExpirationList();
    });
    row.appendChild(delBtn);

    container.appendChild(row);
  });
}

function renderExpirationFrequentSelect() {
  const select = document.getElementById("expiration-frequent-select");
  select.innerHTML = '<option value="" disabled selected>よく使う商品から選ぶ(任意)</option>';
  frequentItems.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

document.getElementById("expiration-frequent-select").addEventListener("change", (e) => {
  if (e.target.value) {
    document.getElementById("expiration-name-input").value = e.target.value;
  }
});

document.getElementById("expiration-add-btn").addEventListener("click", () => {
  const nameInput = document.getElementById("expiration-name-input");
  const dateInput = document.getElementById("expiration-date-input");
  const name = nameInput.value.trim();
  const date = dateInput.value;
  if (!name || !date) return;
  expirationItems.push({ name, date });
  saveExpirationItems();
  nameInput.value = "";
  dateInput.value = "";
  document.getElementById("expiration-frequent-select").value = "";
  renderExpirationList();
});

document.getElementById("btn-home-expiration").addEventListener("click", () => {
  renderExpirationList();
  renderExpirationFrequentSelect();
  showScreen("expiration");
});

document.getElementById("btn-expiration-back").addEventListener("click", () => showScreen("home"));

// 買い物リスト(自由入力のメモ)。localStorageに保存し、編集画面と閲覧(チェック)画面の2つを持つ

function loadShoppingList() {
  const raw = localStorage.getItem("shoppingList");
  return raw ? JSON.parse(raw) : [];
}

function saveShoppingList() {
  localStorage.setItem("shoppingList", JSON.stringify(shoppingList));
}

let shoppingList = loadShoppingList();
let shoppingListReturnScreen = "checklist";

function renderShoppingEditList() {
  const container = document.getElementById("shopping-edit-list");
  container.innerHTML = "";
  shoppingList.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "edit-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "edit-item-name";
    nameSpan.textContent = item.name;
    row.appendChild(nameSpan);

    const delBtn = document.createElement("button");
    delBtn.className = "edit-icon-btn edit-delete";
    delBtn.textContent = "✕";
    delBtn.addEventListener("click", () => {
      shoppingList.splice(idx, 1);
      saveShoppingList();
      renderShoppingEditList();
    });
    row.appendChild(delBtn);

    container.appendChild(row);
  });
}

function renderShoppingViewList() {
  const container = document.getElementById("shopping-view-list");
  container.innerHTML = "";

  if (shoppingList.length === 0) {
    const p = document.createElement("p");
    p.className = "sub";
    p.textContent = "リストが空です。「編集」から追加してください。";
    container.appendChild(p);
    return;
  }

  shoppingList.forEach((item) => {
    const label = document.createElement("label");
    label.className = "check-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = item.checked;
    input.addEventListener("change", () => {
      item.checked = input.checked;
      saveShoppingList();
    });
    label.appendChild(input);

    const span = document.createElement("span");
    span.textContent = item.name;
    label.appendChild(span);

    container.appendChild(label);
  });
}

function renderShoppingFrequentSelect() {
  const select = document.getElementById("shopping-frequent-select");
  select.innerHTML = '<option value="" disabled selected>タップして選ぶ</option>';
  frequentItems.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

document.getElementById("shopping-frequent-select").addEventListener("change", (e) => {
  const val = e.target.value;
  if (!val) return;
  shoppingList.push({ name: val, checked: false });
  saveShoppingList();
  renderShoppingEditList();
  e.target.value = "";
});

function openShoppingEdit(returnTo) {
  shoppingListReturnScreen = returnTo;
  renderShoppingEditList();
  renderShoppingFrequentSelect();
  showScreen("shopping-edit");
}

function updateHomeShoppingButton() {
  const session = getActiveSession();
  const show = !!(session && session.courseId === "shopping");
  document.getElementById("btn-home-shopping-list").classList.toggle("is-hidden", !show);
}

function updateHomeArrivedButton() {
  const session = getActiveSession();
  document.getElementById("btn-home-arrived").classList.toggle("is-hidden", !session);
}

document.getElementById("btn-home-arrived").addEventListener("click", () => {
  const session = getActiveSession();
  if (session) showGoalScreen(session.courseId);
});

document.getElementById("shopping-add-btn").addEventListener("click", () => {
  const input = document.getElementById("shopping-add-input");
  const val = input.value.trim();
  if (!val) return;
  shoppingList.push({ name: val, checked: false });
  input.value = "";
  saveShoppingList();
  renderShoppingEditList();
});

document.getElementById("btn-shopping-edit-done").addEventListener("click", () => {
  if (shoppingListReturnScreen === "shopping-view") renderShoppingViewList();
  showScreen(shoppingListReturnScreen);
});

document.getElementById("btn-shopping-view-back").addEventListener("click", () => showScreen("home"));
document.getElementById("btn-shopping-view-edit").addEventListener("click", () => openShoppingEdit("shopping-view"));

document.getElementById("btn-home-shopping-list").addEventListener("click", () => {
  renderShoppingViewList();
  showScreen("shopping-view");
});

updateHomeShoppingButton();
