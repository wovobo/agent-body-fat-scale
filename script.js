const users = ["Wang", "Alex", "Chen"];

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
    main: "45 分钟 Z2 有氧",
    sub: "水分偏低，不建议追加高强度间歇。",
  },
  {
    keys: ["水", "补水", "喝", "恢复"],
    title: "HYDRATE",
    main: "补水 500-700ml",
    sub: "2 小时内分次完成，并补一点电解质。",
  },
  {
    keys: ["课程", "计划", "课"],
    title: "COURSE",
    main: "3 节课程",
    sub: "Z2 有氧、下肢力量维护、补水恢复。",
    courses: true,
  },
  {
    keys: ["长跑", "比赛", "马拉松", "明天"],
    title: "LONG RUN",
    main: "今晚不加力量课",
    sub: "轻松拉伸、补水、保证碳水，明早只看体重趋势。",
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
  el.screenContent.dataset.mode = mode.toLowerCase();
  el.screenContent.innerHTML = `
    <div class="screen-kicker">${kicker}</div>
    <div class="screen-main">${main}</div>
    <div class="screen-sub">${sub}</div>
    ${details ? `<div class="screen-details">${details}</div>` : ""}
  `;
}

function metricDetails(items) {
  return `
    <div class="mini-metrics">
      ${items
        .map(
          ([label, value]) => `
            <div>
              <strong>${label}</strong>
              <span>${value}</span>
            </div>
          `,
        )
        .join("")}
    </div>
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
    kicker: `已识别 ${users[selectedUserIndex]} · 置信度 ${measurementData.confidence}`,
    main: measurementData.weight,
    sub: "体重下降主要来自水分波动。今天建议 Z2 有氧，不追加高强度间歇。",
    details: metricDetails([
      ["体脂", measurementData.fat],
      ["骨骼肌", measurementData.muscle],
      ["水分", measurementData.water],
      ["趋势", "-0.4kg / 7天"],
    ]),
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
    sub: "请拉出上肢杆，完整体脂测量约 30 秒。",
  });

  schedule(() => {
    setStep("contact");
    setProgress(24, "脚部接触 OK，等待手部电极");
    setScreen({
      mode: "CONTACT",
      kicker: "ELECTRODES",
      main: "3/4",
      sub: "右手接触不足，请握稳",
      details: '<div class="contact-dots"><span class="ok"></span><span class="warn"></span><span class="ok"></span><span class="ok"></span></div>',
    });
  }, 900);

  schedule(() => {
    setProgress(38, "四点接触质量合格");
    setScreen({
      mode: "CONTACT",
      kicker: "ELECTRODES",
      main: "4/4",
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
    kicker: `已识别 ${users[selectedUserIndex]}`,
    main: measurementData.weight,
    sub: "普通称重已保存。仅体重数据，无 AI 建议。",
    details: metricDetails([
      ["模式", "Weight only"],
      ["速度", "快速"],
      ["BIA", "跳过"],
      ["建议", "不生成"],
    ]),
  });
}

function renderCoachReply(reply) {
  setStep("coach");
  if (reply.courses) {
    setScreen({
      mode: "COURSE",
      signal: "AI",
      kicker: "AI 课程建议",
      main: "课程建议",
      sub: "基于体脂趋势与水分状态",
      details: courses
        .map(
          ([name, duration, text]) => `
            <div class="course-line">
              <strong>${name}</strong>
              <span>${duration} · ${text}</span>
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
    kicker: `AI 建议 · ${reply.title}`,
    main: reply.main || "低强度优先",
    sub: reply.sub || reply.body,
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
      main: "先稳住低强度",
      sub: "观察 7 天体重和水分趋势，再根据骨骼肌变化调整力量课。",
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
    kicker: "用户归属已更正",
    main: users[selectedUserIndex],
    sub: "本次测量将归入新的家庭成员档案",
  });
});

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => answerQuestion(button.dataset.question));
});

resetDemo();
