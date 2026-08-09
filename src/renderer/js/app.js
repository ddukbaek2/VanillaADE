//=================================================================================================
// app.js
// 렌더러 진입점. 셸(메뉴바 / 에이전트영역 / 컨텐트영역 / 상태바)을 구성하고,
// 에이전트 추가 · 선택 · 실행 · 제거 흐름을 관리한다.
//=================================================================================================

import { createMenubar } from "./menubar.js";
import { createAgentPanel } from "./agentPanel.js";
import { renderStatusBar } from "./statusBar.js";
import { openAgentDialog } from "./agentDialog.js";
import { openGameDialog } from "./gameDialog.js";
import { openActionLogDialog, appendActionLog, finishActionLog } from "./actionLogDialog.js";
import { openContextMenu, openContextMenuAt } from "./contextMenu.js";
import { agentTerminalView } from "./views/agentTerminal.js";
import { agentChatView, updateChatView } from "./views/agentChat.js";
import { settingsView } from "./views/settings.js";
import { initializeTerminalStore, fitTerminal, disposeTerminal } from "./terminalStore.js";
import { initializeSplitter } from "./splitter.js";
import { initializeTheme } from "./themeManager.js";
import { showToast } from "./toast.js";
import { t } from "./locale.js";

const System = globalThis;

const vanilla = window.vanilla;

const applicationState =
{
    agents: [],
    selectedAgentId: null,
    contentMode: "agent",
    panelCollapsed: false,
    isDetachedWindow: false
};

// 기본 모드 대화 상태. (선택된 에이전트 기준)
const chatState =
{
    messages: [],
    isBusy: false,
    activityLabel: "",
    streamingText: ""
};

const applicationElement = document.getElementById("application");
const menubarElement = document.getElementById("menubar");
const agentPanelElement = document.getElementById("agent-panel");
const splitterElement = document.getElementById("panel-splitter");
const contentElement = document.getElementById("content-area");
const statusBarElement = document.getElementById("status-bar");

//=================================================================================================
// 에이전트 아이디로 에이전트를 찾는다. (없으면 null)
//=================================================================================================
function getAgentById(agentId)
{
    for (const agent of applicationState.agents)
    {
        if (agent.id === agentId)
        {
            return agent;
        }
    }
    return null;
}

//=================================================================================================
// 현재 선택된 에이전트를 반환한다. (없으면 null)
//=================================================================================================
function getSelectedAgent()
{
    const selectedAgentId = applicationState.selectedAgentId;
    if (selectedAgentId === null)
    {
        return null;
    }
    const selectedAgent = getAgentById(selectedAgentId);
    return selectedAgent;
}

//=================================================================================================
// 에이전트 목록을 메인 프로세스에서 다시 읽어온다. 선택 항목이 사라졌으면 선택을 해제한다.
//=================================================================================================
async function reloadAgents()
{
    const agentList = await vanilla.listAgents();
    const detachedAgentIds = await vanilla.listDetachedAgents();
    const isDetachedWindow = applicationState.isDetachedWindow;
    for (const agent of agentList)
    {
        // 게임 설정 파일이 있으면 vanilla.js 엔진 기반 게임 프로젝트로 다룬다.
        const configData = await vanilla.readGameConfig(agent.directory);
        agent.isGameProject = configData.exists;
        agent.gameConfig = configData;

        const detachedIndex = detachedAgentIds.indexOf(agent.id);
        // 분리 창 자신은 그 에이전트를 직접 표시하므로 분리 상태로 취급하지 않는다.
        if (isDetachedWindow === true)
        {
            agent.detached = false;
        }
        else
        {
            agent.detached = detachedIndex >= 0;
        }
    }
    applicationState.agents = agentList;

    const selectedAgent = getSelectedAgent();
    if (selectedAgent === null)
    {
        applicationState.selectedAgentId = null;
    }
}

