//=================================================================================================
// agentManager.js
// 에이전트(= 터미널 세션)를 관리한다. 각 에이전트는 pty 프로세스 하나로 백그라운드에서 상주하며,
// 여러 개를 동시에 띄울 수 있다. 입출력은 리스너를 통해 메인 프로세스로 전달된다.
//=================================================================================================

const System = globalThis;
const pty = require("node-pty");
const nodeOs = require("node:os");

const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;
const TERMINAL_NAME = "xterm-color";

let nextAgentId = 1;
const agents = new System.Map();
let dataListener = null;
let exitListener = null;

//=================================================================================================
// 플랫폼 기본 셸 명령을 반환한다.
//=================================================================================================
function getDefaultShell()
{
    if (process.platform === "win32")
    {
        return "powershell.exe";
    }
    const shellFromEnvironment = process.env.SHELL;
    if (shellFromEnvironment !== undefined && shellFromEnvironment.length > 0)
    {
        return shellFromEnvironment;
    }
    return "bash";
}

//=================================================================================================
// pty 출력 데이터를 받을 리스너를 등록한다. listener: (agentId, data) => void
//=================================================================================================
function setDataListener(listener)
{
    dataListener = listener;
}

//=================================================================================================
// pty 종료를 받을 리스너를 등록한다. listener: (agentId, exitInfo) => void
//=================================================================================================
function setExitListener(listener)
{
    exitListener = listener;
}

//=================================================================================================
// 새 에이전트(터미널 세션)를 생성하고 요약 정보를 반환한다.
//=================================================================================================
function createAgent(workingDirectory)
{
    const agentId = nextAgentId;
    nextAgentId += 1;

    const shellCommand = getDefaultShell();
    let resolvedWorkingDirectory = workingDirectory;
    if (resolvedWorkingDirectory === null || resolvedWorkingDirectory === undefined)
    {
        resolvedWorkingDirectory = nodeOs.homedir();
    }

    const spawnOptions =
    {
        name: TERMINAL_NAME,
        cols: DEFAULT_COLUMNS,
        rows: DEFAULT_ROWS,
        cwd: resolvedWorkingDirectory,
        env: process.env
    };
    const ptyProcess = pty.spawn(shellCommand, [], spawnOptions);

    const agent =
    {
        id: agentId,
        title: "Agent " + agentId,
        cwd: resolvedWorkingDirectory,
        pty: ptyProcess
    };
    agents.set(agentId, agent);

    ptyProcess.onData(function (data)
    {
        if (dataListener !== null)
        {
            dataListener(agentId, data);
        }
    });
    ptyProcess.onExit(function (exitInfo)
    {
        agents.delete(agentId);
        if (exitListener !== null)
        {
            exitListener(agentId, exitInfo);
        }
    });

    const agentInfo =
    {
        id: agentId,
        title: agent.title,
        cwd: agent.cwd
    };
    return agentInfo;
}

//=================================================================================================
// 에이전트에 입력 데이터를 전달한다.
//=================================================================================================
function writeToAgent(agentId, data)
{
    const agent = agents.get(agentId);
    if (agent === undefined)
    {
        return;
    }
    const ptyProcess = agent.pty;
    ptyProcess.write(data);
}

//=================================================================================================
// 에이전트 터미널 크기를 변경한다.
//=================================================================================================
function resizeAgent(agentId, columns, rows)
{
    const agent = agents.get(agentId);
    if (agent === undefined)
    {
        return;
    }
    const ptyProcess = agent.pty;
    ptyProcess.resize(columns, rows);
}

//=================================================================================================
// 에이전트를 종료한다.
//=================================================================================================
function killAgent(agentId)
{
    const agent = agents.get(agentId);
    if (agent === undefined)
    {
        return;
    }
    const ptyProcess = agent.pty;
    ptyProcess.kill();
}

//=================================================================================================
// 현재 살아있는 에이전트 요약 목록을 반환한다.
//=================================================================================================
function listAgents()
{
    const agentInfoList = [];
    for (const agent of agents.values())
    {
        const agentInfo =
        {
            id: agent.id,
            title: agent.title,
            cwd: agent.cwd
        };
        agentInfoList.push(agentInfo);
    }
    return agentInfoList;
}

//=================================================================================================
// 모든 에이전트를 종료한다. (앱 종료 시 정리용)
//=================================================================================================
function killAllAgents()
{
    for (const agent of agents.values())
    {
        const ptyProcess = agent.pty;
        ptyProcess.kill();
    }
    agents.clear();
}

module.exports =
{
    setDataListener,
    setExitListener,
    createAgent,
    writeToAgent,
    resizeAgent,
    killAgent,
    listAgents,
    killAllAgents
};
