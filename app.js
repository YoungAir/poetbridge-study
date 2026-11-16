const CONFIG = window.POETBRIDGE_STUDY_CONFIG || {};
const MODE_KEY = CONFIG.mode === "live" ? "live" : "preview";
const STORAGE_KEY = `poetbridge.pilot.sessions.${MODE_KEY}.v1`;
const ACTIVE_KEY = `poetbridge.pilot.active.${MODE_KEY}.v1`;
const app = document.getElementById("app");
const banner = document.getElementById("mode-banner");
let poems = [];
let formError = "";

const assignmentPatterns = CONFIG.assignmentPatterns || [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]));
}

function getSessions() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function setSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function saveSession(session) {
  const sessions = getSessions();
  const index = sessions.findIndex((item) => item.sessionId === session.sessionId);
  if (index < 0) sessions.push(session);
  else sessions[index] = session;
  setSessions(sessions);
  localStorage.setItem(ACTIVE_KEY, session.sessionId);
}

function activeSession() {
  const activeId = localStorage.getItem(ACTIVE_KEY);
  return getSessions().find((item) => item.sessionId === activeId && item.status !== "complete") || null;
}

function dateLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function setBanner() {
  if (CONFIG.mode === "preview") {
    banner.hidden = false;
    banner.textContent = "演示配置：正式招募前，请在 study-config.js 填写研究者联系方式与伦理审查信息，并将 mode 改为 live。";
  }
}

function renderWelcome() {
  setBanner();
  const active = activeSession();
  const sessions = getSessions();
  const completed = sessions.filter((item) => item.status === "complete").length;
  app.innerHTML = `
    <section class="intro">
      <p class="eyebrow">匿名阅读任务</p>
      <h1 class="screen-title">古诗阅读与理解</h1>
      <p class="screen-subtitle">请按自己的理解阅读诗作并回答问题。没有标准的个人立场，也不会即时显示分数。</p>
    </section>
    <div class="overview-grid" aria-label="研究信息">
      <div class="overview-item"><span class="overview-label">预计时长</span><span class="overview-value">约 30–35 分钟</span></div>
      <div class="overview-item"><span class="overview-label">阅读诗作</span><span class="overview-value">4 首 · 每首 3 题</span></div>
      <div class="overview-item"><span class="overview-label">数据保存</span><span class="overview-value">当前浏览器本地</span></div>
    </div>
    <div class="notice">本研究只收集匿名编号、简短阅读背景、作答文本和阅读体验评分。请勿在回答中填写姓名、联系方式或其他身份信息。答题数据不会通过本网页上传。</div>
    ${CONFIG.mode === "preview" ? `<div class="notice error">当前仅供研究者试跑流程，演示模式数据会被标记为 preview，不应纳入正式研究结果。</div>` : ""}
    ${active ? `<div class="notice success">发现未完成的匿名问卷：${escapeHtml(active.participantCode)}，上次保存于 ${escapeHtml(dateLabel(active.updatedAt))}。</div>` : ""}
    ${formError ? `<div class="notice error" role="alert">${escapeHtml(formError)}</div>` : ""}
    <div class="button-row">
      ${active ? `<button class="button" data-action="resume">继续填写</button>` : ""}
      <button class="button ${active ? "secondary" : ""}" data-action="begin">${active ? "开始新的问卷" : "开始阅读"}</button>
    </div>
    <p class="small-note">此浏览器已有 ${completed} 份完成记录。共享设备请勿在此页面展示其他参与者的回答。</p>
  `;
}