//=================================================================================================
// 에이전트 패널을 렌더링한다.
//=================================================================================================
function renderAgentPanel()
{
    const panelContext =
    {
        agents: applicationState.agents,
        selectedAgentId: applicationState.selectedAgentId,
        isCollapsed: applicationState.panelCollapsed,
        onSelectAgent: selectAgent,
        onToggleCollapse: togglePanel,
        onAddAgent: openAddAgentDialog,
        onOpenAgentMenu: openAgentMenu
    };
    createAgentPanel(agentPanelElement, panelContext);
}

//=================================================================================================
// 컨텐트 영역을 렌더링한다. (에이전트 대화 화면 또는 설정 화면)
//=================================================================================================
function renderContent()
{
    const contentMode = applicationState.contentMode;
    if (contentMode === "settings")
    {
        const settingsContext = {};
        settingsView.render(contentElement, settingsContext);
        return;
    }

    const selectedAgent = getSelectedAgent();
    const isBasicMode = selectedAgent !== null && selectedAgent.mode === "basic" && selectedAgent.detached !== true;
    if (isBasicMode === true)
    {
        const chatContext =
        {
            agent: selectedAgent,
            messages: getDisplayMessages(),
            isBusy: chatState.isBusy,
            activityLabel: chatState.activityLabel,
            onSendMessage: sendChatMessage,
            onCancelMessage: cancelChatMessage,
            onClearMessages: clearChatMessages,
            onRunAction: runProjectAction,
            onOpenGameSettings: openGameSettings
        };
        agentChatView.render(contentElement, chatContext);
        return;
    }

    const viewContext =
    {
        agent: selectedAgent,
        onStartAgent: startAgentSession,
        onStopAgent: stopAgentSession,
        onAttachAgent: attachAgent,
        onRunAction: runProjectAction,
        onOpenGameSettings: openGameSettings
    };
    agentTerminalView.render(contentElement, viewContext);
}

//=================================================================================================
// 상태바를 렌더링한다.
//=================================================================================================
function renderStatus()
{
    const selectedAgent = getSelectedAgent();
    const statusContext =
    {
        agent: selectedAgent
    };
    renderStatusBar(statusBarElement, statusContext);
}

//=================================================================================================
// 패널 / 상태바 / 컨텐트를 모두 다시 그린다. (분리 창은 컨텐트만 그린다)
//=================================================================================================
function renderAll()
{
    const isDetachedWindow = applicationState.isDetachedWindow;
    if (isDetachedWindow === true)
    {
        renderContent();
        return;
    }
    renderAgentPanel();
    renderStatus();
    renderContent();
}

//=================================================================================================
// 에이전트 영역을 좁게 접거나 편다.
//=================================================================================================
function togglePanel()
{
    const nextCollapsed = applicationState.panelCollapsed === false;
    applicationState.panelCollapsed = nextCollapsed;
    if (nextCollapsed === true)
    {
        applicationElement.classList.add("panel-collapsed");
    }
    else
    {
        applicationElement.classList.remove("panel-collapsed");
    }
    renderAgentPanel();
    fitSelectedTerminal();
}

//=================================================================================================
// 현재 표시 중인 터미널을 컨텐트 영역 크기에 맞춘다.
//=================================================================================================
function fitSelectedTerminal()
{
    const contentMode = applicationState.contentMode;
    if (contentMode !== "agent")
    {
        return;
    }
    const selectedAgent = getSelectedAgent();
    if (selectedAgent === null)
    {
        return;
    }
    const selectedAgentId = selectedAgent.id;
    fitTerminal(selectedAgentId);
}

//=================================================================================================
// 에이전트 세션을 시작하고 화면을 갱신한다.
//=================================================================================================
async function startAgentSession(agentId)
{
    const agent = getAgentById(agentId);
    if (agent === null)
    {
        return;
    }
    const startResult = await vanilla.startAgent(agentId, agent.directory, agent.kind, agent);
    if (startResult.ok === false)
    {
        showToast(t("agent.startFailed"));
    }
    await reloadAgents();
    renderAll();
}

//=================================================================================================
// 에이전트 세션을 종료하고 화면을 갱신한다.
//=================================================================================================
async function stopAgentSession(agentId)
{
    await vanilla.stopAgent(agentId);
    await reloadAgents();
    renderAll();
}

