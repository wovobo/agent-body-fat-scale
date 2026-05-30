const profiles = [
  {
    name: "Wang",
    weightHistory: [69.3, 69.1, 68.9, 68.8, 68.4],
    fatHistory: [19.4, 19.2, 19.1, 18.9, 18.7],
    coachNote: "水分偏低，今天做 Z2 有氧，不追加高强度间歇。",
  },
  {
    name: "Alex",
    weightHistory: [72.4, 72.1, 72.5, 72.0, 71.8],
    fatHistory: [21.0, 20.8, 20.9, 20.5, 20.3],
    coachNote: "趋势稳定，适合加入 20 分钟力量维护。",
  },
  {
    name: "Chen",
    weightHistory: [64.8, 65.0, 64.7, 64.9, 65.1],
    fatHistory: [17.8, 17.7, 17.9, 17.6, 17.5],
    coachNote: "体重小幅上行，先看睡眠和补水，不急着加量。",
  },
];

const users = profiles.map((profile) => profile.name);

const measurementData = {
  weight: "68.4 kg",
  weightValue: 68.4,
  fat: "18.7%",
  fatValue: 18.7,
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
    detail: "把配速控制在能完整说话的强度，结束后补 500ml 水。",
  },
  {
    keys: ["水", "补水", "喝", "恢复"],
    title: "HYDRATE",
    main: "补水 500-700ml",
    sub: "2 小时内分次完成，并补一点电解质。",
    detail: "如果今晚尿色偏深，睡前再补 150ml，不要一次喝太多。",
  },
  {
    keys: ["课程", "计划", "课"],
    title: "COURSE",
    main: "3 节课程",
    sub: "Z2 有氧、下肢力量维护、补水恢复。",
    detail: "课程按低冲击顺序排列，先有氧再力量，最后恢复。",
    courses: true,
  },
  {
    keys: ["长跑", "比赛", "马拉松", "明天"],
    title: "LONG RUN",
    main: "今晚不加力量课",
    sub: "轻松拉伸、补水、保证碳水，明早只看体重趋势。",
    detail: "长跑前不要用单次体脂波动调整计划，重点看体重和水分。",
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
let lockedMeasurement = null;
let aiThinking = false;
let aiTimer = null;

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
  if (aiTimer) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
}

function currentProfile() {
  return profiles[selectedUserIndex];
}

function mergeCurrentMeasurement(profile) {
  const weightHistory = [...profile.weightHistory.slice(0, -1), measurementData.weightValue];
  const fatHistory = [...profile.fatHistory.slice(0, -1), measurementData.fatValue];
  return { ...profile, weightHistory, fatHistory };
}

function sparkline(values, unit = "") {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = 8 + index * (84 / (values.length - 1));
      const y = 34 - ((value - min) / range) * 25;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return `
    <svg class="trend-line" viewBox="0 0 100 42" aria-hidden="true">
      <polyline points="${points}"></polyline>
      <circle cx="92" cy="${(34 - ((values.at(-1) - min) / range) * 25).toFixed(1)}" r="2.8"></circle>
    </svg>
    <span>${values.at(-1).toFixed(1)}${unit}</span>
  `;
}

