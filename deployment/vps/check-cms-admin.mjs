import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
];
const chrome = chromeCandidates.find(existsSync);
const targetUrl =
  process.argv[2] ?? "https://app.bantubuzz.com/admin/create-first-user";

if (!chrome) {
  throw new Error("Google Chrome was not found.");
}

const profile = path.join(
  tmpdir(),
  `bantubuzz-cms-check-${Date.now()}-${Math.random().toString(16).slice(2)}`
);
const result = spawnSync(
  chrome,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-extensions",
    "--no-first-run",
    `--user-data-dir=${profile}`,
    "--virtual-time-budget=12000",
    "--dump-dom",
    targetUrl
  ],
  {
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true
  }
);

if (result.error) {
  throw result.error;
}

const html = result.stdout ?? "";
const state = {
  url: targetUrl,
  form: html.includes("<form"),
  inputs: (html.match(/<input/g) ?? []).length,
  welcome: html.includes("To begin, create your first user.")
};

console.log(JSON.stringify(state));

if (result.status !== 0 || !state.form || state.inputs < 1 || !state.welcome) {
  if (result.stderr) {
    console.error(result.stderr);
  }
  throw new Error("The CMS first-user form did not render.");
}
