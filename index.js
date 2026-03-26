import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

const profile = {
  id: "novachain-agents",
  name: "NovaChain Agents",
  version: "1.0.0",
  tagline: "A2A command center with an MCP control dashboard",
  description: "A control-room style runtime for coordinating execution agents, wallet-linked signals, and MCP operations from a single dashboard.",
  heroLabel: "Swarm Dashboard",
  author: "dataweb",
  theme: {
    page: "#07131f",
    panel: "rgba(9, 22, 36, 0.88)",
    panelEdge: "rgba(67, 209, 255, 0.18)",
    accent: "#27c1ff",
    accentSoft: "#80f3ff",
    glow: "rgba(39, 193, 255, 0.20)"
  },
  agents: {
    dispatcher: (task) => `Dispatcher assigned the next lane for ${task}.`,
    observer: (task) => `Observer tracked runtime anomalies around ${task}.`,
    finisher: (task) => `Finisher prepared the final execution checklist for ${task}.`
  },
  tools: [
    {
      name: "agent_status",
      description: "Audit live agent health, queue pressure, and assignment load.",
      inputSchema: { type: "object", properties: { lane: { type: "string", description: "Agent lane or squad name" } }, required: ["lane"] }
    },
    {
      name: "route_task",
      description: "Route an incoming task to the most appropriate execution lane.",
      inputSchema: { type: "object", properties: { task: { type: "string", description: "Task to route" } }, required: ["task"] }
    },
    {
      name: "wallet_watch",
      description: "Track wallet-aware triggers for automation or alerts.",
      inputSchema: { type: "object", properties: { wallet: { type: "string", description: "Wallet address or label" } }, required: ["wallet"] }
    },
    {
      name: "health_audit",
      description: "Generate a control-room style summary of current runtime health.",
      inputSchema: { type: "object", properties: { window: { type: "string", description: "Time window to audit" } }, required: ["window"] }
    },
    {
      name: "multi_agent",
      description: "Run dispatcher, observer, and finisher in sequence.",
      inputSchema: { type: "object", properties: { task: { type: "string", description: "Mission to coordinate" } }, required: ["task"] }
    }
  ],
  prompts: [
    {
      name: "swarm_setup",
      description: "Build an operating plan for a new agent swarm.",
      arguments: [{ name: "mission", description: "Mission objective", required: false }]
    },
    {
      name: "mcp_playbook",
      description: "Generate an MCP usage playbook for control-room operators.",
      arguments: [{ name: "scope", description: "Operational scope to cover", required: false }]
    }
  ],
  skills: [
    { name: "agent_status", description: "Audit live agent health, queue pressure, and assignment load." },
    { name: "route_task", description: "Route incoming jobs to the best available agent lane." },
    { name: "wallet_watch", description: "Watch wallet-linked signals and agent-trigger conditions." },
    { name: "health_audit", description: "Generate control-room style health summaries." },
    { name: "mcp_playbook", description: "Prepare MCP operating prompts for the swarm." },
    { name: "swarm_setup", description: "Design a multi-agent operating plan for a mission." }
  ],
  resources: [
    {
      uri: "resource://novachain/dashboard-metrics",
      name: "dashboard_metrics",
      description: "Live dashboard metrics for agent throughput and task health.",
      mimeType: "application/json"
    },
    {
      uri: "resource://novachain/agent-registry",
      name: "agent_registry",
      description: "Registry of active NovaChain lanes and their status.",
      mimeType: "application/json"
    }
  ]
};

const memory = {};

function getBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  return `${protocol}://${req.get("host")}`;
}

function getSessionId(req) {
  return req.headers["x-session-id"] || "default";
}

function ensureSession(sessionId) {
  if (!memory[sessionId]) memory[sessionId] = [];
  return memory[sessionId];
}

function logEntry(sessionId, entry) {
  ensureSession(sessionId).push({ timestamp: Date.now(), ...entry });
}

function rpcSuccess(id, result) { return { jsonrpc: "2.0", id, result }; }
function rpcError(id, code, message) { return { jsonrpc: "2.0", id: id ?? null, error: { code, message } }; }
function makeText(text) { return { content: [{ type: "text", text }] }; }

function buildAgentCard(req) {
  const baseUrl = getBaseUrl(req);
  return {
    name: profile.name,
    description: profile.description,
    url: `${baseUrl}/`,
    version: profile.version,
    author: profile.author,
    capabilities: ["mcp", "a2a", "tools", "prompts", "resources"],
    endpoints: { mcp: `${baseUrl}/mcp`, a2a: `${baseUrl}/a2a`, agentCard: `${baseUrl}/.well-known/agent-card.json` },
    skills: profile.skills
  };
}

