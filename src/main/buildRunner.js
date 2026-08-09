//=================================================================================================
// buildRunner.js
// ADE 가 정의한 고정 액션(빌드 · 점검 · 엔진 버전 적용)을 실행한다.
// 명령이 고정되어 있으므로 사용자가 버튼으로 실행하든 에이전트가 실행하든 결과가 같다.
//=================================================================================================

const System = globalThis;
const { spawn } = require("node:child_process");

//=================================================================================================
// 실행 가능한 액션 정의. 여기 없는 명령은 액션으로 실행하지 않는다.
//=================================================================================================
const ACTIONS =
[
    {
        id: "web-build",
        command: "npm",
        windowsCommand: "npm.cmd",
        args: ["run", "build"]
    },
    {
        id: "asset-check",
        command: "npm",
        windowsCommand: "npm.cmd",
        args: ["run", "check"]
    },
    {
        id: "install",
        command: "npm",
        windowsCommand: "npm.cmd",
        args: ["install", "--ignore-scripts"]
    }
];

// 실행 중인 액션. (agentId → { child, actionId })
const runningActions = new System.Map();

let outputListener = null;

//=================================================================================================
// 액션 출력/종료를 받을 리스너를 등록한다. listener: (agentId, actionEvent) => void
//=================================================================================================
function setOutputListener(listener)
{
    outputListener = listener;
}

//=================================================================================================
// 액션 이벤트를 리스너로 전달한다.
//=================================================================================================
function emitEvent(agentId, actionEvent)
{
    if (outputListener === null)
    {
        return;
    }
    outputListener(agentId, actionEvent);
}

//=================================================================================================
// 액션 아이디로 정의를 찾는다. (없으면 null)
//=================================================================================================
function getActionDefinition(actionId)
{
    for (const actionDefinition of ACTIONS)
    {
        if (actionDefinition.id === actionId)
        {
            return actionDefinition;
        }
    }
    return null;
}

//=================================================================================================
// 액션의 실제 실행 명령 문자열을 반환한다. (에이전트에게 알려줄 때 사용)
//=================================================================================================
function getActionCommandText(actionId)
{
    const actionDefinition = getActionDefinition(actionId);
    if (actionDefinition === null)
    {
        return "";
    }
    const commandText = actionDefinition.command + " " + actionDefinition.args.join(" ");
    return commandText;
}

//=================================================================================================
// 액션을 실행한다. 같은 에이전트에서 이미 실행 중이면 거절한다.
//=================================================================================================
function runAction(agentId, projectDirectoryPath, actionId)
{
    const existingAction = runningActions.get(agentId);
    if (existingAction !== undefined)
    {
        const busyResult =
        {
            ok: false,
            reason: "busy"
        };
        return busyResult;
    }

    const actionDefinition = getActionDefinition(actionId);
    if (actionDefinition === null)
    {
        const unknownResult =
        {
            ok: false,
            reason: "unknown-action"
        };
        return unknownResult;
    }

    let runCommand = actionDefinition.command;
    if (process.platform === "win32")
    {
        runCommand = actionDefinition.windowsCommand;
    }

    const spawnOptions =
    {
        cwd: projectDirectoryPath,
        env: process.env
    };

    let childProcess = null;
    try
    {
        childProcess = spawn(runCommand, actionDefinition.args, spawnOptions);
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

    const runningAction =
    {
        child: childProcess,
        actionId: actionId
    };
    runningActions.set(agentId, runningAction);

    const startedEvent =
    {
        type: "started",
        actionId: actionId
    };
    emitEvent(agentId, startedEvent);

    childProcess.stdout.on("data", function (chunk)
    {
        const outputEvent =
        {
            type: "output",
            actionId: actionId,
            text: chunk.toString()
        };
        emitEvent(agentId, outputEvent);
    });

    childProcess.stderr.on("data", function (chunk)
    {
        const outputEvent =
        {
            type: "output",
            actionId: actionId,
            text: chunk.toString()
        };
        emitEvent(agentId, outputEvent);
    });

    childProcess.on("error", function (processError)
    {
        runningActions.delete(agentId);
        const errorEvent =
        {
            type: "finished",
            actionId: actionId,
            ok: false,
            message: processError.message
        };
        emitEvent(agentId, errorEvent);
    });

    childProcess.on("close", function (exitCode)
    {
        runningActions.delete(agentId);
        const isSuccess = exitCode === 0;
        const finishedEvent =
        {
            type: "finished",
            actionId: actionId,
            ok: isSuccess,
            exitCode: exitCode
        };
        emitEvent(agentId, finishedEvent);
    });

    const successResult =
    {
        ok: true
    };
    return successResult;
}

//=================================================================================================
// 실행 중인 액션을 중단한다.
//=================================================================================================
function cancelAction(agentId)
{
    const runningAction = runningActions.get(agentId);
    if (runningAction === undefined)
    {
        return false;
    }
    const childProcess = runningAction.child;
    childProcess.kill();
    runningActions.delete(agentId);
    return true;
}

//=================================================================================================
// 해당 에이전트에서 액션이 실행 중인지 여부를 반환한다.
//=================================================================================================
function isRunning(agentId)
{
    const runningAction = runningActions.get(agentId);
    if (runningAction === undefined)
    {
        return false;
    }
    return true;
}

//=================================================================================================
// 실행 중인 모든 액션을 중단한다. (앱 종료 시 정리용)
//=================================================================================================
function cancelAll()
{
    for (const runningAction of runningActions.values())
    {
        const childProcess = runningAction.child;
        childProcess.kill();
    }
    runningActions.clear();
}

module.exports =
{
    ACTIONS,
    getActionCommandText,
    setOutputListener,
    runAction,
    cancelAction,
    isRunning,
    cancelAll
};
