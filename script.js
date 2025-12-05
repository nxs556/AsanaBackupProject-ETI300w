// CTRL Task Asana Backup frontend
// Uses a stable client key in localStorage
// Syncs with OAuth callback via postMessage if backend overwrites the key

const API_BASE = "https://qf91r7lrw8.execute-api.us-east-1.amazonaws.com/prod";
const AUTH_START_PATH = "/auth/asana/start";
const BACKUP_PATH = "/backup";

let currentClientKey = null;

function setStatus(text) {
  const el = document.getElementById("statusBar");
  if (el) el.textContent = text;
}

function setOutputs(obj) {
  const el = document.getElementById("prettyOutput");
  if (el) el.textContent = JSON.stringify(obj, null, 2);
}

function setClientKey(key) {
  if (!key) return;
  currentClientKey = key;
  localStorage.setItem("asana_client_key", key);
}

function getClientKey() {
  if (currentClientKey) return currentClientKey;
  let key = localStorage.getItem("asana_client_key");
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem("asana_client_key", key);
  }
  currentClientKey = key;
  return key;
}

// Listen for client key from OAuth callback
window.addEventListener("message", (event) => {
  try {
    const data = event.data || {};
    if (data.type === "asana_client_key" && data.client_key) {
      setClientKey(data.client_key);
      setStatus("Asana connected. Client key synced");
    }
  } catch (e) {
    console.error("postMessage handling error", e);
  }
});

function startOAuth() {
  const key = getClientKey();
  const url =
    API_BASE +
    AUTH_START_PATH +
    "?client_key=" +
    encodeURIComponent(key);

  window.open(url, "_blank");
  setStatus("Opened Asana OAuth window");
}

async function apiCall(action, extra = {}) {
  const endpointInput = document.getElementById("apiEndpoint");
  const endpoint =
    (endpointInput && endpointInput.value.trim()) ||
    API_BASE + BACKUP_PATH;

  const body = {
    action,
    client_key: getClientKey(),
    ...extra
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    setOutputs(data);

    if (!res.ok) {
      setStatus(
        data.message
          ? `Error ${res.status}: ${data.message}`
          : `Request failed with status ${res.status}`
      );
      throw new Error("Request failed");
    }

    return data;
  } catch (err) {
    console.error(err);
    if (!err.handled) {
      setStatus("Request failed");
    }
    throw err;
  }
}

async function loadWorkspaces() {
  try {
    const data = await apiCall("list_workspaces");

    if (!data.data || !data.data.length) {
      setStatus("No workspaces found");
      return;
    }

    const sel = document.getElementById("workspaceSelect");
    if (!sel) return;

    sel.innerHTML = "";
    sel.disabled = false;

    data.data.forEach((w) => {
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
  if (!sel || !sel.value) {
    setStatus("Select workspace first");
    return;
  }

  try {
    const res = await apiCall("save_workspace", {
      workspace_gid: sel.value
    });
    setStatus(res.message || "Workspace saved");
  } catch {
    // status already set in apiCall
  }
}

async function runBackup() {
  const sel = document.getElementById("workspaceSelect");
  if (!sel || !sel.value) {
    setStatus("Select workspace first");
    return;
  }

  let statusData;
  try {
    statusData = await apiCall("status");
  } catch {
    return;
  }

  const last = statusData.last_backup;
  const confirmMsg = last
    ? `Last backup was ${last}. Run again?`
    : "No previous backup found. Run backup now?";

  if (!confirm(confirmMsg)) return;

  try {
    const res = await apiCall("backup", {
      workspace_id: sel.value
    });
    setStatus("Backup completed");
    setOutputs(res);
  } catch {
    // status already set in apiCall
  }
}

async function checkStatus() {
  try {
    const data = await apiCall("status");

    const asanaLight = document.getElementById("asanaLight");
    const dbLight = document.getElementById("dbLight");

    if (asanaLight) {
      asanaLight.className = data.asana_user_gid ? "light on" : "light error";
    }

    if (dbLight) {
      dbLight.className = data.last_backup ? "light on" : "light error";
    }

    setStatus(
      data.last_backup
        ? "Last backup " + data.last_backup
        : "No backup found"
    );
  } catch {
    // apiCall already set status
  }
}

async function downloadCSV() {
  const endpointInput = document.getElementById("apiEndpoint");
  const endpoint =
    (endpointInput && endpointInput.value.trim()) ||
    API_BASE + BACKUP_PATH;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "download_csv",
        client_key: getClientKey()
      })
    });

    if (!res.ok) {
      const text = await res.text();
      setOutputs({ status: res.status, body: text });
      setStatus("Failed to download CSV");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "asana_backup.csv";
    a.click();

    setStatus("CSV download started");
  } catch (e) {
    console.error(e);
    setStatus("Failed to download CSV");
  }
}

function clearAll() {
  setOutputs({});
  setStatus("");
}

// Wire up buttons
document.getElementById("oauthBtn").onclick = startOAuth;
document.getElementById("loadBtn").onclick = loadWorkspaces;
document.getElementById("saveBtn").onclick = saveWorkspace;
document.getElementById("runBtn").onclick = runBackup;
document.getElementById("statusBtn").onclick = checkStatus;
document.getElementById("downloadBtn").onclick = downloadCSV;
document.getElementById("clearBtn").onclick = clearAll;

// Initialize client key on load
getClientKey();
setStatus("Ready. Client key " + getClientKey());