// Updated secure frontend logic
// Auto‑generates and stores a private client key per browser
// Removes shared demo-client risk

const API_BASE = "https://qf91r7lrw8.execute-api.us-east-1.amazonaws.com/prod";
const AUTH_START_PATH = "/auth/asana/start";
const BACKUP_PATH = "/backup";

function getClientKey() {
  let key = localStorage.getItem("asana_client_key");
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem("asana_client_key", key);
  }
  return key;
}

function setStatus(text) {
  document.getElementById("statusBar").textContent = text;
}

function setOutputs(obj) {
  document.getElementById("prettyOutput").textContent =
    JSON.stringify(obj, null, 2);
}

function startOAuth() {
  const url = API_BASE + AUTH_START_PATH + "?client_key=" + encodeURIComponent(getClientKey());
  window.open(url, "_blank");
  setStatus("Opened Asana OAuth window");
}

async function apiCall(action, extra = {}) {
  const endpoint = document.getElementById("apiEndpoint").value.trim() || API_BASE + BACKUP_PATH;

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

async function loadWorkspaces() {
  try {
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
  } catch {
    setStatus("Failed to load workspaces");
  }
}

async function saveWorkspace() {
  const sel = document.getElementById("workspaceSelect");
  if (!sel.value) {
    setStatus("Select workspace first");
    return;
  }

  const res = await apiCall("save_workspace", { workspace_gid: sel.value });
  setStatus(res.message || "Workspace saved");
}

async function runBackup() {
  const sel = document.getElementById("workspaceSelect").value;
  if (!sel) {
    setStatus("Select workspace first");
    return;
  }

  const status = await apiCall("status");

  const confirmMsg = status.last_backup_at
    ? `Last backup was ${status.last_backup_at}. Run again?`
    : "No previous backup found. Run backup now?";

  if (!confirm(confirmMsg)) return;

  const res = await apiCall("backup", { workspace_id: sel });
  setStatus("Backup completed");
  setOutputs(res);
}

async function checkStatus() {
  const data = await apiCall("status");

  document.getElementById("asanaLight").className =
    data.asana_user_gid ? "light on" : "light error";

  document.getElementById("dbLight").className =
    data.last_backup_at ? "light on" : "light error";

  setStatus(
    data.last_backup_at
      ? "Last backup " + data.last_backup_at
      : "No backup found"
  );
}

async function downloadCSV() {
  const endpoint = document.getElementById("apiEndpoint").value.trim() || API_BASE + BACKUP_PATH;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "download_csv",
      client_key: getClientKey()
    })
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "asana_backup.csv";
  a.click();
}

function clearAll() {
  setOutputs({});
  setStatus("");
}

document.getElementById("oauthBtn").onclick = startOAuth;
document.getElementById("loadBtn").onclick = loadWorkspaces;
document.getElementById("saveBtn").onclick = saveWorkspace;
document.getElementById("runBtn").onclick = runBackup;
document.getElementById("statusBtn").onclick = checkStatus;
document.getElementById("downloadBtn").onclick = downloadCSV;
document.getElementById("clearBtn").onclick = clearAll;