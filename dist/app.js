const CATEGORIES = [
  { id: "exams", title: "Partial exams", weight: 40, items: [["Exam 1",100],["Exam 2",100],["Exam 3",100]], bonus: true },
  { id: "projects", title: "Programming projects", weight: 15, items: [["PA0",25],["PA1",100],["PA2",100],["PA3",100]], bonus: true },
  { id: "labs", title: "Laboratories", weight: 15, items: Array.from({length:10},(_,i)=>[`Lab ${i+1}`,100]), bonus: true },
  { id: "quizzes", title: "Quizzes", weight: 10, items: Array.from({length:10},(_,i)=>[`Quiz ${i+1}`,10]), bonus: false },
  { id: "attendance", title: "Attendance", weight: 4, items: [["Attendance",100]], bonus: false },
  { id: "final", title: "Final exam", weight: 16, items: [["Final exam",100]], bonus: false }
];
const PASSING_GRADE = 70;
const STORAGE_KEY = "course-grade-calculator-v1";
const state = loadState();
const categoryList = document.querySelector("#categoryList");

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { document.querySelector("#saveStatus").textContent = "Storage unavailable; keep this page open"; return; }
  const status = document.querySelector("#saveStatus");
  status.textContent = "Saved on this device";
}
function number(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
function fmt(value, digits = 2) { return value.toFixed(digits); }

function renderCategories() {
  const template = document.querySelector("#categoryTemplate");
  CATEGORIES.forEach((category, categoryIndex) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.category = category.id;
    node.querySelector(".category-number").textContent = String(categoryIndex + 1).padStart(2,"0");
    node.querySelector("h3").textContent = category.title;
    node.querySelector(".category-title p").textContent = `${category.weight}% of final grade`;
    const list = node.querySelector(".input-list");
    category.items.forEach(([label,max], itemIndex) => {
      const row = document.createElement("div");
      row.className = "grade-row";
      const key = `${category.id}-${itemIndex}`;
      const saved = state[key];
      row.innerHTML = `<label for="${key}">${label}</label><input class="points-input" id="${key}" data-key="${key}" inputmode="decimal" type="number" min="0" step="0.01" placeholder="—" aria-label="Points earned for ${label}"><input class="max-input" type="number" value="${max}" readonly aria-label="Points possible for ${label}">`;
      if (saved !== undefined) row.querySelector(".points-input").value = saved;
      list.append(row);
    });
    node.id = `panel-${category.id}`;
    node.setAttribute("aria-labelledby", `tab-${category.id}`);
    node.hidden = categoryIndex !== 0;
    const tab = document.createElement("button");
    tab.type = "button";
    tab.id = `tab-${category.id}`;
    tab.className = "category-tab";
    tab.dataset.categoryTab = category.id;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", node.id);
    tab.setAttribute("aria-selected", String(categoryIndex === 0));
    tab.tabIndex = categoryIndex === 0 ? 0 : -1;
    const shortTitle = {exams:"Exams", projects:"Projects", labs:"Labs", quizzes:"Quizzes", attendance:"Attendance", final:"Final exam"}[category.id];
    tab.innerHTML = `<span>${shortTitle}</span><small>${category.weight}% &middot; <span class="tab-count">0/${category.items.length}</span></small>`;
    tab.addEventListener("click", () => selectCategory(category.id));
    tab.addEventListener("keydown", event => {
      const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? CATEGORIES.length-1 : (categoryIndex + (event.key === "ArrowRight" ? 1 : -1) + CATEGORIES.length) % CATEGORIES.length;
      selectCategory(CATEGORIES[next].id, true);
    });
    document.querySelector("#categoryTabs").append(tab);
    categoryList.append(node);
  });
}

function selectCategory(id, focus = false) {
  CATEGORIES.forEach(category => {
    const selected = category.id === id;
    const tab = document.querySelector(`#tab-${category.id}`);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.querySelector(`#panel-${category.id}`).hidden = !selected;
    if (selected && focus) tab.focus();
  });
}