//=================================================================================================
// 화면에 표시할 대화 목록을 만든다. (응답 스트리밍 중이면 진행 중인 답변을 덧붙인다)
//=================================================================================================
function getDisplayMessages()
{
    const displayMessages = chatState.messages.slice();
    const streamingText = chatState.streamingText;
    if (streamingText.length > 0)
    {
        const streamingMessage =
        {
            role: "assistant",
            text: streamingText
        };
        displayMessages.push(streamingMessage);
    }
    return displayMessages;
}

//=================================================================================================
// 대화 화면만 다시 그린다. (스트리밍 중 잦은 갱신용)
//=================================================================================================
function renderChat()
{
    const chatUpdate =
    {
        messages: getDisplayMessages(),
        isBusy: chatState.isBusy,
        activityLabel: chatState.activityLabel
    };
    updateChatView(chatUpdate);
}

//=================================================================================================
// 선택된 에이전트의 대화 기록을 다시 읽는다.
//=================================================================================================
async function reloadChatMessages(agent)
{
    const messages = await vanilla.listChatMessages(agent.directory);
    chatState.messages = messages;
    const isBusy = await vanilla.isChatBusy(agent.id);
    chatState.isBusy = isBusy;
    chatState.streamingText = "";
    chatState.activityLabel = "";
}

//=================================================================================================
// 기본 모드로 메시지를 보낸다.
//=================================================================================================
async function sendChatMessage(userMessage)
{
    const agent = getSelectedAgent();
    if (agent === null)
    {
        return;
    }

    const userChatMessage =
    {
        role: "user",
        text: userMessage
    };
    chatState.messages.push(userChatMessage);
    chatState.isBusy = true;
    chatState.streamingText = "";
    chatState.activityLabel = "";
    renderChat();

    const sendResult = await vanilla.sendChatMessage(agent, userMessage);
    if (sendResult.ok === false)
    {
        chatState.isBusy = false;
        renderChat();
        showToast(t("chat.sendFailed"));
    }
}

//=================================================================================================
// 진행 중인 응답을 중단한다.
//=================================================================================================
async function cancelChatMessage()
{
    const agent = getSelectedAgent();
    if (agent === null)
    {
        return;
    }
    await vanilla.cancelChatMessage(agent.id);
    chatState.isBusy = false;
    chatState.activityLabel = "";
    renderChat();
}

//=================================================================================================
// 대화 기록과 대화 세션을 비운다.
//=================================================================================================
async function clearChatMessages()
{
    const agent = getSelectedAgent();
    if (agent === null)
    {
        return;
    }
    const isConfirmed = window.confirm(t("chat.confirmClear"));
    if (isConfirmed === false)
    {
        return;
    }
    await vanilla.clearChatMessages(agent.directory);
    chatState.messages = [];
    chatState.streamingText = "";
    chatState.activityLabel = "";
    await reloadAgents();
    renderAll();
}

//=================================================================================================
// 기본 모드 채팅 이벤트를 처리한다.
//=================================================================================================
function handleChatEvent(payload)
{
    const agent = getSelectedAgent();
    if (agent === null)
    {
        return;
    }
    if (payload.id !== agent.id)
    {
        return;
    }

    const chatEvent = payload.event;
    const eventType = chatEvent.type;
    if (eventType === "text")
    {
        chatState.streamingText = chatState.streamingText + chatEvent.text;
        chatState.activityLabel = "";
        renderChat();
        return;
    }
    if (eventType === "tool")
    {
        chatState.activityLabel = t("chat.usingTool", [chatEvent.name]);
        renderChat();
        return;
    }
    if (eventType === "error")
    {
        const errorMessage =
        {
            role: "assistant",
            text: t("chat.errorPrefix") + " " + chatEvent.message
        };
        chatState.messages.push(errorMessage);
        chatState.streamingText = "";
        renderChat();
        return;
    }
    if (eventType === "closed")
    {
        chatState.isBusy = false;
        chatState.activityLabel = "";
        reloadChatMessages(agent).then(function ()
        {
            renderChat();
        });
    }
}

