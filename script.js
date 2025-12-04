const API_BASE = "https://qf91r7lrw8.execute-api.us-east-1.amazonaws.com/prod";
const AUTH_START_PATH = "/auth/asana/start";
const BACKUP_PATH = "/backup";

function getClientKey() {
  return document.getElementById("clientKey").value.trim() || "demo-client";
}

function setStatus(text) {
  document.getElementById("statusBar").textContent = text;
}

function setOutputs(obj) {
  document.getElementById("prettyOutput").textContent =
    JSON.stringify(obj, null, 2);
}

/* ---------- OAUTH ---------- */
function startOAuth() {
  const url =
    API_BASE +
    AUTH_START_PATH +
    "?client_key=" +
    encodeURIComponent(getClientKey());

  window.open(url, "_blank");
  setStatus("Opened Asana OAuth window");
}

/* ---------- CORE API HELPER ---------- */
async function apiCall(action, extra = {}) {
  const endpoint =
    document.getElementById("apiEndpoint").value.trim() ||
    API_BASE + BACKUP_PATH;

  const body = {
    action,
    client_key: getClientKey(),
    ...extra
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  setOutputs(data);
  return data;
}

/* ---------- LOAD WORKSPACES ---------- */
async function loadWorkspaces() {
  try {
    setStatus("Loading workspaces…");

    const data = await apiCall("list_workspaces");

    if (!data.data || !data.data.length) {
      setStatus("No workspaces found");
      return;
    }

    const sel = document.getElementById("workspaceSelect");
    sel.innerHTML = "";
    sel.disabled = false;

    data.data.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.gid;
      opt.textContent = w.name;
      sel.appendChild(opt);
    });

    setStatus("Workspaces loaded");
  } catch (e) {
    console.error(e);
    setStatus("Failed to load workspaces");
  }
}

/* ---------- SAVE WORKSPACE ---------- */
async function saveWorkspace() {
  const sel = document.getElementById("workspaceSelect");

  if (!sel.value) {
    setStatus("Load and select a workspace first");
    return;
  }

  const data = await apiCall("save_workspace", {
    workspace_gid: sel.value
  });

  setStatus(data.message || "Workspace saved");
}

/* ---------- RUN BACKUP ---------- */
async function runBackup() {
  const workspaceId =
    document.getElementById("workspaceSelect").value;

  if (!workspaceId) {
    setStatus("Load and save workspace first");
    return;
  }

  const res = await apiCall("backup", {
    workspace_id: workspaceId
  });

  setStatus("Backup completed");
  setOutputs(res);
}

/* ---------- CHECK STATUS ---------- */
async function checkStatus() {
  const data = await apiCall("status");

  document.getElementById("asanaLight").className =
    data.asana_user_gid ? "light on" : "light error";

  document.getElementById("dbLight").className =
    data.workspace_gid ? "light on" : "light error";

  setStatus("Status checked");
}

/* ---------- DOWNLOAD CSV ---------- */
async function downloadCSV() {
  const endpoint =
    document.getElementById("apiEndpoint").value.trim() ||
    API_BASE + BACKUP_PATH;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "backup",
      client_key: getClientKey(),
      workspace_id: document.getElementById("workspaceSelect").value,
      format: "csv"
    })
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "asana_backup.csv";
  a.click();
}

/* ---------- CLEAR ---------- */
function clearAll() {
  setOutputs({});
  setStatus("");
}

/* ---------- EVENT BINDINGS ---------- */
document.getElementById("oauthBtn").onclick = startOAuth;
document.getElementById("loadBtn").onclick = loadWorkspaces;
document.getElementById("saveBtn").onclick = saveWorkspace;
document.getElementById("runBtn").onclick = runBackup;
document.getElementById("statusBtn").onclick = checkStatus;
document.getElementById("downloadBtn").onclick = downloadCSV;
document.getElementById("clearBtn").onclick = clearAll;