function renderConsent() {
  setBanner();
  formError = "";
  app.innerHTML = `
    <div class="intro">
      <h1 class="screen-title">参与说明</h1>
      <p class="screen-subtitle">请阅读说明后决定是否继续。</p>
    </div>
    <div class="form-section">
      <h2 class="section-head">研究内容</h2>
      <p>本研究关注读者如何理解古诗中的字词、表达方式与整体情感。你将阅读 4 首唐诗并回答每首诗后的 3 个问题，随后对作答把握与阅读负担作简短评价。</p>
      <p>参与约需 30–35 分钟。参加完全自愿，可以随时关闭页面或停止作答，不影响你与研究者的关系。</p>
      <p>本网页不要求姓名、手机号、邮箱或学校信息。答案保存在当前设备浏览器中，不会自动上传。完成后请下载本次匿名答题文件，并按研究者提供的方式交回。</p>
      <p>可能的不适包括阅读疲劳或对古诗题目感到困难。你可以休息或退出。</p>
      <p><strong>研究者联系方式：</strong>${escapeHtml(CONFIG.researcherContact || "尚未填写，请勿用于正式招募")}</p>
      <p><strong>伦理审查信息：</strong>${escapeHtml(CONFIG.ethicsStatement || "尚未填写，请勿用于正式招募")}</p>
    </div>
    <form id="consent-form">
      <div class="form-section">
        <label class="field-label" for="participant-code">匿名编号</label>
        <input id="participant-code" name="participantCode" type="text" inputmode="text" autocomplete="off" placeholder="例如 P01" maxlength="12" required>
        <span class="field-hint">请使用研究者发给你的编号（P01–P10），不要填写姓名、学号或生日。</span>
      </div>
      <div class="form-section">
        <label class="field-label" for="familiarity">你平时对唐诗的熟悉程度</label>
        <select id="familiarity" name="familiarity" required>${selectOptions("", ["几乎不熟悉", "不太熟悉", "一般", "比较熟悉", "很熟悉"])}</select>
      </div>
      <div class="check-row">
        <input id="adult-check" name="adult" type="checkbox" required>
        <label for="adult-check">我已年满 18 周岁。若未满 18 周岁，请先停止并联系研究者确认适用的伦理与监护人同意流程。</label>
      </div>
      <div class="check-row">
        <input id="consent-check" name="consent" type="checkbox" required>
        <label for="consent-check">我已阅读以上说明，自愿参加本研究，并同意研究者将我的匿名回答用于研究分析。</label>
      </div>
      ${formError ? `<div class="notice error" role="alert">${escapeHtml(formError)}</div>` : ""}
      <div class="button-row">
        <button class="button" type="submit">同意并继续</button>
        <button class="button secondary" type="button" data-action="home">返回</button>
      </div>
    </form>
  `;
  document.getElementById("consent-form").addEventListener("submit", startSession);
}