//=================================================================================================
// 게임 설정 팝업을 연다. 저장하면 game.config.js 에 반영되고 엔진 버전도 함께 맞춘다.
//=================================================================================================
async function openGameSettings(agent)
{
    const currentConfig = await vanilla.readGameConfig(agent.directory);
    const markets = await vanilla.listMarkets();

    let engineVersions = [];
    const versionResult = await vanilla.listEngineVersions();
    if (versionResult.ok === true)
    {
        engineVersions = versionResult.versions;
    }

    const dialogOptions =
    {
        gameConfig: currentConfig,
        markets: markets,
        engineVersions: engineVersions,
        onSubmit: async function (nextConfig)
        {
            await vanilla.writeGameConfig(agent.directory, nextConfig);

            const isVersionChanged = currentConfig.engineVersion !== nextConfig.engineVersion;
            if (isVersionChanged === true)
            {
                const applyResult = await vanilla.applyEngineVersion(agent.directory, nextConfig.engineVersion);
                if (applyResult.ok === false)
                {
                    const failedResult =
                    {
                        ok: false,
                        message: t("game.engineApplyFailed", [applyResult.message])
                    };
                    return failedResult;
                }
            }

            await reloadAgents();
            renderAll();
            showToast(t("game.saved"));

            const successResult =
            {
                ok: true
            };
            return successResult;
        }
    };
    openGameDialog(dialogOptions);
}

//=================================================================================================
// 고정 액션(웹 빌드 · 자산 점검 · 의존성 설치)을 실행하고 로그 팝업을 띄운다.
//=================================================================================================
async function runProjectAction(agent, actionId)
{
    const actionLabelKey = "action." + actionId;
    const dialogOptions =
    {
        actionLabel: t(actionLabelKey),
        onCancel: function ()
        {
            vanilla.cancelAction(agent.id);
        }
    };
    openActionLogDialog(dialogOptions);

    const runResult = await vanilla.runAction(agent.id, agent.directory, actionId);
    if (runResult.ok === false)
    {
        finishActionLog(false, t("action.startFailed"));
    }
}

//=================================================================================================
// 고정 액션의 출력 / 종료 이벤트를 로그 팝업에 반영한다.
//=================================================================================================
function handleActionEvent(payload)
{
    const actionEvent = payload.event;
    const eventType = actionEvent.type;
    if (eventType === "output")
    {
        appendActionLog(actionEvent.text);
        return;
    }
    if (eventType === "finished")
    {
        const isSuccess = actionEvent.ok;
        let statusMessage = t("action.failed", [actionEvent.exitCode]);
        if (actionEvent.message !== undefined)
        {
            statusMessage = t("action.failed", [actionEvent.message]);
        }
        finishActionLog(isSuccess, statusMessage);
    }
}

//=================================================================================================
// 에이전트를 별도 창으로 분리한다.
//=================================================================================================
async function detachAgent(agentId)
{
    const agent = getAgentById(agentId);
    if (agent === null)
    {
        return;
    }
    // 분리 창에서 바로 대화를 이어갈 수 있도록 세션을 먼저 확보한다.
    const isRunning = agent.running;
    if (isRunning === false)
    {
        await startAgentSession(agentId);
    }
    await vanilla.detachAgent(agentId, agent.name);
    await reloadAgents();
    renderAll();
}

//=================================================================================================
// 분리된 에이전트 창을 닫아 메인 창으로 결합한다.
//=================================================================================================
async function attachAgent(agentId)
{
    await vanilla.attachAgent(agentId);
    await reloadAgents();
    renderAll();
}

