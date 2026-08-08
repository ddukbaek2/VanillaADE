//=================================================================================================
// chatSession.js
// 기본 모드(채팅)에서 에이전트 CLI 를 비대화형으로 실행하고, 스트리밍 출력을 이벤트로 전달한다.
// 대화는 세션 아이디로 이어지며, 매 요청마다 프로젝트 설정을 시스템 프롬프트로 주입한다.
//=================================================================================================

const System = globalThis;
const { spawn } = require("node:child_process");
const nodeCrypto = require("node:crypto");
const projectPrompt = require("./projectPrompt");

// 사용자가 모든 권한을 자동 승인하도록 선택했다. 정책을 바꾸려면 이 값만 교체한다.
const PERMISSION_ARGUMENT = "--dangerously-skip-permissions";

const CHAT_COMMAND = "claude";
const CHAT_COMMAND_WINDOWS = "claude.cmd";

// 진행 중인 요청. (agentId → { child, sessionId })
const runningRequests = new System.Map();

let eventListener = null;

//=================================================================================================
// 채팅 이벤트를 받을 리스너를 등록한다. listener: (agentId, chatEvent) => void
//=================================================================================================
function setEventListener(listener)
{
    eventListener = listener;
}

//=================================================================================================
// 채팅 이벤트를 리스너로 전달한다.
//=================================================================================================
function emitEvent(agentId, chatEvent)
{
    if (eventListener === null)
    {
        return;
    }
    eventListener(agentId, chatEvent);
}

//=================================================================================================
// 실행할 명령 이름을 반환한다.
//=================================================================================================
function getChatCommand()
{
    if (process.platform === "win32")
    {
        return CHAT_COMMAND_WINDOWS;
    }
    return CHAT_COMMAND;
}

//=================================================================================================
// 스트리밍 JSON 한 줄을 해석해 채팅 이벤트로 바꾼다. 표시할 내용이 없으면 아무것도 하지 않는다.
//=================================================================================================
function handleStreamLine(agentId, line)
{
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0)
    {
        return;
    }

    let payload = null;
    try
    {
        payload = System.JSON.parse(trimmedLine);
    }
    catch (parseError)
    {
        return;
    }

    const payloadType = payload.type;
    if (payloadType === "assistant")
    {
        const message = payload.message;
        if (message === undefined || message === null)
        {
            return;
        }
        const contentBlocks = message.content;
        if (System.Array.isArray(contentBlocks) === false)
        {
            return;
        }
        for (const contentBlock of contentBlocks)
        {
            const blockType = contentBlock.type;
            if (blockType === "text")
            {
                const textValue = contentBlock.text;
                if (textValue.trim().length === 0)
                {
                    continue;
                }
                const textEvent =
                {
                    type: "text",
                    text: textValue
                };
                emitEvent(agentId, textEvent);
            }
            else if (blockType === "tool_use")
            {
                const toolEvent =
                {
                    type: "tool",
                    name: contentBlock.name
                };
                emitEvent(agentId, toolEvent);
            }
        }
        return;
    }

    if (payloadType === "result")
    {
        const isError = payload.is_error;
        if (isError === true)
        {
            const errorEvent =
            {
                type: "error",
                message: payload.result
            };
            emitEvent(agentId, errorEvent);
            return;
        }
        const doneEvent =
        {
            type: "done",
            sessionId: payload.session_id
        };
        emitEvent(agentId, doneEvent);
    }
}

//=================================================================================================
// 채팅 요청을 보낸다. 이어지는 대화는 chatSessionId 로 연결된다.
// agent: { id, directory, name, projectSettings, chatSessionId }
// 반환값의 chatSessionId 는 호출한 쪽에서 저장해 다음 요청에 넘긴다.
//=================================================================================================
function sendMessage(agent, userMessage)
{
    const agentId = agent.id;
    const existingRequest = runningRequests.get(agentId);
    if (existingRequest !== undefined)
    {
        const busyResult =
        {
            ok: false,
            reason: "busy"
        };
        return busyResult;
    }

    const commandArguments = ["-p", "--output-format", "stream-json", "--verbose", PERMISSION_ARGUMENT];

    let chatSessionId = agent.chatSessionId;
    const hasSession = chatSessionId !== null && chatSessionId !== undefined && chatSessionId.length > 0;
    if (hasSession === true)
    {
        commandArguments.push("--resume");
        commandArguments.push(chatSessionId);
    }
    else
    {
        chatSessionId = nodeCrypto.randomUUID();
        commandArguments.push("--session-id");
        commandArguments.push(chatSessionId);
    }

    // 매 요청마다 최신 프로젝트 설정을 주입해, 설정 변경이 다음 메시지부터 바로 반영되게 한다.
    const systemPrompt = projectPrompt.buildSystemPrompt(agent);
    if (systemPrompt.length > 0)
    {
        commandArguments.push("--append-system-prompt");
        commandArguments.push(systemPrompt);
    }

    commandArguments.push(userMessage);

    const spawnOptions =
    {
        cwd: agent.directory,
        env: process.env
    };

    const chatCommand = getChatCommand();
    let childProcess = null;
    try
    {
        childProcess = spawn(chatCommand, commandArguments, spawnOptions);
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

    const request =
    {
        child: childProcess,
        sessionId: chatSessionId
    };
    runningRequests.set(agentId, request);

    let lineBuffer = "";
    childProcess.stdout.on("data", function (chunk)
    {
        lineBuffer = lineBuffer + chunk.toString();
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop();
        for (const line of lines)
        {
            handleStreamLine(agentId, line);
        }
    });

    let errorOutput = "";
    childProcess.stderr.on("data", function (chunk)
    {
        errorOutput = errorOutput + chunk.toString();
    });

    childProcess.on("error", function (processError)
    {
        runningRequests.delete(agentId);
        const errorEvent =
        {
            type: "error",
            message: processError.message
        };
        emitEvent(agentId, errorEvent);
    });

    childProcess.on("close", function (exitCode)
    {
        runningRequests.delete(agentId);
        if (lineBuffer.length > 0)
        {
            handleStreamLine(agentId, lineBuffer);
            lineBuffer = "";
        }
        if (exitCode !== 0)
        {
            const errorEvent =
            {
                type: "error",
                message: errorOutput.trim()
            };
            emitEvent(agentId, errorEvent);
        }
        const closedEvent =
        {
            type: "closed"
        };
        emitEvent(agentId, closedEvent);
    });

    const successResult =
    {
        ok: true,
        chatSessionId: chatSessionId
    };
    return successResult;
}

//=================================================================================================
// 진행 중인 채팅 요청을 중단한다.
//=================================================================================================
function cancelMessage(agentId)
{
    const request = runningRequests.get(agentId);
    if (request === undefined)
    {
        return false;
    }
    const childProcess = request.child;
    childProcess.kill();
    runningRequests.delete(agentId);
    return true;
}

//=================================================================================================
// 해당 에이전트가 응답을 처리 중인지 여부를 반환한다.
//=================================================================================================
function isBusy(agentId)
{
    const request = runningRequests.get(agentId);
    if (request === undefined)
    {
        return false;
    }
    return true;
}

//=================================================================================================
// 진행 중인 모든 요청을 중단한다. (앱 종료 시 정리용)
//=================================================================================================
function cancelAll()
{
    for (const request of runningRequests.values())
    {
        const childProcess = request.child;
        childProcess.kill();
    }
    runningRequests.clear();
}

module.exports =
{
    setEventListener,
    sendMessage,
    cancelMessage,
    isBusy,
    cancelAll
};
