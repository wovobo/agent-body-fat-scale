const users = ["Wang", "Alex", "Guest"];

const measurementData = {
  weight: "68.4 kg",
  fat: "18.7%",
  muscle: "32.8 kg",
  water: "58%",
  confidence: "96%",
  trend: "体重 -0.4kg，体脂 -0.3%，骨骼肌 +0.1kg，水分 -1.2%",
};

const courses = [
  ["Z2 有氧", "45 分钟", "稳定减脂，不追加间歇"],
  ["下肢力量", "20 分钟", "减脂期保留腿部肌肉"],
  ["补水恢复", "10 分钟", "补水、电解质和拉伸"],
];

const replies = [
  {
    keys: ["练", "训练", "今天", "运动"],
    title: "TODAY",
    body: "45 分钟 Z2 有氧。水分偏低，不建议追加高强度间歇。",
  },
  {
    keys: ["水", "补水", "喝", "恢复"],
    title: "HYDRATE",
    body: "2 小时内分次补水 500-700ml，并补一点电解质。",
  },
  {
    keys: ["课程", "计划", "课"],
    title: "COURSE",
    body: "返回 3 节课程：Z2 有氧、下肢力量维护、补水恢复。",
    courses: true,
  },
  {
    keys: ["长跑", "比赛", "马拉松", "明天"],
    title: "LONG RUN",
    body: "今晚不要加力量课。轻松拉伸、补水、保证碳水，明早只看体重趋势。",
  },
];

const el = {
  scaleVisual: document.getElementById("scaleVisual"),
  screenMode: document.getElementById("screenMode"),
  screenSignal: document.getElementById("screenSignal"),
  screenContent: document.getElementById("screenContent"),
  weightReadout: document.getElementById("weightReadout"),
  scaleLabel: document.getElementById("scaleLabel"),
  flowTitle: document.getElementById("flowTitle"),
  progressLabel: document.getElementById("progressLabel"),
  progressValue: document.getElementById("progressValue"),
  progressBar: document.getElementById("progressBar"),
  userMatch: document.getElementById("userMatch"),
  switchUser: document.getElementById("switchUser"),
  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),
};

const timers = [];
let measurementMode = "idle";
let measurementComplete = false;
let selectedUserIndex = 0;

function schedule(fn, delay) {
  const timer = window.setTimeout(fn, delay);
  timers.push(timer);
}

function clearTimers() {
  while (timers.length) window.clearTimeout(timers.pop());
}

function setScreen({ mode, signal = "86%", kicker, main, sub, details = "" }) {
  el.screenMode.textContent = mode;
  el.screenSignal.textContent = signal;
  el.screenContent.innerHTML = `
    <div class="screen-kicker">${kicker}</div>
    <div class="screen-main">${main}</div>
    <div class="screen-sub">${sub}</div>
    ${details ? `<div class="screen-details">${details}</div>` : ""}
  `;
}

function setProgress(value, label) {
  el.progressBar.style.width = `${value}%`;
  el.progressValue.textContent = `${value}%`;
  el.progressLabel.textContent = label;
}

function setStep(step) {
  document.querySelectorAll("[data-step]").forEach((item) => {
    item.classList.toggle("active", item.dataset.step === step);
  });
}

function setMetrics({ weight = "--", fat = "--", muscle = "--", water = "--" }) {
  document.getElementById("metricWeight").textContent = weight;
  document.getElementById("metricFat").textContent = fat;
  document.getElementById("metricMuscle").textContent = muscle;
  document.getElementById("metricWater").textContent = water;
}

function resetDemo() {
  clearTimers();
  measurementMode = "idle";
  measurementComplete = false;
  selectedUserIndex = 0;
  el.scaleVisual.className = "scale-visual";
  el.weightReadout.textContent = "--.- kg";
  el.scaleLabel.textContent = "8 electrodes · tri-frequency BIA";
  el.flowTitle.textContent = "待机";
  el.userMatch.textContent = "未测量";
  el.switchUser.disabled = true;
  setStep("wake");
  setProgress(0, "等待开始");
  setMetrics({});
  setScreen({
    mode: "READY",
    kicker: "SUUNTO BODY",
    main: "READY",
    sub: "站上设备开始测量",
  });
}

function identifyUser(mode) {
  selectedUserIndex = mode === "weight" ? 2 : 0;
  el.userMatch.textContent = users[selectedUserIndex];
  el.switchUser.disabled = false;
}

function completeBodyMeasurement() {
  measurementComplete = true;
  measurementMode = "body";
  el.scaleVisual.classList.remove("measuring");
  identifyUser("body");
  setStep("result");
  setProgress(100, "完整体脂测量完成，已自动识别用户");
  el.flowTitle.textContent = "完整体脂测量完成";
  setMetrics(measurementData);
  setScreen({
    mode: "RESULT",
    signal: "synced",
    kicker: `USER ${users[selectedUserIndex]} · CONF ${measurementData.confidence}`,
    main: `${measurementData.weight}<br><span>${measurementData.fat} FAT</span>`,
    sub: "AI 趋势分析已生成",
    details: `
      <div><strong>肌肉</strong><span>${measurementData.muscle}</span></div>
      <div><strong>水分</strong><span>${measurementData.water}</span></div>
      <p>${measurementData.trend}</p>
      <p class="advice">体重下降主要来自水分波动。今天建议 Z2 有氧，不追加高强度间歇。</p>
    `,
  });
}