//=================================================================================================
// 에이전트를 선택한다. 실행 중이 아니면 세션을 시작한다.
//=================================================================================================
async function selectAgent(agentId)
{
    applicationState.selectedAgentId = agentId;
    applicationState.contentMode = "agent";

    const agent = getAgentById(agentId);
    if (agent === null)
    {
        renderAll();
        return;
    }

    // 분리된 에이전트는 별도 창에서 다루므로 여기서는 세션을 건드리지 않는다.
    const isDetached = agent.detached;
    if (isDetached === true)
    {
        renderAll();
        return;
    }

    // 기본 모드는 터미널 세션 없이 요청할 때마다 에이전트를 호출한다.
    const isBasicMode = agent.mode === "basic";
    if (isBasicMode === true)
    {
        await reloadChatMessages(agent);
        renderAll();
        return;
    }

    const isRunning = agent.running;
    if (isRunning === true)
    {
        renderAll();
        return;
    }

    renderAll();
    await startAgentSession(agentId);
}

//=================================================================================================
// .gitignore 에 .env 를 추가하지 못한 경우 사용자에게 알린다.
//=================================================================================================
function notifyGitignoreFailure(operationResult)
{
    const isFailed = operationResult.gitignoreFailed;
    if (isFailed !== true)
    {
        return;
    }
    showToast(t("agent.gitignoreFailed"));
}

//=================================================================================================
// 클론 실패 사유를 사용자에게 보여줄 메시지로 바꾼다.
//=================================================================================================
function getCloneFailureMessage(cloneResult)
{
    const failureReason = cloneResult.reason;
    if (failureReason === "exists")
    {
        const existsMessage = t("agent.cloneExists", [cloneResult.directory]);
        return existsMessage;
    }
    if (failureReason === "git-missing")
    {
        const gitMissingMessage = t("agent.gitMissing");
        return gitMissingMessage;
    }
    if (failureReason === "invalid-url")
    {
        const invalidUrlMessage = t("agent.repositoryUrlRequired");
        return invalidUrlMessage;
    }
    const failedMessage = t("agent.cloneFailed", [cloneResult.message]);
    return failedMessage;
}

//=================================================================================================
// 게임 프로젝트 준비 실패 사유를 사용자에게 보여줄 메시지로 바꾼다.
//=================================================================================================
function getSetupFailureMessage(setupResult)
{
    const failureReason = setupResult.reason;
    if (failureReason === "exists")
    {
        const existsMessage = t("agent.cloneExists", [setupResult.directory]);
        return existsMessage;
    }
    if (failureReason === "git-missing")
    {
        const gitMissingMessage = t("agent.gitMissing");
        return gitMissingMessage;
    }
    if (failureReason === "npm-missing")
    {
        const npmMissingMessage = t("agent.npmMissing");
        return npmMissingMessage;
    }
    if (failureReason === "install-failed")
    {
        const installFailedMessage = t("agent.installFailed", [setupResult.message]);
        return installFailedMessage;
    }
    const failedMessage = t("agent.cloneFailed", [setupResult.message]);
    return failedMessage;
}

//=================================================================================================
// 에이전트 추가 팝업을 연다. (새로 만들기·열기 / 저장소 클론 / 새 게임 프로젝트)
//=================================================================================================
function openAddAgentDialog()
{
    const dialogOptions =
    {
        mode: "add",
        agent: null,
        onSubmit: async function (formValues)
        {
            let agentDirectory = formValues.directory;
            const isGame = formValues.sourceMode === "game";
            if (isGame === true)
            {
                const setupResult = await vanilla.setupGameProject(formValues.parentDirectory, formValues.gameProjectName);
                if (setupResult.ok === false)
                {
                    const setupFailedResult =
                    {
                        ok: false,
                        message: getSetupFailureMessage(setupResult)
                    };
                    return setupFailedResult;
                }
                agentDirectory = setupResult.directory;

                // 새로 만든 게임 프로젝트의 설정 파일을 만들고 진입 스크립트와 연결한다.
                const initialConfig =
                {
                    gameName: formValues.gameProjectName,
                    markets: ["web-deploy"]
                };
                await vanilla.writeGameConfig(agentDirectory, initialConfig);
            }

            const isClone = formValues.sourceMode === "clone";
            if (isClone === true)
            {
                const cloneResult = await vanilla.cloneRepository(formValues.repositoryUrl, formValues.parentDirectory);
                if (cloneResult.ok === false)
                {
                    const cloneFailedResult =
                    {
                        ok: false,
                        message: getCloneFailureMessage(cloneResult)
                    };
                    return cloneFailedResult;
                }
                agentDirectory = cloneResult.directory;
            }

            const apiKeyResult = await vanilla.setGoogleApiKey(agentDirectory, formValues.googleApiKey);
            if (apiKeyResult.ok === false)
            {
                const apiKeyFailedResult =
                {
                    ok: false,
                    message: t("agent.googleApiKeyFailed", [apiKeyResult.message])
                };
                return apiKeyFailedResult;
            }

            const addResult = await vanilla.addAgent(agentDirectory, formValues.name, formValues.kind, formValues.mode, formValues.projectSettings);
            if (addResult.ok === false)
            {
                const failureReason = addResult.reason;
                if (failureReason === "duplicate")
                {
                    const duplicateResult =
                    {
                        ok: false,
                        message: t("agent.duplicate")
                    };
                    return duplicateResult;
                }
                const failedResult =
                {
                    ok: false,
                    message: t("agent.addFailed", [addResult.message])
                };
                return failedResult;
            }

            notifyGitignoreFailure(addResult);

            await reloadAgents();
            const addedAgent = addResult.agent;
            const addedAgentId = addedAgent.id;
            await selectAgent(addedAgentId);

            const successResult =
            {
                ok: true
            };
            return successResult;
        }
    };
    openAgentDialog(dialogOptions);
}

