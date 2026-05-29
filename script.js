const measurementData = {
  weight: "68.4 kg",
  fat: "18.7%",
  muscle: "32.8 kg",
  water: "58%",
  confidence: "96%",
  deltas: {
    weight: "-0.4 kg vs last",
    fat: "-0.3% vs last",
    muscle: "+0.1 kg vs last",
    water: "-1.2% vs last",
  },
  contacts: {
    leftHand: "96%",
    rightHand: "94%",
    leftFoot: "98%",
    rightFoot: "97%",
  },
};

const coursePlan = [
  {
    label: "Z2 有氧",
    title: "45 分钟轻松跑或骑行",
    meta: "强度：Zone 2 · 目标：稳定减脂",
    text: "水分率偏低时不追加间歇，用低强度训练维持有氧刺激。",
  },
  {
    label: "力量维护",
    title: "20 分钟下肢力量",
    meta: "强度：中等 · 目标：减脂保肌",
    text: "加入深蹲、臀桥和提踵，避免跑量上升时腿部肌肉下降。",
  },
  {
    label: "恢复流程",
    title: "10 分钟补水与拉伸",
    meta: "强度：低 · 目标：恢复",
    text: "先补充 500ml 水和电解质，再完成小腿、髋屈肌和背部放松。",
  },
];

const replies = [
  {
    keys: ["练", "训练", "今天", "运动"],
    text: "今天建议 45 分钟 Z2 有氧，不做高强度间歇。原因是体脂趋势下降稳定，但水分率较上次低 1.2%，先稳住恢复质量。",
  },
  {
    keys: ["水", "补水", "喝", "恢复"],
    text: "建议 2 小时内分次补水 500-700ml，并补一点电解质。今天的体重下降更像水分波动，不建议把它当成真实减脂成果。",
  },
  {
    keys: ["课程", "计划", "课"],
    text: "我已经生成 3 个课程卡：Z2 有氧、下肢力量维护和补水恢复流程。它们会优先服务减脂保肌，而不是单纯追求体重下降。",
    courses: true,
  },
  {
    keys: ["长跑", "比赛", "马拉松", "明天"],
    text: "如果明天有长跑，今晚不要再加力量课。建议轻松拉伸、补水和保证碳水摄入，明早只看体重趋势，不用被单次体脂波动影响。",
  },
];

const el = {
  scaleVisual: document.getElementById("scaleVisual"),
  screenMode: document.getElementById("screenMode"),
  screenSignal: document.getElementById("screenSignal"),
  screenMain: document.getElementById("screenMain"),
  screenSub: document.getElementById("screenSub"),
  weightReadout: document.getElementById("weightReadout"),
  flowTitle: document.getElementById("flowTitle"),
  flowPill: document.getElementById("flowPill"),
  progressLabel: document.getElementById("progressLabel"),
  progressValue: document.getElementById("progressValue"),
  progressBar: document.getElementById("progressBar"),
  chatLog: document.getElementById("chatLog"),
  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),
  courseGrid: document.getElementById("courseGrid"),
};

const timers = [];
let measurementComplete = false;

function schedule(fn, delay) {
  const timer = window.setTimeout(fn, delay);
  timers.push(timer);
}

function clearTimers() {
  while (timers.length) {
    window.clearTimeout(timers.pop());
  }
}

function setProgress(value, label) {
  el.progressBar.style.width = `${value}%`;
  el.progressValue.textContent = `${value}%`;
  el.progressLabel.textContent = label;
}

function setScreen(mode, main, sub, signal = "86%") {
  el.screenMode.textContent = mode;
  el.screenMain.innerHTML = main;
  el.screenSub.textContent = sub;
  el.screenSignal.textContent = signal;
}

function setFlow(title, pill) {
  el.flowTitle.textContent = title;
  el.flowPill.textContent = pill;
}

function updateContact(id, value, status = "good") {
  const valueEl = document.getElementById(id);
  const card = document.querySelector(`[data-contact="${id}"]`);
  valueEl.textContent = value;
  card.classList.remove("good", "bad");
  card.classList.add(status);
}

function resetDemo() {
  clearTimers();
  measurementComplete = false;
  el.scaleVisual.className = "scale-visual";
  setScreen("READY", "SUUNTO<br />BODY", "step on to wake");
  setFlow("待机，等待上秤", "Sleep");
  setProgress(0, "准备开始");
  el.weightReadout.textContent = "--.- kg";
  ["leftHand", "rightHand", "leftFoot", "rightFoot"].forEach((id) => {
    const card = document.querySelector(`[data-contact="${id}"]`);
    document.getElementById(id).textContent = "--";
    card.classList.remove("good", "bad");
  });
  updateMetrics("--", "--", "--", "--");
  el.chatLog.innerHTML = '<div class="message coach">完成测量后，我会根据体成分、测量质量和训练目标给出建议。</div>';
  el.courseGrid.innerHTML = `
    <article class="course-card muted">
      <span>等待测量</span>
      <h3>AI 教练课程尚未生成</h3>
      <p>完整测量或追问课程后，将显示有氧、力量和恢复建议。</p>
    </article>
  `;
}

function updateMetrics(weight, fat, muscle, water) {
  document.getElementById("metricWeight").textContent = weight;
  document.getElementById("metricFat").textContent = fat;
  document.getElementById("metricMuscle").textContent = muscle;
  document.getElementById("metricWater").textContent = water;
  document.getElementById("deltaWeight").textContent = weight === "--" ? "--" : measurementData.deltas.weight;
  document.getElementById("deltaFat").textContent = fat === "--" ? "--" : measurementData.deltas.fat;
  document.getElementById("deltaMuscle").textContent = muscle === "--" ? "--" : measurementData.deltas.muscle;
  document.getElementById("deltaWater").textContent = water === "--" ? "--" : measurementData.deltas.water;
}

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.textContent = text;
  el.chatLog.appendChild(message);
  el.chatLog.scrollTop = el.chatLog.scrollHeight;
}