function startBodyMeasurement() {
  resetDemo();
  measurementMode = "body";
  el.scaleVisual.classList.add("awake");
  el.weightReadout.textContent = measurementData.weight;
  el.flowTitle.textContent = "检测到用户上秤";
  setProgress(8, "设备唤醒，准备完整体脂测量");
  setScreen({
    mode: "WAKE",
    kicker: "BODY MEASURE",
    main: measurementData.weight,
    sub: "请拉出上肢杆",
  });

  schedule(() => {
    setStep("contact");
    setProgress(24, "脚部接触 OK，等待手部电极");
    setScreen({
      mode: "CONTACT",
      kicker: "ELECTRODES",
      main: "3 / 4 OK",
      sub: "右手接触不足，请握稳",
      details: '<div class="contact-dots"><span class="ok"></span><span class="warn"></span><span class="ok"></span><span class="ok"></span></div>',
    });
  }, 900);

  schedule(() => {
    setProgress(38, "四点接触质量合格");
    setScreen({
      mode: "CONTACT",
      kicker: "ELECTRODES",
      main: "4 / 4 OK",
      sub: "开始三频 BIA 扫描",
      details: '<div class="contact-dots"><span class="ok"></span><span class="ok"></span><span class="ok"></span><span class="ok"></span></div>',
    });
  }, 2100);

  schedule(() => {
    setStep("scan");
    el.scaleVisual.classList.add("measuring");
    el.flowTitle.textContent = "完整体脂测量中";
    setProgress(48, "三频 × 五节段阻抗采集中");
    setScreen({
      mode: "SCAN",
      kicker: "BIA SCAN",
      main: "00:28",
      sub: "5kHz / 50kHz / 200kHz",
    });
  }, 3100);

  [
    [60, "左臂和右臂路径", "00:20"],
    [72, "躯干路径", "00:14"],
    [84, "左右腿均衡", "00:08"],
    [94, "生成趋势分析和建议", "00:03"],
  ].forEach(([value, label, time], index) => {
    schedule(() => {
      setProgress(value, label);
      setScreen({
        mode: "SCAN",
        kicker: "BIA SCAN",
        main: time,
        sub: label,
      });
    }, 4200 + index * 850);
  });

  schedule(completeBodyMeasurement, 8000);
}

function startWeightOnly() {
  resetDemo();
  measurementMode = "weight";
  measurementComplete = true;
  el.scaleVisual.classList.add("awake");
  el.weightReadout.textContent = measurementData.weight;
  el.scaleLabel.textContent = "weight-only mode · no BIA";
  identifyUser("weight");
  setStep("result");
  setProgress(100, "普通称重完成，速度更快，仅记录体重");
  el.flowTitle.textContent = "普通称重完成";
  setMetrics({ weight: measurementData.weight });
  setScreen({
    mode: "WEIGHT",
    signal: "saved",
    kicker: `USER ${users[selectedUserIndex]}`,
    main: measurementData.weight,
    sub: "仅体重数据，无 AI 建议",
    details: "<p>未拉出上肢杆，系统跳过 BIA。不会生成体脂、肌肉、水分和训练建议。</p>",
  });
}

function renderCoachReply(reply) {
  setStep("coach");
  if (reply.courses) {
    setScreen({
      mode: "COURSE",
      signal: "AI",
      kicker: "TRAINING PLAN",
      main: "3 COURSES",
      sub: "根据体脂趋势和水分状态返回",
      details: courses
        .map(
          ([name, duration, text]) => `
            <div class="course-line">
              <strong>${name}</strong>
              <span>${duration}</span>
              <em>${text}</em>
            </div>
          `,
        )
        .join(""),
    });
    return;
  }

  setScreen({
    mode: "AI",
    signal: "coach",
    kicker: reply.title,
    main: "ADVICE",
    sub: reply.body,
  });
}

function answerQuestion(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;

  if (!measurementComplete) {
    setScreen({
      mode: "WAIT",
      kicker: "AI COACH",
      main: "NO DATA",
      sub: "请先完成一次完整体脂测量",
    });
    return;
  }

  if (measurementMode === "weight") {
    setScreen({
      mode: "WEIGHT",
      kicker: "NO AI",
      main: "WEIGHT ONLY",
      sub: "普通称重只有体重数据，不生成建议",
    });
    return;
  }

  const reply =
    replies.find((item) => item.keys.some((key) => cleanQuestion.includes(key))) ||
    {
      title: "TREND",
      body: "建议先保持低强度训练，观察 7 天体重和水分趋势，再根据骨骼肌变化调整力量课。",
    };
  renderCoachReply(reply);
}

document.getElementById("startMeasure").addEventListener("click", startBodyMeasurement);
document.getElementById("weightOnly").addEventListener("click", startWeightOnly);
document.getElementById("resetDemo").addEventListener("click", resetDemo);
document.getElementById("switchUser").addEventListener("click", () => {
  if (!measurementComplete) return;
  selectedUserIndex = (selectedUserIndex + 1) % users.length;
  el.userMatch.textContent = users[selectedUserIndex];
  setScreen({
    mode: "USER",
    signal: "edited",
    kicker: "USER MATCH",
    main: users[selectedUserIndex],
    sub: "已手动更正本次测量归属",
  });
});

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => answerQuestion(button.dataset.question));
});

el.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  answerQuestion(el.chatInput.value);
  el.chatInput.value = "";
});

resetDemo();