//=================================================================================================
// 에이전트 설정 팝업을 연다. (이름 / 종류 / 구글 API 키 변경)
//=================================================================================================
async function openAgentSettingsDialog(agent)
{
    const storedApiKey = await vanilla.getGoogleApiKey(agent.directory);
    const dialogAgent =
    {
        id: agent.id,
        name: agent.name,
        kind: agent.kind,
        directory: agent.directory,
        googleApiKey: storedApiKey
    };

    const dialogOptions =
    {
        mode: "edit",
        agent: dialogAgent,
        onSubmit: async function (formValues)
        {
            const apiKeyResult = await vanilla.setGoogleApiKey(formValues.directory, formValues.googleApiKey);
            if (apiKeyResult.ok === false)
            {
                const apiKeyFailedResult =
                {
                    ok: false,
                    message: t("agent.googleApiKeyFailed", [apiKeyResult.message])
                };
                return apiKeyFailedResult;
            }
            notifyGitignoreFailure(apiKeyResult);

            const updateResult = await vanilla.updateAgent(formValues.directory, formValues.name, formValues.kind, formValues.mode, formValues.projectSettings);
            if (updateResult.ok === false)
            {
                const failedResult =
                {
                    ok: false,
                    message: t("agent.addFailed", [updateResult.reason])
                };
                return failedResult;
            }

            // 라우 모드는 세션을 시작할 때 설정을 주입하므로, 설정이 바뀌면 세션을 다시 띄워 반영한다.
            const previousSettings = System.JSON.stringify(agent.projectSettings);
            const nextSettings = System.JSON.stringify(formValues.projectSettings);
            const isKindChanged = agent.kind !== formValues.kind;
            const isModeChanged = agent.mode !== formValues.mode;
            const isSettingsChanged = previousSettings !== nextSettings;
            const needsRestart = isKindChanged === true || isModeChanged === true || isSettingsChanged === true;
            const isRunning = agent.running;
            if (needsRestart === true && isRunning === true)
            {
                await vanilla.stopAgent(agent.id);
            }

            await reloadAgents();

            const isStillRaw = formValues.mode === "raw";
            const shouldRestart = needsRestart === true && isRunning === true && isStillRaw === true;
            if (shouldRestart === true)
            {
                await startAgentSession(agent.id);
                const restartedResult =
                {
                    ok: true
                };
                return restartedResult;
            }
            renderAll();

            const successResult =
            {
                ok: true
            };
            return successResult;
        }
    };
    openAgentDialog(dialogOptions);
}