function getOverview(req) {
  return {
    profile: profile.id,
    serverInfo: { name: profile.name, version: profile.version },
    protocol: "MCP over JSON-RPC 2.0",
    transport: { endpoint: `${getBaseUrl(req)}/mcp`, method: "POST", contentType: "application/json" },
    capabilities: { tools: {}, prompts: {}, resources: {} },
    tools: profile.tools,
    prompts: profile.prompts,
    resources: profile.resources
  };
}

function executeTool(toolName, args, sessionId) {
  logEntry(sessionId, { type: "tool", name: toolName, arguments: args });
  if (toolName === "agent_status") return makeText(`Lane ${args.lane} is green. Queue pressure is moderate and no critical drift is detected.`);
  if (toolName === "route_task") return makeText(`Task routed: ${args.task}. Best match is the execution lane with wallet-aware handlers enabled.`);
  if (toolName === "wallet_watch") return makeText(`Wallet watch active for ${args.wallet}. Trigger map shows inflow alerting and automation hooks armed.`);
  if (toolName === "health_audit") return makeText(`Health audit for ${args.window}: 97.8% success rate, one queue spike, and no agent downtime.`);
  if (toolName === "multi_agent") return makeText(["NovaChain multi-agent run complete.", profile.agents.dispatcher(args.task), profile.agents.observer(args.task), profile.agents.finisher(args.task)].join("\n"));
  throw new Error(`Unknown tool: ${toolName}`);
}

function getPrompt(promptName, args = {}) {
  if (promptName === "swarm_setup") {
    const mission = args.mission || "a high-priority wallet automation mission";
    return { description: "Swarm setup prompt.", messages: [{ role: "user", content: { type: "text", text: `Design an agent swarm for ${mission}. Include control lanes, monitoring roles, fallback paths, and escalation rules.` } }] };
  }
  if (promptName === "mcp_playbook") {
    const scope = args.scope || "runtime operators";
    return { description: "MCP playbook prompt.", messages: [{ role: "user", content: { type: "text", text: `Write an MCP operations playbook for ${scope}. Cover initialize, tool routing, resource reads, alert handling, and health review.` } }] };
  }
  throw new Error(`Unknown prompt: ${promptName}`);
}

function readResource(uri) {
  if (uri === "resource://novachain/dashboard-metrics") {
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ activeAgents: 12, queueDepth: 34, liveWalletWatches: 58, successRate: 97.8 }, null, 2) }] };
  }
  if (uri === "resource://novachain/agent-registry") {
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ lanes: [
      { name: "dispatch-core", status: "healthy", tasks: 14 },
      { name: "observer-grid", status: "healthy", tasks: 9 },
      { name: "finisher-lane", status: "warming", tasks: 4 }
    ] }, null, 2) }] };
  }
  throw new Error(`Unknown resource: ${uri}`);
}

function runA2A(agentName, task, sessionId) {
  const agent = profile.agents[agentName];
  if (!agent) throw new Error(`Unknown agent: ${agentName}`);
  logEntry(sessionId, { type: "a2a", agent: agentName, task });
  return { agent: agentName, result: agent(task || "default task"), status: "ok", profile: profile.id };
}

function handleRpc(req, res) {
  const body = req.body || {};
  const id = body.id ?? null;
  const method = body.method;
  const params = body.params || {};
  const sessionId = getSessionId(req);
  if (!method) return res.status(400).json(rpcError(id, -32600, "Missing JSON-RPC method"));

  try {
    if (method === "initialize") return res.json(rpcSuccess(id, { protocolVersion: "2024-11-05", capabilities: { tools: {}, prompts: {}, resources: {} }, serverInfo: { name: profile.name, version: profile.version }, instructions: "Use tools/list, prompts/list, and resources/list to inspect NovaChain capabilities." }));
    if (method === "ping") return res.json(rpcSuccess(id, {}));
    if (method === "notifications/initialized") return id === null ? res.status(202).end() : res.json(rpcSuccess(id, {}));
    if (method === "tools/list") return res.json(rpcSuccess(id, { tools: profile.tools }));
    if (method === "tools/call") return res.json(rpcSuccess(id, executeTool(params.name, params.arguments || {}, sessionId)));
    if (method === "prompts/list") return res.json(rpcSuccess(id, { prompts: profile.prompts }));
    if (method === "prompts/get") return res.json(rpcSuccess(id, getPrompt(params.name, params.arguments || {})));
    if (method === "resources/list") return res.json(rpcSuccess(id, { resources: profile.resources }));
    if (method === "resources/read") return res.json(rpcSuccess(id, readResource(params.uri)));
    return res.status(404).json(rpcError(id, -32601, `Method not found: ${method}`));
  } catch (error) {
    return res.status(400).json(rpcError(id, -32000, error instanceof Error ? error.message : "Internal error"));
  }
}