function renderCourses() {
  el.courseGrid.innerHTML = coursePlan
    .map(
      (course) => `
        <article class="course-card">
          <span>${course.label}</span>
          <h3>${course.title}</h3>
          <p><strong>${course.meta}</strong></p>
          <p>${course.text}</p>
        </article>
      `,
    )
    .join("");
}

function completeMeasurement() {
  measurementComplete = true;
  el.scaleVisual.classList.remove("measuring");
  setFlow("测量完成，已匹配用户：Wang", "Complete");
  setProgress(100, "三频 × 五节段采集完成");
  setScreen("COMPLETE", "68.4kg<br />18.7%", `confidence ${measurementData.confidence}`, "synced");
  updateMetrics(measurementData.weight, measurementData.fat, measurementData.muscle, measurementData.water);
  addMessage(
    "coach",
    "体重下降主要来自水分波动，体脂趋势稳定下降。今天建议保持 Z2 有氧，不要追加高强度间歇。",
  );
  renderCourses();
}

function startMeasurement() {
  resetDemo();
  el.scaleVisual.classList.add("awake");
  setFlow("检测到用户站上设备", "Wake");
  setScreen("WAKE", "68.4kg", "pull handle");
  el.weightReadout.textContent = "68.4 kg";
  setProgress(12, "检测到体重，准备完整测量");
  updateContact("leftFoot", "98%");
  updateContact("rightFoot", "97%");

  schedule(() => {
    setFlow("请拉出上肢杆并握住电极", "Contact");
    setScreen("CONTACT", "HOLD<br />BAR", "hands on electrodes");
    setProgress(24, "等待手部接触");
  }, 850);

  schedule(() => {
    updateContact("leftHand", measurementData.contacts.leftHand);
    updateContact("rightHand", "42%", "bad");
    setFlow("右手接触不足，正在提示用户调整", "Retry");
    setScreen("ADJUST", "RIGHT<br />HAND", "contact low");
    setProgress(30, "右手接触不足");
  }, 1700);

  schedule(() => {
    updateContact("rightHand", measurementData.contacts.rightHand);
    setFlow("接触质量合格，开始 BIA 测量", "Scan");
    setScreen("SCAN", "BIA<br />00:28", "5kHz / 50kHz / 200kHz");
    el.scaleVisual.classList.add("measuring");
    setProgress(42, "三频阻抗采集中");
  }, 2800);

  [52, 64, 76, 88].forEach((value, index) => {
    const labels = ["左臂路径", "躯干路径", "左右腿均衡", "训练建议生成中"];
    schedule(() => {
      setProgress(value, labels[index]);
      setScreen("SCAN", `BIA<br />${String(21 - index * 5).padStart(2, "0")}s`, labels[index]);
    }, 3800 + index * 900);
  });

  schedule(completeMeasurement, 7600);
}

function weightOnlyMode() {
  resetDemo();
  el.scaleVisual.classList.add("awake");
  measurementComplete = true;
  setFlow("普通称重模式，仅记录体重趋势", "Weight");
  setScreen("WEIGHT", "68.4kg", "BIA skipped");
  el.weightReadout.textContent = "68.4 kg";
  setProgress(100, "未拉出上肢杆，跳过 BIA");
  updateContact("leftFoot", "98%");
  updateContact("rightFoot", "97%");
  updateMetrics("68.4 kg", "--", "--", "--");
  addMessage("coach", "普通称重不会触发 AI 训练建议。数据仅用于体重和 BMI 趋势记录。");
}

function babyMode() {
  resetDemo();
  el.scaleVisual.classList.add("awake");
  measurementComplete = true;
  setFlow("抱婴模式：两次称重差值", "Baby");
  setScreen("BABY", "6.4kg", "adult 68.4 / total 74.8");
  el.weightReadout.textContent = "6.4 kg";
  setProgress(100, "成人体重 68.4kg，抱婴后 74.8kg");
  updateContact("leftFoot", "OK");
  updateContact("rightFoot", "OK");
  updateMetrics("婴儿 6.4 kg", "--", "--", "--");
  addMessage("coach", "抱婴模式只保存婴儿体重，不输出体脂、肌肉、水分或训练建议。");
}

function answerQuestion(question) {
  if (!question.trim()) return;
  addMessage("user", question);

  if (!measurementComplete) {
    addMessage("coach", "请先完成一次测量。完整 BIA 数据生成后，我才能返回训练、补水和课程建议。");
    return;
  }

  const matched = replies.find((reply) => reply.keys.some((key) => question.includes(key)));
  if (matched) {
    addMessage("coach", matched.text);
    if (matched.courses) renderCourses();
    return;
  }

  addMessage(
    "coach",
    "我会把这次问题理解为训练决策请求：先保持低强度训练，观察 7 天体重和水分趋势，再根据骨骼肌变化调整力量课。",
  );
}

document.getElementById("startMeasure").addEventListener("click", startMeasurement);
document.getElementById("weightOnly").addEventListener("click", weightOnlyMode);
document.getElementById("babyMode").addEventListener("click", babyMode);
document.getElementById("resetDemo").addEventListener("click", resetDemo);

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => answerQuestion(button.dataset.question));
});

el.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  answerQuestion(el.chatInput.value);
  el.chatInput.value = "";
});

resetDemo();