function categoryStats(category) {
  let earned = 0, gradedMax = 0, bonus = 0, gradedCount = 0;
  const plannedMax = category.items.reduce((sum,item)=>sum+item[1],0);
  category.items.forEach((item,index) => {
    const score = number(state[`${category.id}-${index}`]);
    if (score === null) return;
    gradedCount += 1;
    gradedMax += item[1];
    earned += score;
    bonus += Math.max(0, score - item[1]);
  });
  const cappedEarned = Math.min(earned, plannedMax);
  return {
    earned, gradedMax, plannedMax, bonus, gradedCount,
    offeredCoursePoints: category.weight * gradedMax / plannedMax,
    earnedCoursePoints: category.weight * cappedEarned / plannedMax,
    gradedAverage: gradedMax ? Math.min(earned / gradedMax * 100, 100) : null,
    fullAverage: Math.min(earned / plannedMax * 100, 100)
  };
}

function update() {
  let offered = 0, earned = 0;
  document.querySelector("#breakdownBody").replaceChildren();
  CATEGORIES.forEach(category => {
    const stats = categoryStats(category);
    document.querySelector(`#tab-${category.id} .tab-count`).textContent = `${stats.gradedCount}/${category.items.length}`;
    const row = document.createElement("tr");
    row.innerHTML = `<th scope="row">${category.title}</th><td>${stats.gradedCount}/${category.items.length}</td><td>${fmt(stats.earned)}</td><td>${fmt(stats.gradedMax)}</td><td>${fmt(stats.earnedCoursePoints)}</td><td>${category.weight}</td>`;
    document.querySelector("#breakdownBody").append(row);
    offered += stats.offeredCoursePoints;
    earned += stats.earnedCoursePoints;
    const card = document.querySelector(`[data-category="${category.id}"]`);
    card.querySelector(".category-score strong").textContent = stats.gradedAverage === null ? "—" : `${fmt(stats.gradedAverage,1)}%`;
    card.querySelector(".category-progress").textContent = stats.gradedCount ? `${stats.gradedCount} of ${category.items.length} grades entered` : "No grades entered";
    card.querySelector(".category-bonus").textContent = stats.bonus > 0 ? `${fmt(stats.bonus)} bonus points entered` : "";
  });
  const current = offered ? earned / offered * 100 : null;
  document.querySelector("#currentGrade").textContent = current === null ? "—" : `${fmt(current,1)}%`;
  document.querySelector("#earnedPoints").textContent = fmt(earned);
  document.querySelector("#offeredPoints").textContent = fmt(offered);
  document.querySelector("#neededPoints").textContent = fmt(Math.max(0, PASSING_GRADE-earned));
  document.querySelector("#remainingPoints").textContent = fmt(100-offered);
  document.querySelector("#progressBar").style.width = `${Math.min(100,offered)}%`;
  document.querySelector("#gradeSummary").textContent = current === null ? "Enter a grade above to begin." : `${fmt(earned)} of ${fmt(offered)} available course points earned.`;
  updateRequirements();
  saveState();
}

function setRequirement(id, status, text) {
  const card = document.querySelector(`#${id}Requirement`);
  card.classList.remove("good","warn");
  if (status) card.classList.add(status);
  card.querySelector(".status-icon").textContent = status === "good" ? "✓" : status === "warn" ? "!" : "○";
  document.querySelector(`#${id}RequirementText`).textContent = text;
}

function updateRequirements() {
  const labs = categoryStats(CATEGORIES.find(c=>c.id==="labs"));
  if (!labs.gradedCount) setRequirement("lab", "", "No lab grades entered yet.");
  else if (labs.earned / labs.gradedMax * 100 >= 50) setRequirement("lab","good",`Current lab average: ${fmt(Math.min(100,labs.earned/labs.gradedMax*100),1)}%.`);
  else setRequirement("lab","warn",`Current lab average: ${fmt(labs.earned/labs.gradedMax*100,1)}%. You need at least 50%.`);

  const projects = CATEGORIES.find(c=>c.id==="projects");
  let bonus = 0, deficit = 0, entered = 0;
  projects.items.forEach((item,index) => {
    const score = number(state[`projects-${index}`]);
    if (score === null) return;
    entered += 1;
    bonus += Math.max(0,score-item[1]);
    deficit += Math.max(0,item[1]*.5-score);
  });
  if (!entered) setRequirement("project","","No project grades entered yet.");
  else if (bonus >= deficit) {
    const pending = projects.items.length-entered;
    setRequirement("project","good", pending ? `Entered PAs meet the minimum after bonus points. ${pending} PA${pending===1?"":"s"} pending.` : "All PAs meet the 50% minimum after bonus points.");
  } else setRequirement("project","warn",`You need ${fmt(deficit-bonus)} more bonus point${Math.abs(deficit-bonus-1)<.001?"":"s"} to cover the current PA deficit.`);
}

