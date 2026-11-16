const CONFIG = window.POETBRIDGE_STUDY_CONFIG || {};
const MODE_KEY = CONFIG.mode === "live" ? "live" : "preview";
const STORAGE_KEY = `poetbridge.pilot.sessions.${MODE_KEY}.v1`;
const ACTIVE_KEY = `poetbridge.pilot.active.${MODE_KEY}.v1`;
const content = document.getElementById("admin-content");
const banner = document.getElementById("admin-banner");
let studyPoems = [];

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

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function dateLabel(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function download(name, contentText, mime) {
  const blob = new Blob([contentText], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  const sessions = getSessions();
  const bundle = {
    type: "poetbridge-research-export",
    schemaVersion: 1,
    studyId: CONFIG.studyId || "poetbridge-pilot",
    exportedAt: new Date().toISOString(),
    sessions,
  };
  download(`poetbridge_data_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(bundle, null, 2), "application/json;charset=utf-8");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportScoringCsv() {
  const sessions = getSessions();
  const fields = [
    "study_id", "study_mode", "session_id", "participant_code", "assignment_slot", "session_status",
    "classical_poetry_familiarity", "poem_order", "task_id", "poem_title", "poem_author", "condition", "poem_response_status",
    "confidence_1_to_5", "cognitive_load_1_to_5", "duration_seconds", "answer_Q1", "answer_Q2", "answer_Q3",
    "score_Q1_0_to_3", "score_Q2_0_to_3", "score_Q3_0_to_3", "score_total_0_to_9",
  ];
  const rows = [fields];
  for (const session of sessions) {
    for (const poemId of session.poemOrder || []) {
      const response = session.responses?.[poemId];
      if (!response) continue;
      rows.push([
        session.studyId, session.studyMode, session.sessionId, session.participantCode,
        session.assignmentSlot, session.status, session.background?.classicalPoetryFamiliarity,
        response.order, response.poemId, response.poemTitle, response.poemAuthor, response.condition,
        response.submittedAt ? "submitted" : "incomplete",
        response.confidence, response.cognitiveLoad, response.durationSeconds,
        response.answers?.Q1, response.answers?.Q2, response.answers?.Q3,
        "", "", "", "",
      ]);
    }
  }
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  download(`poetbridge_scoring_${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${body}`, "text/csv;charset=utf-8");
}

function sessionRow(session) {
  const answered = Object.values(session.responses || {}).filter((response) => response.submittedAt).length;
  const status = session.status === "complete" ? "已完成" : `${answered}/4 首已填写`;
  return `
    <tr>
      <td>${escapeHtml(session.participantCode)}</td>
      <td>${escapeHtml(status)}</td>
      <td>${escapeHtml(session.studyMode || "unknown")}</td>
      <td>${escapeHtml(session.assignmentSlot ?? "—")}</td>
      <td>${escapeHtml(dateLabel(session.updatedAt || session.createdAt))}</td>
      <td><button class="text-button" data-action="delete-one" data-session-id="${escapeHtml(session.sessionId)}">删除</button></td>
    </tr>
  `;
}

function assignmentTable() {
  if (studyPoems.length !== 4) return `<div class="notice error">无法加载条件分配表所需的诗作材料。</div>`;
  const patterns = CONFIG.assignmentPatterns || [];
  const participantRows = patterns.slice(0, Number(CONFIG.expectedParticipants || 10)).map((pattern, index) => {
    const cells = studyPoems.map((poem, poemIndex) => {
      const condition = pattern[poemIndex];
      const tagClass = condition === "bridge" ? "condition-tag bridge" : "condition-tag";
      const label = condition === "bridge" ? "桥接" : "基线";
      return `<td><span class="${tagClass}">${label}</span></td>`;
    }).join("");
    return `<tr><td>P${String(index + 1).padStart(2, "0")}</td>${cells}</tr>`;
  });
  const totals = studyPoems.map((_, poemIndex) => {
    const bridgeCount = patterns.slice(0, Number(CONFIG.expectedParticipants || 10))
      .filter((pattern) => pattern[poemIndex] === "bridge").length;
    const baselineCount = Number(CONFIG.expectedParticipants || 10) - bridgeCount;
    const balanced = bridgeCount === baselineCount;
    return `<td>${baselineCount}/${bridgeCount}${balanced ? " ✓" : " !"}</td>`;
  }).join("");
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>编号</th>${studyPoems.map((poem) => `<th>${escapeHtml(poem.title)}</th>`).join("")}</tr></thead>
        <tbody>${participantRows.join("")}<tr><th>基线/桥接人数</th>${totals}</tr></tbody>
      </table>
    </div>
  `;
}

function render() {
  const sessions = getSessions().sort((a, b) => String(a.participantCode).localeCompare(String(b.participantCode)));
  const completed = sessions.filter((session) => session.status === "complete").length;
  const previewCount = sessions.filter((session) => session.studyMode === "preview").length;
  const uniqueCodes = new Set(sessions.map((session) => session.participantCode));
  const duplicateCodes = sessions.map((session) => session.participantCode).filter((code, index, list) => list.indexOf(code) !== index);
  const expected = Number(CONFIG.expectedParticipants || 10);
  const missingCodes = Array.from({ length: expected }, (_, index) => `P${String(index + 1).padStart(2, "0")}`)
    .filter((code) => !uniqueCodes.has(code));

  banner.className = CONFIG.mode === "preview" ? "notice" : "notice success";
  banner.textContent = CONFIG.mode === "preview"
    ? "当前为演示配置。正式收集前需填写研究者联系方式和伦理审查信息，再将 study-config.js 的 mode 改为 live。"
    : "正式配置已启用。请确认伦理审查状态、知情同意文本和参与者交回文件的渠道均已落实。";

  content.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat"><strong>${sessions.length}</strong><span>已导入或本机记录</span></div>
      <div class="admin-stat"><strong>${completed}</strong><span>完成问卷</span></div>
      <div class="admin-stat"><strong>${previewCount}</strong><span>演示模式记录</span></div>
    </div>
    <div class="notice">匿名编号分配表：${escapeHtml(missingCodes.length ? `尚未收到 ${missingCodes.join("、")}` : `P01–P${String(expected).padStart(2, "0")} 均已收到`)}。</div>
    ${duplicateCodes.length ? `<div class="notice error">发现重复编号：${escapeHtml([...new Set(duplicateCodes)].join("、"))}。请核查导入文件，勿直接合并。</div>` : ""}
    <div class="admin-nav">
      <button class="button" data-action="export-json">导出全部 JSON</button>
      <button class="button secondary" data-action="export-csv">下载评分 CSV</button>
      <button class="button secondary" data-action="import">导入参与者文件</button>
      <button class="button secondary" data-action="clear">清空本机记录</button>
    </div>
    <h2 class="section-head">参与者记录</h2>
    <div class="table-wrap">
      ${sessions.length ? `
        <table>
          <thead><tr><th>匿名编号</th><th>进度</th><th>模式</th><th>分配槽</th><th>最近保存</th><th>操作</th></tr></thead>
          <tbody>${sessions.map(sessionRow).join("")}</tbody>
        </table>
      ` : `<div class="empty-state">当前浏览器还没有记录。参与者完成问卷后，记录会出现在这里；其他设备的 JSON 文件可通过“导入参与者文件”汇总。</div>`}
    </div>
    <h2 class="section-head">条件平衡</h2>
    <p class="small-note">每个编号对应一套固定的 2:2 条件分配。请按下表发放 P01–P10，避免重复使用编号。末行显示每首诗的“基线/桥接”人数。</p>
    ${assignmentTable()}
    <div class="notice">静态 GitHub Pages 不提供数据库：每位参与者在自己的设备完成后需下载 JSON，再通过研究者数据工具导入；若所有人共用同一设备，记录会在此浏览器自动累积。</div>
  `;
}

async function importFiles(files) {
  const sessions = getSessions();
  const known = new Set(sessions.map((session) => session.sessionId));
  const imported = [];
  const errors = [];
  for (const file of files) {
    try {
      const data = JSON.parse(await file.text());
      const candidates = data.type === "poetbridge-session" && data.session
        ? [data.session]
        : data.type === "poetbridge-research-export" && Array.isArray(data.sessions)
          ? data.sessions
          : [];
      if (!candidates.length) throw new Error("不是 PoetBridge 答题 JSON 文件");
      for (const session of candidates) {
        if (!session.sessionId || !session.participantCode || !session.responses) {
          throw new Error("答题文件字段不完整");
        }
        if (known.has(session.sessionId)) continue;
        known.add(session.sessionId);
        sessions.push(session);
        imported.push(session.participantCode);
      }
    } catch (error) {
      errors.push(`${file.name}: ${error.message}`);
    }
  }
  saveSessions(sessions);
  render();
  if (errors.length) window.alert(`已导入 ${imported.length} 份。以下文件未导入：\n${errors.join("\n")}`);
  else window.alert(`已导入 ${imported.length} 份匿名答题记录。`);
}

content.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "export-json") exportJson();
  if (action === "export-csv") exportScoringCsv();
  if (action === "import") document.getElementById("import-files").click();
  if (action === "clear") {
    if (window.confirm("确定删除当前浏览器中的全部参与者记录吗？请先导出备份。")) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACTIVE_KEY);
      render();
    }
  }
  if (action === "delete-one") {
    if (window.confirm("删除这份匿名记录？")) {
      saveSessions(getSessions().filter((session) => session.sessionId !== button.dataset.sessionId));
      render();
    }
  }
});

document.getElementById("import-files").addEventListener("change", (event) => {
  if (event.target.files?.length) importFiles([...event.target.files]);
  event.target.value = "";
});

fetch("study-items.json")
  .then((response) => {
    if (!response.ok) throw new Error("study-items.json could not be loaded");
    return response.json();
  })
  .then((data) => {
    studyPoems = data.poems || [];
    render();
  })
  .catch(() => {
    banner.className = "notice error";
    banner.textContent = "研究材料加载失败。请确认 study-items.json 文件存在并通过网页服务器访问。";
    render();
  });
