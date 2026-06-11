import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
];
const chrome = chromeCandidates.find(existsSync);

if (!chrome) {
  throw new Error("Google Chrome was not found.");
}

const profile = path.join(tmpdir(), "bantubuzz-cms-repair-check");
rmSync(profile, { recursive: true, force: true });

const child = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--no-first-run",
    "--remote-debugging-port=9231",
    `--user-data-dir=${profile}`,
    "about:blank"
  ],
  { stdio: "ignore", windowsHide: true }
);

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getBrowserTab() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const tabs = await fetch("http://127.0.0.1:9231/json").then((response) => response.json());
      const tab = tabs.find((candidate) => candidate.type === "page");
      if (tab) return tab;
    } catch {
      // Chrome may still be starting.
    }
    await wait(500);
  }
  throw new Error("Chrome debugging endpoint did not become ready.");
}

async function sendCommand(socket, pending, method, params = {}) {
  const id = pending.nextId++;
  return new Promise((resolve) => {
    pending.requests.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
}

try {
  const tab = await getBrowserTab();
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = { nextId: 1, requests: new Map() };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const resolve = pending.requests.get(message.id);
    if (resolve) {
      pending.requests.delete(message.id);
      resolve(message);
    }
  };

  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  await sendCommand(socket, pending, "Page.enable");
  await sendCommand(socket, pending, "Runtime.enable");
  await sendCommand(socket, pending, "Page.navigate", {
    url: "https://app.bantubuzz.com/admin/create-first-user"
  });
  await wait(10_000);

  const response = await sendCommand(socket, pending, "Runtime.evaluate", {
    expression:
      "JSON.stringify({url:location.href,text:document.body.innerText,forms:document.forms.length,inputs:document.querySelectorAll('input').length})",
    returnByValue: true
  });
  socket.close();

  const state = JSON.parse(response.result.result.value);
  console.log(JSON.stringify(state));

  if (state.forms < 1 || state.inputs < 1 || !state.text.includes("Create first user")) {
    throw new Error("The CMS first-user form did not render.");
  }
} finally {
  child.kill();
  rmSync(profile, { recursive: true, force: true });
}
