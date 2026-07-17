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

// ステップ1: 画面遷移とデータ構造の骨組み(保存機能はまだなし)

const commonItems = ["財布", "鍵", "スマホ"];

const courses = {
  shopping: { label: "買い物", icon: "🛒", items: ["エコバッグ"] },
  hospital: { label: "病院", icon: "🏥", items: ["保険証", "診察券", "お薬手帳"] },
  walk:     { label: "散歩", icon: "🚶", items: ["水筒", "帽子"] },
  outing:   { label: "お出かけ", icon: "🎉", items: [] },
};

let checkedState = {};

function renderHome() {
  const list = document.getElementById("course-list");
  list.innerHTML = "";
  Object.entries(courses).forEach(([id, course]) => {
    const btn = document.createElement("button");
    btn.className = "course-btn";
    btn.innerHTML = `<span class="course-icon">${course.icon}</span><span>${course.label}</span>`;
    btn.addEventListener("click", () => openChecklist(id));
    list.appendChild(btn);
  });
}

function openChecklist(courseId) {
  const course = courses[courseId];
  checkedState = {};

  document.getElementById("checklist-title").textContent = course.label;
  const body = document.getElementById("checklist-body");
  body.innerHTML = "";

  const commonLabel = document.createElement("p");
  commonLabel.className = "section-label";
  commonLabel.textContent = "共通";
  body.appendChild(commonLabel);
  commonItems.forEach(name => body.appendChild(makeCheckItem(name)));

  if (course.items.length > 0) {
    const courseLabel = document.createElement("p");
    courseLabel.className = "section-label";
    courseLabel.textContent = course.label;
    body.appendChild(courseLabel);
    course.items.forEach(name => body.appendChild(makeCheckItem(name)));
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
  showScreen("departure");
});
document.getElementById("btn-departure-ok").addEventListener("click", () => showScreen("home"));
document.getElementById("btn-goal-ok").addEventListener("click", () => showScreen("home"));
document.getElementById("btn-back-home").addEventListener("click", () => showScreen("home"));
document.getElementById("btn-back-home-2").addEventListener("click", () => showScreen("home"));
document.getElementById("btn-settings").addEventListener("click", () => showScreen("settings"));

renderHome();