//=================================================================================================
// 에이전트를 제거한다. (세션 종료 + 등록 해제, 폴더 자체는 유지)
//=================================================================================================
async function removeAgent(agent)
{
    const confirmMessage = t("agent.confirmRemove", [agent.name]);
    const isConfirmed = window.confirm(confirmMessage);
    if (isConfirmed === false)
    {
        return;
    }

    const agentId = agent.id;
    await vanilla.removeAgent(agentId, agent.directory);
    disposeTerminal(agentId);

    if (applicationState.selectedAgentId === agentId)
    {
        applicationState.selectedAgentId = null;
    }
    await reloadAgents();
    renderAll();
}

//=================================================================================================
// 에이전트 컨텍스트 메뉴를 연다. (더보기 버튼 또는 우클릭)
//=================================================================================================
function openAgentMenu(agent, anchorElement, clientX, clientY)
{
    const menuItems = [];

    const agentId = agent.id;
    const isRunning = agent.running;
    if (isRunning === true)
    {
        const stopItem =
        {
            label: t("agent.stop"),
            action: function ()
            {
                stopAgentSession(agentId);
            }
        };
        menuItems.push(stopItem);
    }
    else
    {
        const startItem =
        {
            label: t("agent.start"),
            action: function ()
            {
                startAgentSession(agentId);
            }
        };
        menuItems.push(startItem);
    }

    const isDetached = agent.detached;
    if (isDetached === true)
    {
        const attachItem =
        {
            label: t("agent.attach"),
            action: function ()
            {
                attachAgent(agentId);
            }
        };
        menuItems.push(attachItem);
    }
    else
    {
        const detachItem =
        {
            label: t("agent.detach"),
            action: function ()
            {
                detachAgent(agentId);
            }
        };
        menuItems.push(detachItem);
    }

    const isGameProject = agent.isGameProject;
    if (isGameProject === true)
    {
        const gameSettingsItem =
        {
            label: t("game.title"),
            action: function ()
            {
                openGameSettings(agent);
            }
        };
        menuItems.push(gameSettingsItem);
    }

    const settingsItem =
    {
        label: t("agent.settings"),
        action: function ()
        {
            openAgentSettingsDialog(agent);
        }
    };
    menuItems.push(settingsItem);

    const removeItem =
    {
        label: t("agent.remove"),
        variant: "danger",
        action: function ()
        {
            removeAgent(agent);
        }
    };
    menuItems.push(removeItem);

    if (anchorElement !== null)
    {
        openContextMenu(anchorElement, menuItems);
        return;
    }
    openContextMenuAt(clientX, clientY, menuItems);
}

//=================================================================================================
// 설정 화면을 연다.
//=================================================================================================
function openSettings()
{
    applicationState.contentMode = "settings";
    renderContent();
}

//=================================================================================================
// 현재 언어에 맞춘 메뉴 정의를 생성한다.
//=================================================================================================
function buildMenuDefinitions()
{
    const menuDefinitions =
    [
        {
            label: t("menu.file"),
            mnemonic: "f",
            items:
            [
                {
                    label: t("menu.addAgent"),
                    accelerator: "Ctrl+N",
                    action: openAddAgentDialog
                },
                {
                    label: t("menu.preferences"),
                    accelerator: "Ctrl+,",
                    action: openSettings
                },
                {
                    label: t("menu.quit"),
                    accelerator: "Ctrl+Q",
                    action: function ()
                    {
                        window.close();
                    }
                }
            ]
        },
        {
            label: t("menu.edit"),
            mnemonic: "e",
            items:
            [
                {
                    label: t("menu.undo"),
                    accelerator: "Ctrl+Z",
                    bindGlobal: false,
                    action: function ()
                    {
                        document.execCommand("undo");
                    }
                },
                {
                    label: t("menu.redo"),
                    accelerator: "Ctrl+Y",
                    bindGlobal: false,
                    action: function ()
                    {
                        document.execCommand("redo");
                    }
                },
                {
                    label: t("menu.cut"),
                    accelerator: "Ctrl+X",
                    bindGlobal: false,
                    action: function ()
                    {
                        document.execCommand("cut");
                    }
                },
                {
                    label: t("menu.copy"),
                    accelerator: "Ctrl+C",
                    bindGlobal: false,
                    action: function ()
                    {
                        document.execCommand("copy");
                    }
                },
                {
                    label: t("menu.paste"),
                    accelerator: "Ctrl+V",
                    bindGlobal: false,
                    action: function ()
                    {
                        document.execCommand("paste");
                    }
                }
            ]
        },
        {
            label: t("menu.help"),
            mnemonic: "h",
            items:
            [
                {
                    label: t("menu.about"),
                    action: function ()
                    {
                        const aboutBody = t("menu.aboutBody");
                        window.alert(aboutBody);
                    }
                }
            ]
        }
    ];
    return menuDefinitions;
}

