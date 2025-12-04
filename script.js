// Base API info
const API_BASE =
  "https://qf91r7lrw8.execute-api.us-east-1.amazonaws.com/prod";
const AUTH_START_PATH = "/auth/asana/start";
const BACKUP_PATH = "/backup";

function getClientKey() {
  const v = document.getElementById("clientKey").value.trim();
  return v || "demo-client";
}

function setStatus(text, isError) {
  const bar = document.getElementById("statusBar");
  bar.textContent = text || "";
  bar.className = "status-bar" + (isError ? " error" : " ok");
}

function setOutputs(obj) {
  const pretty = document.getElementById("prettyOutput");
  const raw = document.getElementById("rawOutput");

  if (obj == null) {
    pretty.textContent = "";
    raw.textContent = "";
    return;
  }

  pretty.textContent = JSON.stringify(obj, null, 2);
  raw.textContent = JSON.stringify(obj);
}

// OAuth
function startOAuth() {
  const clientKey = getClientKey();
  const url =
    API_BASE +
    AUTH_START_PATH +
    "?client_key=" +
    encodeURIComponent(clientKey);

  window.open(url, "_blank");
  setStatus("Opened Asana OAuth window", false);
}

// Send JSON request
async function sendRequest() {
  try {
    setStatus("Sending request", false);
    setOutputs(null);

    const apiEndpoint =
      document.getElementById("apiEndpoint").value.trim() ||
      API_BASE + BACKUP_PATH;

    const clientKey = getClientKey();
    const action = document.getElementById("action").value;
    const workspaceId = document.getElementById("workspaceId").value.trim();

    const body = {
      action: action,
      client_key: clientKey
    };

    if (workspaceId) body.workspace_id = workspaceId;

    const res = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    setOutputs(data);

    setStatus(res.ok ? "Success" : "HTTP " + res.status, !res.ok);
  } catch (err) {
    setStatus("Network error " + err, true);
  }
}

// Download CSV
async function downloadBackupCSV() {
  try {
    setStatus("Generating CSV", false);

    const apiEndpoint =
      document.getElementById("apiEndpoint").value.trim() ||
      API_BASE + BACKUP_PATH;

    const body = {
      action: "backup",
      client_key: getClientKey(),
      workspace_id:
        document.getElementById("workspaceId").value.trim() || null,
      export: "csv"
    };

    const res = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asana_backup.csv";
    a.click();

    setStatus("CSV downloaded", false);
  } catch (err) {
    setStatus("CSV failed " + err, true);
  }
}

// Status lights
async function refreshStatusLights() {
  const apiEndpoint =
    document.getElementById("apiEndpoint").value.trim() ||
    API_BASE + BACKUP_PATH;

  const body = {
    action: "status",
    client_key: getClientKey()
  };

  try {
    const res = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    const asanaLight = document.getElementById("asanaLight");
    const dbLight = document.getElementById("dbLight");

    if (data.message === "Token found" && data.expired === false) {
      asanaLight.className = "light on";
      dbLight.className = "light on";
    } else {
      asanaLight.className = "light error";
      dbLight.className = "light error";
    }
  } catch {
    document.getElementById("asanaLight").className = "light error";
    document.getElementById("dbLight").className = "light error";
  }
}

function clearAll() {
  setOutputs(null);
  setStatus("", false);
}

// Wire buttons
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("oauthBtn").onclick = startOAuth;
  document.getElementById("sendBtn").onclick = sendRequest;
  document.getElementById("downloadBtn").onclick = downloadBackupCSV;
  document.getElementById("clearBtn").onclick = clearAll;
  document.getElementById("oauthBackupBtn").onclick = startOAuth;

  refreshStatusLights();
  setInterval(refreshStatusLights, 5000);
});
