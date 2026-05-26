#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import {
  buildArtifact,
  createProject,
  createDeployPlan,
  createVerificationBundle,
  getTemplate,
  listTemplates,
  simulate,
  validateArtifact,
} from "../lib/devkit.mjs";

const args = parseArgs(process.argv.slice(2));

try {
  switch (args.command) {
    case "help":
    case "--help":
    case "-h":
      print(help());
      break;
    case "readiness":
      print({
        ok: true,
        component: "mono-dev",
        version: "0.1.0",
        capabilities: ["templates", "project-new", "build", "validate", "test", "simulate", "trace", "deploy-plan", "verify-bundle", "sidecar-ipc"],
      });
      break;
    case "templates":
      print(listTemplates());
      break;
    case "template-get":
      print(getTemplate(flag("template", args, args.positional[0] ?? "counter-example")));
      break;
    case "new": {
      const name = args.positional[0] ?? "counter";
      const templateId = flag("template", args, "counter-example");
      const out = resolve(flag("out", args, "."));
      const project = createProject(templateId, name, out);
      writeFiles(project.root, project.files);
      print({ created: project.root, project: project.project, template: project.template });
      break;
    }
    case "build": {
      const root = resolve(args.positional[0] ?? ".");
      const artifact = buildRoot(root);
      writeJson(join(root, "target", "mono", "artifact.mrv.json"), artifact);
      print({ artifactHash: artifact.artifactHash, sourceBundleHash: artifact.sourceBundleHash, syscalls: artifact.syscalls });
      break;
    }
    case "validate": {
      const artifact = readJson(resolve(args.positional[0] ?? "target/mono/artifact.mrv.json"));
      const validation = validateArtifact(artifact);
      print(validation);
      if (!validation.ok) process.exitCode = 1;
      break;
    }
    case "test": {
      const artifact = buildRoot(resolve(args.positional[0] ?? "."));
      const validation = validateArtifact(artifact);
      print({ ...validation, artifactHash: artifact.artifactHash });
      if (!validation.ok) process.exitCode = 1;
      break;
    }
    case "simulate": {
      const artifact = buildRoot(resolve(args.positional[0] ?? "."));
      print(simulate(artifact, flag("call", args, "increment")));
      break;
    }
    case "trace": {
      const artifact = buildRoot(resolve(args.positional[0] ?? "."));
      print(simulate(artifact, flag("call", args, "increment")).trace);
      break;
    }
    case "deploy-plan": {
      const rootOrArtifact = resolve(args.positional[0] ?? ".");
      const artifact = rootOrArtifact.endsWith(".json") ? readJson(rootOrArtifact) : buildRoot(rootOrArtifact);
      print(createDeployPlan({
        networkId: flag("network", args, "local-dev"),
        authorityAddress: flag("authority", args, "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4"),
        artifact,
      }));
      break;
    }
    case "call-plan":
      print({
        status: "planned",
        walletApprovalRequired: true,
        planKind: "mrv_call",
        note: "Call planning is scaffolded until canonical call builders are wired.",
      });
      break;
    case "mrc-token-plan":
      print({
        status: "planned",
        walletApprovalRequired: true,
        planKind: "mrc_token_create",
        riskLabels: [{ id: "issuer-review", title: "Issuer review", severity: "info" }],
      });
      break;
    case "verify-bundle": {
      const rootOrArtifact = resolve(args.positional[0] ?? ".");
      const artifact = rootOrArtifact.endsWith(".json") ? readJson(rootOrArtifact) : buildRoot(rootOrArtifact);
      const plan = createDeployPlan({
        networkId: flag("network", args, "local-dev"),
        authorityAddress: flag("authority", args, "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4"),
        artifact,
      });
      print(createVerificationBundle(artifact, plan, rootOrArtifact.endsWith(".json") ? {} : readSources(rootOrArtifact)));
      break;
    }
    case "sidecar-status":
      print({ status: "ready", protocol: "mono.native-dev.ipc.v1", signing: "not-available", submission: "not-available" });
      break;
    case "sidecar":
      runSidecar();
      break;
    default:
      process.stderr.write(help());
      process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const [command = "help", ...rest] = argv;
  const positional = [];
  const flags = new Map();
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value.startsWith("--")) {
      const key = value.slice(2);
      const next = rest[index + 1];
      if (next && !next.startsWith("--")) {
        flags.set(key, next);
        index += 1;
      } else {
        flags.set(key, true);
      }
    } else {
      positional.push(value);
    }
  }
  return { command, positional, flags };
}