//=================================================================================================
// 에이전트 세션 종료 이벤트를 받아 목록의 실행 상태를 갱신한다.
//=================================================================================================
function handleAgentExit(payload)
{
    reloadAgents().then(function ()
    {
        const isDetachedWindow = applicationState.isDetachedWindow;
        if (isDetachedWindow === true)
        {
            renderContent();
            return;
        }
        renderAgentPanel();
        renderStatus();
    });
}

//=================================================================================================
// 분리 창이 열리거나 닫히면 목록과 화면을 갱신한다.
//=================================================================================================
function handleDetachedChanged()
{
    reloadAgents().then(function ()
    {
        renderAll();
    });
}

//=================================================================================================
// URL 해시(#agent=<id>)에서 분리 창으로 열린 에이전트 아이디를 읽는다. (없으면 null)
//=================================================================================================
function getDetachedAgentId()
{
    const hashText = window.location.hash;
    const prefix = "#agent=";
    if (hashText.indexOf(prefix) !== 0)
    {
        return null;
    }
    const agentId = hashText.substring(prefix.length);
    if (agentId.length === 0)
    {
        return null;
    }
    return agentId;
}

//=================================================================================================
// 분리 창을 초기화한다. 셸(메뉴바/목록/상태바) 없이 지정한 에이전트의 대화 화면만 표시한다.
//=================================================================================================
async function initializeDetachedWindow(agentId)
{
    applicationState.isDetachedWindow = true;
    applicationState.selectedAgentId = agentId;
    applicationElement.classList.add("detached-mode");

    initializeTheme();
    initializeTerminalStore();
    vanilla.onAgentExit(handleAgentExit);
    vanilla.onChatEvent(handleChatEvent);

    window.addEventListener("resize", function (resizeEvent)
    {
        fitSelectedTerminal();
    });

    await reloadAgents();

    const agent = getAgentById(agentId);
    if (agent !== null)
    {
        document.title = agent.name + " — Vanilla ADE";
        const isBasicMode = agent.mode === "basic";
        if (isBasicMode === true)
        {
            await reloadChatMessages(agent);
            renderAll();
            return;
        }
        const isRunning = agent.running;
        if (isRunning === false)
        {
            await startAgentSession(agentId);
            return;
        }
    }
    renderAll();
}

//=================================================================================================
// 애플리케이션을 초기화한다.
//=================================================================================================
async function initializeApplication()
{
    initializeTheme();
    initializeTerminalStore();
    vanilla.onAgentExit(handleAgentExit);
    vanilla.onChatEvent(handleChatEvent);
    vanilla.onActionEvent(handleActionEvent);
    vanilla.onDetachedChanged(handleDetachedChanged);

    const platform = vanilla.platform;
    if (platform === "darwin")
    {
        menubarElement.classList.add("platform-darwin");
    }
    const menuDefinitions = buildMenuDefinitions();
    createMenubar(menubarElement, "Vanilla ADE", menuDefinitions);
    initializeSplitter(splitterElement, applicationElement, fitSelectedTerminal);

    window.addEventListener("resize", function (resizeEvent)
    {
        fitSelectedTerminal();
    });

    await reloadAgents();
    renderAll();
}

const detachedAgentId = getDetachedAgentId();
if (detachedAgentId === null)
{
    initializeApplication();
}
else
{
    initializeDetachedWindow(detachedAgentId);
}
