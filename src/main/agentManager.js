//=================================================================================================
// agentManager.js
// 에이전트 세션(pty 프로세스)을 관리한다. 각 에이전트는 지정 폴더를 작업 디렉토리로 삼아
// AI 코딩 에이전트 CLI 를 백그라운드에서 구동하며, 입출력은 리스너를 통해 메인 프로세스로 전달된다.
//=================================================================================================

const System = globalThis;
const pty = require("node-pty");

const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;
const TERMINAL_NAME = "xterm-256color";

//=================================================================================================
// 에이전트 종류별 실행 명령. (현재는 Claude Code 만 지원)
//=================================================================================================
const AGENT_COMMANDS =
{
    "claude-code":
    {
        command: "claude",
        windowsCommand: "claude.cmd",
        args: []
    }
};

const sessions = new System.Map();
let dataListener = null;
let exitListener = null;

//=================================================================================================
// 에이전트 종류에 해당하는 실행 명령 정의를 반환한다. (모르는 종류면 null)
//=================================================================================================
function getCommandDefinition(agentKind)
{
    const commandDefinition = AGENT_COMMANDS[agentKind];
    if (commandDefinition === undefined)
    {
        return null;
    }
    return commandDefinition;
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
// 에이전트 세션을 시작한다. 이미 실행 중이면 그대로 성공으로 반환한다.
//=================================================================================================
function startAgent(agentId, workingDirectory, agentKind)
{
    const existingSession = sessions.get(agentId);
    if (existingSession !== undefined)
    {
        const alreadyRunningResult =
        {
            ok: true,
            running: true
        };
        return alreadyRunningResult;
    }

    const commandDefinition = getCommandDefinition(agentKind);
    if (commandDefinition === null)
    {
        const unknownKindResult =
        {
            ok: false,
            reason: "unknown-kind"
        };
        return unknownKindResult;
    }

    let shellCommand = commandDefinition.command;
    if (process.platform === "win32")
    {
        shellCommand = commandDefinition.windowsCommand;
    }
    const commandArguments = commandDefinition.args;

    const spawnOptions =
    {
        name: TERMINAL_NAME,
        cols: DEFAULT_COLUMNS,
        rows: DEFAULT_ROWS,
        cwd: workingDirectory,
        env: process.env
    };

    let ptyProcess = null;
    try
    {
        ptyProcess = pty.spawn(shellCommand, commandArguments, spawnOptions);
    }
    catch (spawnError)
    {
        const spawnFailedResult =
        {
            ok: false,
            reason: "spawn-failed",
            message: spawnError.message
        };
        return spawnFailedResult;
    }

    const session =
    {
        id: agentId,
        directory: workingDirectory,
        kind: agentKind,
        pty: ptyProcess
    };
    sessions.set(agentId, session);

    ptyProcess.onData(function (data)
    {
        if (dataListener !== null)
        {
            dataListener(agentId, data);
        }
    });
    ptyProcess.onExit(function (exitInfo)
    {
        sessions.delete(agentId);
        if (exitListener !== null)
        {
            exitListener(agentId, exitInfo);
        }
    });

    const successResult =
    {
        ok: true,
        running: true
    };
    return successResult;
}

//=================================================================================================
// 에이전트에 입력 데이터를 전달한다.
//=================================================================================================
function writeToAgent(agentId, data)
{
    const session = sessions.get(agentId);
    if (session === undefined)
    {
        return;
    }
    const ptyProcess = session.pty;
    ptyProcess.write(data);
}

//=================================================================================================
// 에이전트 터미널 크기를 변경한다.
//=================================================================================================
function resizeAgent(agentId, columns, rows)
{
    const session = sessions.get(agentId);
    if (session === undefined)
    {
        return;
    }
    const ptyProcess = session.pty;
    ptyProcess.resize(columns, rows);
}

//=================================================================================================
// 에이전트 세션을 종료한다.
//=================================================================================================
function stopAgent(agentId)
{
    const session = sessions.get(agentId);
    if (session === undefined)
    {
        return false;
    }
    const ptyProcess = session.pty;
    ptyProcess.kill();
    return true;
}

//=================================================================================================
// 해당 에이전트가 실행 중인지 여부를 반환한다.
//=================================================================================================
function isAgentRunning(agentId)
{
    const session = sessions.get(agentId);
    if (session === undefined)
    {
        return false;
    }
    return true;
}

//=================================================================================================
// 현재 실행 중인 에이전트 아이디 목록을 반환한다.
//=================================================================================================
function listRunningAgentIds()
{
    const runningAgentIds = [];
    for (const session of sessions.values())
    {
        const agentId = session.id;
        runningAgentIds.push(agentId);
    }
    return runningAgentIds;
}

//=================================================================================================
// 모든 에이전트 세션을 종료한다. (앱 종료 시 정리용)
//=================================================================================================
function stopAllAgents()
{
    for (const session of sessions.values())
    {
        const ptyProcess = session.pty;
        ptyProcess.kill();
    }
    sessions.clear();
}

module.exports =
{
    setDataListener,
    setExitListener,
    startAgent,
    writeToAgent,
    resizeAgent,
    stopAgent,
    isAgentRunning,
    listRunningAgentIds,
    stopAllAgents
};