function flag(name, parsed, fallback) {
  const value = parsed.flags.get(name);
  return typeof value === "string" ? value : fallback;
}

function buildRoot(root) {
  const project = readJson(join(root, "mono.project.json"));
  return buildArtifact(project, readSources(root));
}

function readSources(root) {
  const out = {};
  walk(root, root, out);
  return out;
}

function walk(root, dir, out) {
  for (const entry of readdirSync(dir)) {
    if (entry === "target" || entry === "node_modules") continue;
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) walk(root, path, out);
    else out[path.slice(root.length + 1)] = readFileSync(path, "utf8");
  }
}

function writeFiles(root, files) {
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function print(value) {
  process.stdout.write(`${typeof value === "string" ? value : JSON.stringify(value, null, 2)}\n`);
}

function help() {
  return `mono-dev commands

mono-dev readiness
mono-dev templates
mono-dev template-get --template counter-example
mono-dev new <name> --template counter-example --out .
mono-dev build [project-root]
mono-dev validate <artifact-json>
mono-dev test [project-root]
mono-dev simulate [project-root]
mono-dev trace [project-root]
mono-dev deploy-plan [project-root-or-artifact] --authority mono1... --network local-dev
mono-dev call-plan [project-root]
mono-dev mrc-token-plan
mono-dev verify-bundle [project-root-or-artifact]
mono-dev sidecar-status
mono-dev sidecar
`;
}

function runSidecar() {
  const protocolVersion = "mono.native-dev.ipc.v1";
  const projectId = `sidecar-${process.pid}`;
  let hostContext = {};
  printIpc({
    direction: "sidecar_to_host",
    kind: "ready",
    protocolVersion,
    devkitVersion: "0.1.0",
  });

  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  lines.on("line", (line) => {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      printIpc({
        direction: "sidecar_to_host",
        kind: "project_event",
        projectId,
        event: "simulation_finished",
        summary: "Ignored malformed host IPC message.",
      });
      return;
    }
    if (message.protocolVersion && message.protocolVersion !== protocolVersion) {
      printIpc({
        direction: "sidecar_to_host",
        kind: "project_event",
        projectId,
        event: "simulation_finished",
        summary: "Ignored host IPC message with unsupported protocol.",
      });
      return;
    }
    if (message.kind === "host_context") {
      hostContext = message;
      printIpc({
        direction: "sidecar_to_host",
        kind: "project_event",
        protocolVersion,
        projectId,
        event: message.selectedProjectRoot ? "opened" : "created",
        summary: message.selectedProjectRoot
          ? `Workspace context accepted: ${message.selectedProjectRoot}`
          : `Host context accepted for ${message.activeNetwork?.name ?? "native development"}.`,
      });
      return;
    }
    if (message.kind === "approval_result") {
      printIpc({
        direction: "sidecar_to_host",
        kind: "project_event",
        protocolVersion,
        projectId,
        event: "simulation_finished",
        summary: message.approved
          ? `Wallet approved request ${message.requestId}.`
          : `Wallet rejected request ${message.requestId}.`,
      });
      return;
    }
    if (message.kind === "devkit_command") {
      handleDevkitCommand({
        message,
        hostContext,
        protocolVersion,
        projectId,
      });
      return;
    }
    if (message.kind === "request_preview_approval") {
      handleDevkitCommand({
        message: { ...message, kind: "devkit_command", command: "deploy_plan", requestId: `preview-${Date.now()}` },
        hostContext,
        protocolVersion,
        projectId,
      });
      return;
    }
    printIpc({
      direction: "sidecar_to_host",
      kind: "project_event",
      protocolVersion,
      projectId,
      event: "simulation_finished",
      summary: `Ignored unsupported host message kind: ${String(message.kind ?? "unknown")}.`,
    });
  });
}