function showFinalCalculation() {
  const finalCategory = CATEGORIES.find(c=>c.id==="final");
  const finalKey = "final-0";
  const previous = state[finalKey];
  delete state[finalKey];
  const nonFinalEarned = CATEGORIES.filter(c=>c.id!=="final").reduce((sum,c)=>sum+categoryStats(c).earnedCoursePoints,0);
  if (previous !== undefined) state[finalKey] = previous;
  const needed = (PASSING_GRADE - nonFinalEarned) / finalCategory.weight * 100;
  const result = document.querySelector("#finalResult");
  const note = document.querySelector("#finalNote");
  const otherPending = CATEGORIES.filter(c=>!["final"].includes(c.id)).some(c=>categoryStats(c).gradedCount<c.items.length);
  if (needed <= 0) result.innerHTML = `<strong>0%</strong><span>You already have enough course points for 70%.</span>`;
  else if (needed > 100) result.innerHTML = `<strong>More than 100%</strong><span>You currently need ${fmt(needed,1)}% on the final to reach 70%.</span>`;
  else result.innerHTML = `<strong>${fmt(needed,1)}%</strong><span>Minimum final exam grade to reach 70% overall.</span>`;
  note.textContent = `${otherPending ? "This uses the grades currently entered and assumes no additional points from other blank work. " : ""}The lab and PA requirements must also be satisfied to pass the course.`;
  document.querySelector("#finalDialog").showModal();
}

categoryList.addEventListener("input", event => {
  if (!event.target.matches(".points-input")) return;
  const value = event.target.value;
  if (value === "") delete state[event.target.dataset.key];
  else if (number(value) !== null) state[event.target.dataset.key] = value;
  update();
});
document.querySelector("#finalButton").addEventListener("click", showFinalCalculation);
document.querySelector("#resetButton").addEventListener("click", () => {
  if (!confirm("Clear every grade saved in this browser?")) return;
  Object.keys(state).forEach(key=>delete state[key]);
  document.querySelectorAll(".points-input").forEach(input=>input.value="");
  update();
});

function registerWebMCP() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const controller = new AbortController();
  try {
    void Promise.resolve(context.registerTool({
      name: "set_course_grades",
      title: "Set course grades",
      description: "Enter or replace multiple grade values in the visible course grade calculator.",
      inputSchema: { type:"object", properties:{ grades:{ type:"object", additionalProperties:{ type:"number", minimum:0 }, description:"Grade map using keys such as exams-0, projects-1, labs-3, quizzes-2, final-0, or attendance-0." } }, required:["grades"], additionalProperties:false },
      annotations:{ readOnlyHint:false, untrustedContentHint:false },
      execute(input) {
        if (!input || typeof input.grades !== "object" || Array.isArray(input.grades)) throw new Error("A grades object is required.");
        const validKeys = new Set(CATEGORIES.flatMap(c=>c.items.map((_,i)=>`${c.id}-${i}`)));
        for (const [key,value] of Object.entries(input.grades)) {
          if (!validKeys.has(key) || typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`Invalid grade entry: ${key}`);
        }
        Object.entries(input.grades).forEach(([key,value])=>{ state[key]=String(value); const inputEl=document.querySelector(`[data-key="${key}"]`); if(inputEl) inputEl.value=String(value); });
        update();
        return { updated:Object.keys(input.grades).length, currentGrade:document.querySelector("#currentGrade").textContent };
      }
    }, {signal:controller.signal})).catch(()=>{});
  } catch {}
}

renderCategories();
update();
registerWebMCP();