function buildUi() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${profile.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    :root{--page:#07131f;--panel:rgba(9,22,36,.88);--edge:rgba(67,209,255,.18);--accent:#27c1ff;--soft:#80f3ff;--text:#edfaff;--muted:#98b8c6;--line:rgba(255,255,255,.08)}
    *{box-sizing:border-box}body{margin:0;font-family:"Manrope",sans-serif;background:radial-gradient(circle at 12% 10%,rgba(39,193,255,.18),transparent 24%),linear-gradient(180deg,rgba(255,255,255,.02),transparent 16%),var(--page);color:var(--text)}
    .shell{max-width:1240px;margin:0 auto;padding:24px}.hero,.panel{border:1px solid var(--edge);background:linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.015)),var(--panel);border-radius:28px;box-shadow:0 26px 70px rgba(0,0,0,.32)}
    .hero{padding:30px}.hero-grid,.dashboard,.stats,.mini-grid{display:grid;gap:18px}.hero-grid{grid-template-columns:1.15fr .85fr;align-items:end}.dashboard{grid-template-columns:1.1fr .9fr;margin-top:24px}.stats,.mini-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    .eyebrow,.badge{display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;border:1px solid var(--edge);background:rgba(255,255,255,.04);color:var(--soft);font-size:12px;text-transform:uppercase;letter-spacing:.13em}
    h1,h2,h3{margin:0;font-family:"Space Grotesk",sans-serif;letter-spacing:-.03em}h1{margin-top:16px;font-size:clamp(42px,8vw,78px);line-height:.94;max-width:10ch}p{color:var(--muted);line-height:1.7}
    .hero-actions,.toolbar{display:flex;gap:10px;flex-wrap:wrap}.hero-actions{margin-top:22px}.btn,button{border:0;border-radius:14px;padding:12px 16px;font:inherit;font-weight:800;cursor:pointer;transition:transform .2s ease,filter .2s ease}.btn,button{background:linear-gradient(135deg,var(--accent),var(--soft));color:#061019}.btn.alt{background:rgba(255,255,255,.04);color:var(--text);border:1px solid var(--line)}.btn:hover,button:hover{transform:translateY(-1px);filter:brightness(1.04)}
    .card,.lane,.item{border-radius:22px;border:1px solid var(--line);background:rgba(255,255,255,.03);padding:18px}.card strong,.lane strong{display:block;margin-top:8px;font-size:26px;font-family:"Space Grotesk",sans-serif}.panel{padding:22px}.section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}.list{display:grid;gap:12px}.lane{display:flex;justify-content:space-between;align-items:start;gap:16px}.status{color:var(--soft);font-size:13px}.endpoint code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.endpoint{padding:16px;border-radius:18px;border:1px solid var(--line);background:rgba(255,255,255,.03)}.endpoint code{display:block;margin-top:8px;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.22);color:#c8f6ff;overflow-wrap:anywhere}.endpoint-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mini-grid .card{min-height:140px}pre{margin:14px 0 0;min-height:280px;max-height:460px;overflow:auto;padding:16px;border-radius:18px;background:rgba(0,0,0,.34);color:#dff9ff;border:1px solid rgba(128,243,255,.1)}@media (max-width:980px){.hero-grid,.dashboard,.stats,.mini-grid,.endpoint-grid{grid-template-columns:1fr}}@media (max-width:640px){.shell{padding:16px}.hero,.panel{padding:18px;border-radius:24px}h1{font-size:46px}}
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${profile.heroLabel}</span>
          <h1>Command your A2A swarm with a live MCP dashboard.</h1>
          <p>${profile.description} NovaChain feels like a control room: active lanes, route decisions, wallet triggers, and a single launch surface for scanners, operators, and agent clients.</p>
          <div class="hero-actions">
            <a class="btn" href="#console">Open live console</a>
            <a class="btn alt" href="/.well-known/agent-card.json">Open agent card</a>
          </div>
        </div>
        <div class="stats">
          <div class="card"><span class="badge">Agents</span><strong>${Object.keys(profile.agents).length}</strong><p>Dispatcher, observer, finisher</p></div>
          <div class="card"><span class="badge">Tools</span><strong>${profile.tools.length}</strong><p>Live MCP capabilities</p></div>
          <div class="card"><span class="badge">Prompts</span><strong>${profile.prompts.length}</strong><p>Swarm playbooks</p></div>
          <div class="card"><span class="badge">Resources</span><strong>${profile.resources.length}</strong><p>Runtime dashboards</p></div>
        </div>
      </div>
    </section>

    <section class="dashboard">
      <div class="panel">
        <div class="section-head"><h2>Active Lanes</h2><span class="badge">A2A</span></div>
        <div class="list">
          <div class="lane"><div><strong>Dispatch Core</strong><p>Routes missions based on queue pressure and policy.</p></div><span class="status">Healthy</span></div>
          <div class="lane"><div><strong>Observer Grid</strong><p>Monitors wallet-linked triggers and runtime anomalies.</p></div><span class="status">Watching</span></div>
          <div class="lane"><div><strong>Finisher Lane</strong><p>Prepares mission closure, handoff, and final payloads.</p></div><span class="status">Ready</span></div>
        </div>
      </div>
      <div class="panel">
        <div class="section-head"><h2>Endpoints</h2><span class="badge">Routes</span></div>
        <div class="endpoint-grid">
          <div class="endpoint"><span class="badge">MCP</span><code>/mcp</code></div>
          <div class="endpoint"><span class="badge">A2A</span><code>/a2a</code></div>
          <div class="endpoint"><span class="badge">Card</span><code>/.well-known/agent-card.json</code></div>
          <div class="endpoint"><span class="badge">Resource</span><code>/resources/dashboard_metrics</code></div>
        </div>
      </div>
      <div class="panel">
        <div class="section-head"><h2>Tools</h2><span class="badge">MCP</span></div>
        <div class="mini-grid">${profile.tools.map((tool) => `<div class="card"><strong>${tool.name}</strong><p>${tool.description}</p></div>`).join("")}</div>
      </div>
      <div class="panel" id="console">
        <div class="section-head"><h2>Live Console</h2><span class="badge">JSON-RPC</span></div>
        <div class="toolbar"><button id="initializeBtn">Initialize</button><button id="toolsBtn">Tools List</button><button id="toolCallBtn">Call First Tool</button><button id="resourceBtn">Read First Resource</button><button id="a2aBtn">Run A2A</button></div>
        <pre id="output">Use the controls to inspect NovaChain MCP and A2A responses.</pre>
      </div>
    </section>
  </div>
  <script>
    const sampleToolArgs={agent_status:{lane:'dispatch-core'},route_task:{task:'rebalance alert mission'},wallet_watch:{wallet:'smart-wallet-07'},health_audit:{window:'last 6 hours'},multi_agent:{task:'priority wallet response'}};
    async function postJson(body,endpoint){const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return response.json();}
    document.getElementById('initializeBtn').addEventListener('click',async function(){const data=await postJson({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'ui-tester',version:'1.0.0'}}},'/mcp');document.getElementById('output').textContent=JSON.stringify(data,null,2);});
    document.getElementById('toolsBtn').addEventListener('click',async function(){const data=await postJson({jsonrpc:'2.0',id:2,method:'tools/list'},'/mcp');document.getElementById('output').textContent=JSON.stringify(data,null,2);});
    document.getElementById('toolCallBtn').addEventListener('click',async function(){const firstTool='agent_status';const data=await postJson({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:firstTool,arguments:sampleToolArgs[firstTool]}},'/mcp');document.getElementById('output').textContent=JSON.stringify(data,null,2);});
    document.getElementById('resourceBtn').addEventListener('click',async function(){const data=await postJson({jsonrpc:'2.0',id:4,method:'resources/read',params:{uri:'resource://novachain/dashboard-metrics'}},'/mcp');document.getElementById('output').textContent=JSON.stringify(data,null,2);});
    document.getElementById('a2aBtn').addEventListener('click',async function(){const data=await postJson({agent:'dispatcher',task:'priority wallet response'},'/a2a');document.getElementById('output').textContent=JSON.stringify(data,null,2);});
  </script>
</body>
</html>`;
}

app.get("/.well-known/agent-card.json", (req, res) => { res.json(buildAgentCard(req)); });
app.get("/mcp", (req, res) => { res.json(getOverview(req)); });
app.post("/mcp", (req, res) => {
  if (req.body?.jsonrpc === "2.0") return handleRpc(req, res);
  const sessionId = getSessionId(req);
  try {
    const result = executeTool(req.body?.tool || profile.tools[0].name, req.body?.input || {}, sessionId);
    return res.json({ output: { profile: profile.id, result: result.content[0].text, agent: profile.name } });
  } catch {
    return res.status(400).json({ output: { profile: profile.id, result: "Recovered from error", agent: profile.name } });
  }
});
app.get("/resources/:resourceName", (req, res) => {
  const resource = profile.resources.find((item) => item.name === req.params.resourceName);
  if (!resource) return res.status(404).json({ error: "Resource not found" });
  return res.json(JSON.parse(readResource(resource.uri).contents[0].text));
});
app.post("/a2a", (req, res) => {
  try { res.json(runA2A(req.body?.agent, req.body?.task, getSessionId(req))); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "A2A failed" }); }
});
app.get("/", (req, res) => { res.send(buildUi()); });

export default app;