function trendCards(profile) {
  const merged = mergeCurrentMeasurement(profile);
  return `
    <div class="trend-cards">
      <div>
        <strong>体重趋势</strong>
        ${sparkline(merged.weightHistory, "kg")}
      </div>
      <div>
        <strong>体脂趋势</strong>
        ${sparkline(merged.fatHistory, "%")}
      </div>
    </div>
  `;
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

function setSplitScreen({
  mode = "RESULT",
  signal,
  profile = currentProfile(),
  aiTitle = "AI 趋势建议",
  aiMain = profile.coachNote,
  aiSub = "基于本次测量和近期趋势",
  aiDetail = "",
  thinking = false,
  stage = "result",
  flow = "body",
}) {
  const isWeightOnly = lockedMeasurement?.mode === "weight" || measurementMode === "weight";
  const metricHtml = isWeightOnly
    ? `
        <span>本次仅体重</span>
        <span>体脂看历史曲线</span>
        <span>已保存归属</span>
      `
    : `
        <span>体脂 ${measurementData.fat}</span>
        <span>骨骼肌 ${measurementData.muscle}</span>
        <span>水分 ${measurementData.water}</span>
      `;
  el.screenMode.textContent = mode;
  el.screenSignal.textContent = signal || profile.name;
  el.screenContent.dataset.mode = mode.toLowerCase();
  el.screenContent.dataset.visual = thinking ? "thinking" : "split";
  el.screenContent.classList.remove("screen-updated");
  el.screenContent.innerHTML = `
    <div class="result-split">
      <section class="result-data">
        <p>本次数据 · ${profile.name}</p>
        <div class="result-weight">${measurementData.weight}</div>
        <div class="result-metrics">
          ${metricHtml}
        </div>
        ${trendCards(profile)}
      </section>
      <section class="result-ai ${thinking ? "thinking" : ""}">
        <p>${thinking ? `Hi ${profile.name}，AI 正在思考` : `Hi ${profile.name} · ${aiTitle}`}</p>
        ${
          thinking
            ? '<div class="thinking-dots"><span></span><span></span><span></span></div><strong>正在结合本次数据和历史曲线...</strong>'
            : `<strong>${aiMain}</strong><span>${aiSub}</span>${aiDetail ? `<em>${aiDetail}</em>` : ""}`
        }
      </section>
    </div>
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

function guideDetails(items, activeIndex) {
  return `
    <div class="guide-panel">
      ${items
        .map(
          (item, index) => `
            <span class="${index < activeIndex ? "done" : index === activeIndex ? "active" : ""}">
              ${item}
            </span>
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
  lockedMeasurement = null;
  aiThinking = false;
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
  lockedMeasurement = { ...measurementData, mode: "body" };
  el.scaleVisual.classList.remove("measuring");
  identifyUser("body");
  setStep("result");
  setProgress(100, "完整体脂测量完成，已自动识别用户");
  el.flowTitle.textContent = "完整体脂测量完成";
  setMetrics(measurementData);
  setSplitScreen({
    mode: "RESULT",
    signal: users[selectedUserIndex],
    profile: currentProfile(),
    aiTitle: "AI 趋势建议",
    aiMain: "今天做 Z2 有氧",
    aiSub: "水分偏低，暂不追加高强度间歇。",
    aiDetail: "体重下降主要来自水分波动，先稳住低强度。",
    stage: "result",
    flow: "body",
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
    kicker: "1 上秤确认",
    main: measurementData.weight,
    sub: "请双脚踩住脚部电极，保持身体直立。",
    stage: "wake",
    visual: "weight",
    details: guideDetails(["踩住脚部电极", "拉出手柄", "握住两侧电极"], 0),
  });

  schedule(() => {
    setProgress(16, "引导用户拉出上肢杆");
    setScreen({
      mode: "GUIDE",
      signal: "handle",
      kicker: "2 拉出手柄",
      main: "握住手柄",
      sub: "双臂自然下垂，不要夹紧身体。",
      stage: "wake",
      visual: "weight",
      details: guideDetails(["踩住脚部电极", "拉出手柄", "握住两侧电极"], 1),
    });
  }, 1800);

  schedule(() => {
    setStep("contact");
    el.scaleVisual.classList.add("contacting");
    setProgress(26, "检查手脚电极接触质量");
    setScreen({
      mode: "CONTACT",
      signal: "3/4",
      kicker: "2 接触检测",
      main: "握稳右手",
      sub: "右手电极接触不足，保持站稳。",
      stage: "contact",
      visual: "contactWarn",
    });
  }, 3600);

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
  }, 5600);

  schedule(() => {
    setStep("scan");
    el.scaleVisual.classList.remove("contacting");
    el.scaleVisual.classList.add("measuring");
    el.flowTitle.textContent = "完整体脂测量中";
    setProgress(48, "三频 × 五节段阻抗采集中");
    setScreen({
      mode: "SCAN",
      signal: "BIA",
      kicker: "3 BIA 测量中",
      main: "正在测量",
      sub: "保持站稳，系统正在采集身体阻抗。",
      stage: "scan",
      visual: "scan",
    });
  }, 7400);

  [
    [58, "采集上肢阻抗路径"],
    [70, "采集躯干阻抗路径"],
    [82, "校验左右腿均衡"],
    [94, "生成趋势分析和建议"],
  ].forEach(([value, label, time], index) => {
    schedule(() => {
      setProgress(value, label);
      setScreen({
        mode: "SCAN",
        signal: "BIA",
        kicker: "3 BIA 测量中",
        main: "正在测量",
        sub: label,
        stage: "scan",
        visual: "scan",
      });
    }, 9000 + index * 1100);
  });

  schedule(completeBodyMeasurement, 14000);
}

function startWeightOnly() {
  resetDemo();
  measurementMode = "weight";
  el.scaleVisual.classList.add("awake");
  el.scaleLabel.textContent = "weight-only mode · no BIA";
  setStepDisplay("weight");
  setStep("wake");
  setProgress(12, "检测到用户上秤，开始称重");
  el.flowTitle.textContent = "普通称重中";
  setScreen({
    mode: "WEIGH",
    signal: "live",
    kicker: "普通称重",
    main: "18.6 kg",
    sub: "正在读取压力传感器，等待数值稳定。",
    stage: "wake",
    flow: "weight",
    visual: "weight",
  });

  [
    [520, "31.8 kg", 28, "体重读数上升"],
    [1040, "54.2 kg", 45, "双脚已踩稳"],
    [1560, "66.9 kg", 62, "接近稳定值"],
    [2140, "68.1 kg", 74, "稳定性检测中"],
    [2760, "68.5 kg", 82, "读数轻微波动"],
    [3380, "68.3 kg", 88, "读数轻微波动"],
  ].forEach(([delay, value, progress, label]) => {
    schedule(() => {
      el.weightReadout.textContent = value;
      setProgress(progress, label);
      setScreen({
        mode: "WEIGH",
        signal: "live",
        kicker: "普通称重",
        main: value,
        sub: "数值正在趋于稳定，请保持不动。",
        stage: "wake",
        flow: "weight",
        visual: "weight",
      });
    }, delay);
  });

  schedule(() => {
    el.scaleVisual.classList.add("weight-stable");
    el.weightReadout.textContent = measurementData.weight;
    identifyUser("weight");
    setStep("identify");
    setProgress(94, "读数稳定，正在匹配家庭成员");
    setScreen({
      mode: "LOCK",
      signal: "stable",
      kicker: "读数已稳定",
      main: measurementData.weight,
      sub: `正在匹配用户，候选 ${users[selectedUserIndex]}。`,
      stage: "identify",
      flow: "weight",
      visual: "weight",
    });
  }, 4200);

  schedule(completeWeightOnly, 5600);
}

function completeWeightOnly() {
  measurementComplete = true;
  lockedMeasurement = { ...measurementData, mode: "weight" };
  el.scaleVisual.classList.remove("weight-stable");
  setStep("saved");
  setProgress(100, "普通称重完成，速度更快，仅记录体重");
  el.flowTitle.textContent = "普通称重完成";
  setMetrics({ weight: measurementData.weight });
  setSplitScreen({
    mode: "WEIGHT",
    signal: users[selectedUserIndex],
    profile: currentProfile(),
    aiTitle: "普通称重记录",
    aiMain: "体重已保存。",
    aiSub: "本次没有 BIA 数据，体脂曲线展示历史趋势。",
    aiDetail: "如果要生成训练建议，请使用完整体脂测量。",
    stage: "saved",
    flow: "weight",
  });
}

function renderCoachAnswer(reply) {
  const profile = currentProfile();
  if (reply.courses) {
    setSplitScreen({
      mode: "COURSE",
      signal: "AI",
      profile,
      aiTitle: "课程建议",
      aiMain: `先做 ${courses[0][0]} ${courses[0][1]}。`,
      aiSub: "随后做下肢力量和补水恢复。",
      aiDetail: courses.map(([name, duration]) => `${name} ${duration}`).join(" · "),
      stage: "result",
      flow: "body",
    });
    return;
  }

  setSplitScreen({
    mode: "AI",
    signal: "coach",
    profile,
    aiTitle: reply.title,
    aiMain: reply.main || "先稳住低强度",
    aiSub: reply.sub || reply.body,
    aiDetail: reply.detail || "",
    stage: "result",
    flow: "body",
  });
}

function renderCoachReply(reply) {
  setStep("coach");
  if (aiTimer) window.clearTimeout(aiTimer);
  aiThinking = true;
  setSplitScreen({
    mode: "THINK",
    signal: "AI",
    profile: currentProfile(),
    thinking: true,
    stage: "result",
    flow: "body",
  });
  aiTimer = window.setTimeout(() => {
    aiThinking = false;
    renderCoachAnswer(reply);
  }, 2400);
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
    const profile = currentProfile();
    if (aiTimer) window.clearTimeout(aiTimer);
    setStep("saved");
    setSplitScreen({
      mode: "THINK",
      signal: "AI",
      profile,
      thinking: true,
      stage: "saved",
      flow: "weight",
    });
    aiTimer = window.setTimeout(() => {
      setSplitScreen({
        mode: "WEIGHT",
        signal: "AI",
        profile,
        aiTitle: "普通称重说明",
        aiMain: "这次只有体重数据。",
        aiSub: "我可以看体重和历史体脂曲线，但不会生成完整训练建议。",
        aiDetail: "要让 AI 给训练和课程，请先做完整体脂测量。",
        stage: "saved",
        flow: "weight",
      });
    }, 2200);
    return;
  }

  if (aiThinking) return;

  const reply =
    replies.find((item) => item.keys.some((key) => cleanQuestion.includes(key))) ||
    {
      title: "TREND",
      main: "先稳住低强度",
      sub: "观察 7 天体重和水分趋势，再根据骨骼肌变化调整力量课。",
      detail: "今天只需要完成基础有氧和补水，不用为单次波动改计划。",
    };
  renderCoachReply(reply);
}

function renderUserCorrection() {
  const profile = currentProfile();
  setSplitScreen({
    mode: "USER",
    signal: "edited",
    profile,
    aiTitle: "归属已更正",
    aiMain: "本次数值已归入你的档案。",
    aiSub: "本次体重和体脂数值锁定不变，左侧历史曲线已切换到当前用户。",
    aiDetail: "用这个变化演示自动识别出错后的人工校正。",
    stage: measurementMode === "weight" ? "saved" : "result",
    flow: measurementMode === "weight" ? "weight" : "body",
  });
}

/*
 * The following block intentionally stays after the question handler so the
 * button wiring can reuse the same screen-state helpers.
 */

document.getElementById("startMeasure").addEventListener("click", startBodyMeasurement);
document.getElementById("weightOnly").addEventListener("click", startWeightOnly);
document.getElementById("resetDemo").addEventListener("click", resetDemo);
document.getElementById("switchUser").addEventListener("click", () => {
  if (!measurementComplete) return;
  selectedUserIndex = (selectedUserIndex + 1) % users.length;
  el.userMatch.textContent = users[selectedUserIndex];
  renderUserCorrection();
});

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => answerQuestion(button.dataset.question));
});

resetDemo();