function stableShuffle(items, seedText) {
  let seed = 2166136261;
  for (const character of seedText) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  const result = [...items];
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function startSession(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const code = String(form.get("participantCode") || "").trim().toUpperCase();
  const match = /^P(\d{2})$/.exec(code);
  if (!match || Number(match[1]) < 1) {
    formError = "请使用 P01–P99 格式的匿名编号。";
    renderConsent();
    return;
  }
  const existing = getSessions().find((item) => item.participantCode === code);
  if (existing) {
    if (existing.status !== "complete") {
      localStorage.setItem(ACTIVE_KEY, existing.sessionId);
      renderSession(existing);
      return;
    }
    formError = "这个编号已有一份完成记录，请联系研究者，不要重复提交。";
    renderConsent();
    return;
  }
  if (poems.length !== 4) {
    formError = "研究材料尚未加载完成，请刷新页面后再试。";
    renderConsent();
    return;
  }
  const slot = (Number(match[1]) - 1) % assignmentPatterns.length;
  const conditions = assignmentPatterns[slot];
  const orderedPoems = stableShuffle(poems, `${CONFIG.studyId || "study"}:${code}`);
  const session = {
    schemaVersion: 1,
    sessionId: crypto.randomUUID(),
    studyId: CONFIG.studyId || "poetbridge-pilot",
    studyMode: CONFIG.mode || "preview",
    participantCode: code,
    consent: { adult: form.get("adult") === "on", agreed: form.get("consent") === "on", timestamp: new Date().toISOString() },
    background: { classicalPoetryFamiliarity: document.getElementById("familiarity")?.value || null },
    assignmentSlot: slot + 1,
    assignmentPattern: conditions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "in_progress",
    currentIndex: 0,
    poemOrder: orderedPoems.map((poem) => poem.id),
    responses: {},
  };
  session.background.classicalPoetryFamiliarity = String(form.get("familiarity") || "");
  saveSession(session);
  renderSession(session);
}

function getPoemFor(session, index) {
  const id = session.poemOrder[index];
  return poems.find((poem) => poem.id === id);
}

function ensureResponse(session, poem, index) {
  const condition = session.assignmentPattern[poems.findIndex((item) => item.id === poem.id)];
  if (!session.responses[poem.id]) {
    session.responses[poem.id] = {
      poemId: poem.id,
      poemTitle: poem.title,
      poemAuthor: poem.author,
      condition,
      order: index + 1,
      openedAt: new Date().toISOString(),
      answers: { Q1: "", Q2: "", Q3: "" },
      confidence: "",
      cognitiveLoad: "",
      durationSeconds: null,
      submittedAt: null,
    };
    session.updatedAt = new Date().toISOString();
    saveSession(session);
  }
  return session.responses[poem.id];
}

function renderProgress(session) {
  const count = session.poemOrder.length;
  const complete = session.currentIndex;
  return `
    <div class="progress-wrap" aria-label="問卷進度">
      <div class="progress-meta"><span>閱讀進度</span><span>${complete + 1} / ${count}</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${(complete / count) * 100}%"></div></div>
    </div>
  `;
}

function selectOptions(selected, labels) {
  return `<option value="">請選擇</option>${labels.map((label, index) => {
    const value = String(index + 1);
    return `<option value="${value}" ${String(selected) === value ? "selected" : ""}>${value} · ${escapeHtml(label)}</option>`;
  }).join("")}`;
}

function renderSession(session) {
  localStorage.setItem(ACTIVE_KEY, session.sessionId);
  if (session.currentIndex >= session.poemOrder.length) {
    finishSession(session);
    return;
  }
  const index = session.currentIndex;
  const poem = getPoemFor(session, index);
  if (!poem) {
    formError = "找不到当前诗作，请联系研究者。";
    renderWelcome();
    return;
  }
  const response = ensureResponse(session, poem, index);
  const questions = poem.questions.map((question, qIndex) => `
    <div class="question-block">
      <div class="question-heading">
        <span class="question-index">${qIndex + 1}</span>
        <div><span class="question-layer">${escapeHtml(question.layer)}</span><div class="question-text">${escapeHtml(question.text)}</div></div>
      </div>
      <textarea data-answer="${escapeHtml(question.id)}" aria-label="${escapeHtml(question.id)} 作答" placeholder="写下你的理解……" required>${escapeHtml(response.answers[question.id] || "")}</textarea>
      <div class="answer-count" data-count="${escapeHtml(question.id)}"></div>
    </div>
  `).join("");
  const bridge = response.condition === "bridge" ? `
    <section class="bridge-panel" aria-label="参照诗句">
      <div><span class="bridge-label">参照诗句</span><span class="bridge-title">${escapeHtml(poem.bridge.source)} · ${escapeHtml(poem.bridge.author)}</span></div>
      <p class="bridge-verse">${escapeHtml(poem.bridge.verse)}</p>
      <p class="bridge-prompt">想一想，这句参照诗与你正在阅读的诗有哪些相同和不同？</p>
    </section>
  ` : "";

  app.innerHTML = `
    ${renderProgress(session)}
    <section class="poem-panel">
      <div class="poem-kicker">第 ${index + 1} 首 · ${escapeHtml(poem.title)}</div>
      <h1 class="poem-title">${escapeHtml(poem.title)}<span class="poem-author">${escapeHtml(poem.author)}</span></h1>
      <div class="poem-text">${escapeHtml(poem.content)}</div>
      <div class="notes-block">
        <div class="notes-title">阅读注释</div>
        <div class="notes-list">${poem.notes.map((note) => `<span class="note-chip">${escapeHtml(note)}</span>`).join("")}</div>
      </div>
    </section>
    ${bridge}
    <form id="response-form" data-poem-id="${escapeHtml(poem.id)}">
      <div class="question-list">${questions}</div>
      <div class="rating-grid">
        <div class="rating-item"><label for="confidence">我对这首诗主要意思的把握程度</label><select id="confidence" name="confidence" required>${selectOptions(response.confidence, ["很低", "较低", "一般", "较高", "很高"])}</select></div>
        <div class="rating-item"><label for="cognitive-load">刚才的阅读与作答负担</label><select id="cognitive-load" name="cognitiveLoad" required>${selectOptions(response.cognitiveLoad, ["很轻", "较轻", "一般", "较重", "很重"])}</select></div>
      </div>
      <div class="button-row">
        <button class="button" type="submit">${index === session.poemOrder.length - 1 ? "提交并完成" : "提交并继续"}</button>
        <button class="button secondary" type="button" data-action="leave">稍后继续</button>
      </div>
      <p class="small-note">请用自己的话回答。每题可简短作答；不要填写可识别个人身份的信息。</p>
    </form>
  `;
  document.getElementById("response-form").addEventListener("input", (event) => updateResponse(session, poem.id, event));
  document.getElementById("response-form").addEventListener("change", (event) => updateResponse(session, poem.id, event));
  document.getElementById("response-form").addEventListener("submit", (event) => submitResponse(session, poem, event));
  updateCharacterCounts();
}

function updateResponse(session, poemId, event) {
  const response = session.responses[poemId];
  const target = event.target;
  const answerId = target.dataset.answer;
  if (answerId) response.answers[answerId] = target.value;
  if (target.name === "confidence") response.confidence = target.value;
  if (target.name === "cognitiveLoad") response.cognitiveLoad = target.value;
  session.updatedAt = new Date().toISOString();
  saveSession(session);
  updateCharacterCounts();
}

function updateCharacterCounts() {
  for (const answerId of ["Q1", "Q2", "Q3"]) {
    const textarea = document.querySelector(`[data-answer="${answerId}"]`);
    const count = document.querySelector(`[data-count="${answerId}"]`);
    if (textarea && count) count.textContent = `${[...textarea.value.trim()].length} 字`;
  }
}

function submitResponse(session, poem, event) {
  event.preventDefault();
  const response = session.responses[poem.id];
  const form = new FormData(event.currentTarget);
  const missing = ["Q1", "Q2", "Q3"].filter((key) => !String(response.answers[key] || "").trim());
  if (missing.length || !form.get("confidence") || !form.get("cognitiveLoad")) {
    formError = "请回答三道题，并完成两项阅读体验评分。";
    window.alert(formError);
    return;
  }
  response.confidence = String(form.get("confidence"));
  response.cognitiveLoad = String(form.get("cognitiveLoad"));
  response.submittedAt = new Date().toISOString();
  response.durationSeconds = Math.max(0, Math.round((new Date(response.submittedAt) - new Date(response.openedAt)) / 1000));
  session.currentIndex += 1;
  session.updatedAt = response.submittedAt;
  saveSession(session);
  formError = "";
  renderSession(session);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function downloadJson(session) {
  const blob = new Blob([JSON.stringify({ type: "poetbridge-session", schemaVersion: 1, session }, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `poetbridge_${session.participantCode}_${session.sessionId.slice(0, 8)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function finishSession(session) {
  session.status = "complete";
  session.completedAt ||= new Date().toISOString();
  session.updatedAt = session.completedAt;
  saveSession(session);
  app.dataset.finishedSessionId = session.sessionId;
  app.innerHTML = `
    <section class="intro">
      <p class="eyebrow">答题已保存</p>
      <h1 class="screen-title">谢谢参与</h1>
      <p class="screen-subtitle">编号 ${escapeHtml(session.participantCode)} 的匿名问卷已完成，数据保存在当前浏览器中。</p>
    </section>
    <div class="notice">请下载本次答题文件，并按研究者事先提供的方式交回。若在公共设备上作答，请确认研究者已收到文件后再离开。</div>
    <div class="button-row">
      <button class="button" data-action="download-session">下载答题文件</button>
      <button class="button secondary" data-action="home">返回首页</button>
    </div>
  `;
}

function goHome() {
  formError = "";
  renderWelcome();
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "begin") renderConsent();
  if (action === "home") goHome();
  if (action === "resume") {
    const session = activeSession();
    if (session) renderSession(session);
    else renderWelcome();
  }
  if (action === "leave") goHome();
  if (action === "download-session") {
    const session = getSessions().find((item) => item.sessionId === app.dataset.finishedSessionId);
    if (session) downloadJson(session);
  }
});

fetch("study-items.json")
  .then((response) => {
    if (!response.ok) throw new Error("study-items.json could not be loaded");
    return response.json();
  })
  .then((data) => {
    poems = data.poems || [];
    renderWelcome();
  })
  .catch(() => {
    app.innerHTML = `<div class="notice error">研究材料加载失败。请通过本地网页服务器打开本站，并确认 study-items.json 存在。</div>`;
  });
