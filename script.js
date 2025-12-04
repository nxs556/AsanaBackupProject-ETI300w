const API_BASE = "https://qf91r7lrw8.execute-api.us-east-1.amazonaws.com/prod";

function getClientKey() {
  return document.getElementById("clientKey").value || "demo-client";
}

function api() {
  return document.getElementById("apiEndpoint").value.trim();
}

function status(text, err=false) {
  document.getElementById("statusBar").textContent = text;
}

function output(obj) {
  document.getElementById("prettyOutput").textContent =
    JSON.stringify(obj, null, 2);
}

// OAuth
document.getElementById("oauthBtn").onclick = () => {
  window.open(
    API_BASE + "/auth/asana/start?client_key=" + encodeURIComponent(getClientKey()),
    "_blank"
  );
};

// Load workspaces
document.getElementById("loadWorkspacesBtn").onclick = async () => {
  const res = await fetch(api(), {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      action: "list_workspaces",
      client_key: getClientKey()
    })
  });

  const data = await res.json();
  const select = document.getElementById("workspaceSelect");
  select.innerHTML = "";

  data.data.forEach(w => {
    const o = document.createElement("option");
    o.value = w.gid;
    o.textContent = w.name;
    select.appendChild(o);
  });

  status("Workspaces loaded");
};

// Save workspace
document.getElementById("saveWorkspaceBtn").onclick = async () => {
  const s = document.getElementById("workspaceSelect");

  await fetch(api(), {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      action: "select_workspace",
      client_key: getClientKey(),
      workspace_gid: s.value,
      workspace_name: s.options[s.selectedIndex].text
    })
  });

  status("Workspace saved");
};

// Status check
document.getElementById("statusBtn").onclick = async () => {
  const res = await fetch(api(), {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      action: "status",
      client_key: getClientKey()
    })
  });

  const data = await res.json();
  output(data);

  if (data.message === "Token found") {
    document.getElementById("asanaLight").className = "light on";
    document.getElementById("dbLight").className = "light on";
  } else {
    document.getElementById("asanaLight").className = "light error";
    document.getElementById("dbLight").className = "light error";
  }
};

// Backup
document.getElementById("backupBtn").onclick = async () => {
  const res = await fetch(api(), {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      action: "backup",
      client_key: getClientKey()
    })
  });

  output(await res.json());
  status("Backup executed");
};

// Download CSV
document.getElementById("downloadBtn").onclick = async () => {
  const res = await fetch(api(), {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      action: "backup",
      client_key: getClientKey(),
      export: "csv"
    })
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "asana_backup.csv";
  a.click();
};

// Clear
document.getElementById("clearBtn").onclick = () => {
  document.getElementById("prettyOutput").textContent = "";
  status("");
};