function handleDevkitCommand({ message, hostContext, protocolVersion, projectId }) {
  const command = message.command;
  const requestId = stringValue(message.requestId, `${command ?? "command"}-${Date.now()}`);
  const selectedProjectRoot = message.selectedProjectRoot ?? hostContext.selectedProjectRoot;
  const startedEvent = command === "build" || command === "validate" || command === "test" || command === "simulate" || command === "trace" || command === "deploy_plan"
    ? "build_started"
    : "opened";
  printIpc({
    direction: "sidecar_to_host",
    kind: "project_event",
    protocolVersion,
    projectId,
    event: startedEvent,
    summary: `Started ${formatCommand(command)}.`,
  });
  let result;
  try {
    result = runDevkitCommand({
      command,
      selectedProjectRoot,
      networkId: message.networkId ?? hostContext.activeNetwork?.networkId ?? "local-dev",
      authorityAddress: message.authorityAddress ?? "mono1zg69v7y6hn00qyfzxdz92enh3zv64w7vajvdc4",
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    printIpc({
      direction: "sidecar_to_host",
      kind: "command_result",
      protocolVersion,
      command,
      requestId,
      ok: false,
      preview: true,
      error: messageText,
    });
    printIpc({
      direction: "sidecar_to_host",
      kind: "project_event",
      protocolVersion,
      projectId,
      event: finishEvent(command),
      summary: `${formatCommand(command)} failed: ${messageText}.`,
    });
    return;
  }
  printIpc({
    direction: "sidecar_to_host",
    kind: "command_result",
    protocolVersion,
    command,
    requestId,
    ok: true,
    preview: result.preview,
    output: result.output,
  });
  printIpc({
    direction: "sidecar_to_host",
    kind: "project_event",
    protocolVersion,
    projectId,
    event: finishEvent(command),
    summary: `${formatCommand(command)} completed.`,
  });
  if (command === "deploy_plan" && result.output?.walletApprovalRequest) {
    printIpc({
      direction: "sidecar_to_host",
      kind: "approval_request",
      protocolVersion,
      request: result.output.walletApprovalRequest,
    });
  }
}

function runDevkitCommand({ command, selectedProjectRoot, networkId, authorityAddress }) {
  if (command === "readiness") {
    return {
      preview: false,
      output: {
        ok: true,
        component: "mono-dev",
        version: "0.1.0",
        protocolVersion: "mono.native-dev.ipc.v1",
        capabilities: ["build", "validate", "test", "simulate", "trace", "deploy_plan"],
      },
    };
  }
  const root = requireProjectRoot(command, selectedProjectRoot);
  if (command === "build") {
    const artifact = buildRoot(root);
    writeJson(join(root, "target", "mono", "artifact.mrv.json"), artifact);
    return {
      preview: true,
      output: { artifactHash: artifact.artifactHash, sourceBundleHash: artifact.sourceBundleHash, syscalls: artifact.syscalls },
    };
  }
  if (command === "validate") {
    const artifact = buildRoot(root);
    return { preview: true, output: { ...validateArtifact(artifact), artifactHash: artifact.artifactHash, abiHash: artifact.abiHash } };
  }
  if (command === "test") {
    const artifact = buildRoot(root);
    return { preview: true, output: { ...validateArtifact(artifact), artifactHash: artifact.artifactHash } };
  }
  if (command === "simulate") {
    return { preview: true, output: simulate(buildRoot(root), "increment") };
  }
  if (command === "trace") {
    return { preview: true, output: simulate(buildRoot(root), "increment").trace };
  }
  if (command === "deploy_plan") {
    const artifact = buildRoot(root);
    return {
      preview: true,
      output: createDeployPlan({
        networkId,
        authorityAddress,
        artifact,
      }),
    };
  }
  throw new Error(`unsupported DevKit command: ${String(command ?? "unknown")}`);
}

function requireProjectRoot(command, selectedProjectRoot) {
  if (!selectedProjectRoot) throw new Error(`${formatCommand(command)} requires a selected project root`);
  return resolve(selectedProjectRoot);
}

function finishEvent(command) {
  if (command === "build" || command === "validate" || command === "deploy_plan") return "build_finished";
  if (command === "test") return "test_finished";
  return "simulation_finished";
}

function formatCommand(command) {
  return String(command ?? "command").replaceAll("_", " ");
}

function stringValue(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function printIpc(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}
