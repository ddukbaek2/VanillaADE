//=================================================================================================
// app.js
// 렌더러 진입점. 셸(메뉴바 / 에이전트영역 / 컨텐트영역 / 상태바)을 구성하고,
// 에이전트 추가 · 선택 · 실행 · 제거 흐름을 관리한다.
//=================================================================================================

import { createMenubar } from "./menubar.js";
import { createAgentPanel } from "./agentPanel.js";
import { renderStatusBar } from "./statusBar.js";
import { openAgentDialog } from "./agentDialog.js";
import { openContextMenu, openContextMenuAt } from "./contextMenu.js";
import { agentTerminalView } from "./views/agentTerminal.js";
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
    panelCollapsed: false
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
    const viewContext =
    {
        agent: selectedAgent,
        onStartAgent: startAgentSession,
        onStopAgent: stopAgentSession
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
// 패널 / 상태바 / 컨텐트를 모두 다시 그린다.
//=================================================================================================
function renderAll()
{
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
    const startResult = await vanilla.startAgent(agentId, agent.directory, agent.kind);
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
// 에이전트 추가 팝업을 연다.
//=================================================================================================
function openAddAgentDialog()
{
    const dialogOptions =
    {
        mode: "add",
        agent: null,
        onSubmit: async function (formValues)
        {
            const addResult = await vanilla.addAgent(formValues.directory, formValues.name, formValues.kind);
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
// 에이전트 설정 팝업을 연다. (이름 / 종류 변경)
//=================================================================================================
function openAgentSettingsDialog(agent)
{
    const dialogOptions =
    {
        mode: "edit",
        agent: agent,
        onSubmit: async function (formValues)
        {
            const updateResult = await vanilla.updateAgent(formValues.directory, formValues.name, formValues.kind);
            if (updateResult.ok === false)
            {
                const failedResult =
                {
                    ok: false,
                    message: t("agent.addFailed", [updateResult.reason])
                };
                return failedResult;
            }

            // 종류가 바뀌면 실행 중인 세션은 이전 종류로 돌고 있으므로 종료한다.
            const previousKind = agent.kind;
            const isKindChanged = previousKind !== formValues.kind;
            const isRunning = agent.running;
            if (isKindChanged === true && isRunning === true)
            {
                await vanilla.stopAgent(agent.id);
            }

            await reloadAgents();
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
        renderAgentPanel();
        renderStatus();
    });
}

//=================================================================================================
// 애플리케이션을 초기화한다.
//=================================================================================================
async function initializeApplication()
{
    initializeTheme();
    initializeTerminalStore();
    vanilla.onAgentExit(handleAgentExit);

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

initializeApplication();
