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
  stepList: document.querySelector(".step-list"),
};

const timers = [];
let measurementMode = "idle";
let measurementComplete = false;
let selectedUserIndex = 0;

const screenFlows = {
  body: [
    ["wake", "上秤"],
    ["contact", "接触"],
    ["scan", "测量"],
    ["result", "建议"],
  ],
  weight: [
    ["wake", "上秤"],
    ["identify", "识别"],
    ["saved", "保存"],
  ],
};

const demoStepFlows = {
  body: [
    ["wake", "1 上秤"],
    ["contact", "2 接触"],
    ["scan", "3 测量"],
    ["result", "4 结果"],
    ["coach", "5 追问"],
  ],
  weight: [
    ["wake", "1 上秤"],
    ["identify", "2 识别"],
    ["saved", "3 保存"],
  ],
};

function schedule(fn, delay) {
  const timer = window.setTimeout(fn, delay);
  timers.push(timer);
}

function clearTimers() {
  while (timers.length) window.clearTimeout(timers.pop());
}

function phaseRail(activeStage, flow = "body") {
  const stages = screenFlows[flow] || screenFlows.body;
  const activeIndex = Math.max(
    0,
    stages.findIndex(([stage]) => stage === activeStage),
  );
  return `
    <div class="screen-rail ${flow === "weight" ? "weight-flow" : ""}" aria-label="屏幕测量阶段">
      ${stages
        .map(([stage, label], index) => {
          const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "";
          return `<span class="${state}">${label}</span>`;
        })
        .join("")}
    </div>
  `;
}

function motionDetails(visual) {
  if (visual === "contactWarn") {
    return `
      <div class="contact-panel">
        <span class="ok">脚</span>
        <span class="ok">左手</span>
        <span class="warn">右手</span>
        <span class="ok">站稳</span>
      </div>
    `;
  }

  if (visual === "contactOk") {
    return `
      <div class="contact-panel">
        <span class="ok">脚</span>
        <span class="ok">左手</span>
        <span class="ok">右手</span>
        <span class="ok">站稳</span>
      </div>
    `;
  }

  if (visual === "scan") {
    return `
      <div class="scan-panel">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
  }

  return "";
}

function setScreen({
  mode,
  signal = "86%",
  kicker,
  main,
  sub,
  details = "",
  stage = "wake",
  visual = "idle",
  flow = "body",
}) {
  el.screenMode.textContent = mode;
  el.screenSignal.textContent = signal;
  el.screenContent.dataset.mode = mode.toLowerCase();
  el.screenContent.dataset.visual = visual;
  el.screenContent.classList.remove("screen-updated");
  el.screenContent.innerHTML = `
    <div class="screen-kicker">${kicker}</div>
    <div class="screen-main">${main}</div>
    <div class="screen-sub">${sub}</div>
    <div class="screen-motion">${details || motionDetails(visual)}</div>
    ${phaseRail(stage, flow)}
  `;
  window.requestAnimationFrame(() => el.screenContent.classList.add("screen-updated"));
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

function setStepDisplay(flow = "body") {
  const steps = demoStepFlows[flow] || demoStepFlows.body;
  el.stepList.classList.toggle("weight-list", flow === "weight");
  el.stepList.querySelectorAll("span").forEach((item, index) => {
    const step = steps[index];
    item.hidden = !step;
    if (!step) return;
    item.dataset.step = step[0];
    item.textContent = step[1];
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
  setStepDisplay("body");
  setStep("wake");
  setProgress(0, "等待开始");
  setMetrics({});
  setScreen({
    mode: "READY",
    kicker: "SUUNTO BODY",
    signal: "stand by",
    kicker: "待机",
    main: "请上秤",
    sub: "脚部接触后自动识别用户",
    stage: "wake",
    visual: "idle",
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
    signal: users[selectedUserIndex],
    kicker: "AI 趋势建议",
    main: "今天做 Z2 有氧",
    sub: "水分偏低，暂不追加高强度间歇。",
    stage: "result",
    flow: "body",
    visual: "result",
    details: metricDetails([
      ["体重", measurementData.weight],
      ["体脂", measurementData.fat],
      ["水分", measurementData.water],
      ["趋势", "-0.4kg"],
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
    signal: "live",
    kicker: "1 上秤",
    main: measurementData.weight,
    sub: "体重已稳定，准备检查电极接触。",
    stage: "wake",
    visual: "weight",
  });

  schedule(() => {
    setStep("contact");
    el.scaleVisual.classList.add("contacting");
    setProgress(24, "脚部接触 OK，等待手部电极");
    setScreen({
      mode: "CONTACT",
      signal: "3/4",
      kicker: "2 接触检测",
      main: "握稳右手",
      sub: "右手电极接触不足，保持站稳。",
      stage: "contact",
      visual: "contactWarn",
    });
  }, 900);

  schedule(() => {
    setProgress(38, "四点接触质量合格");
    setScreen({
      mode: "CONTACT",
      signal: "4/4",
      kicker: "2 接触检测",
      main: "接触良好",
      sub: "脚部与手部电极已连接。",
      stage: "contact",
      visual: "contactOk",
    });
  }, 2100);

  schedule(() => {
    setStep("scan");
    el.scaleVisual.classList.remove("contacting");
    el.scaleVisual.classList.add("measuring");
    el.flowTitle.textContent = "完整体脂测量中";
    setProgress(48, "三频 × 五节段阻抗采集中");
    setScreen({
      mode: "SCAN",
      signal: "48%",
      kicker: "3 BIA 测量中",
      main: "00:28",
      sub: "三频电流正在采集身体阻抗。",
      stage: "scan",
      visual: "scan",
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
        signal: `${value}%`,
        kicker: "3 BIA 测量中",
        main: time,
        sub: label,
        stage: "scan",
        visual: "scan",
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
  setStepDisplay("weight");
  setStep("saved");
  setProgress(100, "普通称重完成，速度更快，仅记录体重");
  el.flowTitle.textContent = "普通称重完成";
  setMetrics({ weight: measurementData.weight });
  setScreen({
    mode: "WEIGHT",
    signal: "saved",
    kicker: "普通称重完成",
    main: measurementData.weight,
    sub: `已识别 ${users[selectedUserIndex]}，仅保存体重。`,
    stage: "saved",
    flow: "weight",
    visual: "result",
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
      kicker: "AI 课程",
      main: "Z2 有氧 45'",
      sub: "随后做 20' 下肢力量和 10' 补水恢复。",
      stage: "result",
      flow: "body",
      visual: "result",
      details: metricDetails(courses.map(([name, duration]) => [name, duration])),
    });
    return;
  }

  setScreen({
    mode: "AI",
    signal: "coach",
    kicker: `AI 建议 · ${reply.title}`,
    main: reply.main || "低强度优先",
    sub: reply.sub || reply.body,
    stage: "result",
    flow: "body",
    visual: "result",
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
      stage: "wake",
      visual: "idle",
    });
    return;
  }

  if (measurementMode === "weight") {
    setScreen({
      mode: "WEIGHT",
      kicker: "NO AI",
      main: "WEIGHT ONLY",
      sub: "普通称重只有体重数据，不生成建议",
      stage: "saved",
      flow: "weight",
      visual: "result",
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
    stage: measurementMode === "weight" ? "saved" : "result",
    flow: measurementMode === "weight" ? "weight" : "body",
    visual: "result",
  });
});

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => answerQuestion(button.dataset.question));
});

resetDemo();
