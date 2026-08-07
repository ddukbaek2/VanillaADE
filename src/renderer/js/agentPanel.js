//=================================================================================================
// agentPanel.js
// 좌측 에이전트 영역. 등록된 에이전트를 세로 목록(스크롤)으로 나열하고, 하단 플로팅 + 버튼으로
// 새 에이전트를 추가한다. 항목 우클릭 또는 더보기 버튼으로 컨텍스트 메뉴를 연다.
//=================================================================================================

const System = globalThis;

import { t } from "./locale.js";

//=================================================================================================
// 에이전트 항목 하나를 만든다.
//=================================================================================================
function createAgentItem(agent, panelContext)
{
    const itemElement = document.createElement("div");
    itemElement.className = "agent-item";

    const agentId = agent.id;
    const selectedAgentId = panelContext.selectedAgentId;

    const buttonElement = document.createElement("button");
    buttonElement.className = "agent-item-button";
    if (agentId === selectedAgentId)
    {
        buttonElement.classList.add("active");
    }
    buttonElement.title = agent.directory;

    const statusDotElement = document.createElement("span");
    statusDotElement.className = "agent-status-dot";
    const isRunning = agent.running;
    if (isRunning === true)
    {
        statusDotElement.classList.add("running");
    }
    buttonElement.appendChild(statusDotElement);

    const textElement = document.createElement("span");
    textElement.className = "agent-item-text";

    const nameElement = document.createElement("span");
    nameElement.className = "agent-item-name";
    nameElement.textContent = agent.name;
    textElement.appendChild(nameElement);

    const directoryElement = document.createElement("span");
    directoryElement.className = "agent-item-directory";
    directoryElement.textContent = agent.directory;
    textElement.appendChild(directoryElement);

    buttonElement.appendChild(textElement);

    const onSelectAgent = panelContext.onSelectAgent;
    buttonElement.addEventListener("click", function (buttonClickEvent)
    {
        onSelectAgent(agentId);
    });
    itemElement.appendChild(buttonElement);

    const onOpenAgentMenu = panelContext.onOpenAgentMenu;

    const moreButtonElement = document.createElement("button");
    moreButtonElement.className = "agent-item-more";
    moreButtonElement.textContent = "⋯";
    moreButtonElement.title = t("common.more");
    moreButtonElement.addEventListener("click", function (moreClickEvent)
    {
        moreClickEvent.stopPropagation();
        onOpenAgentMenu(agent, moreButtonElement, null, null);
    });
    itemElement.appendChild(moreButtonElement);

    itemElement.addEventListener("contextmenu", function (contextMenuEvent)
    {
        contextMenuEvent.preventDefault();
        const clientX = contextMenuEvent.clientX;
        const clientY = contextMenuEvent.clientY;
        onOpenAgentMenu(agent, null, clientX, clientY);
    });

    return itemElement;
}

//=================================================================================================
// 등록된 에이전트가 없을 때 표시할 안내를 만든다.
//=================================================================================================
function createEmptyMessage()
{
    const emptyElement = document.createElement("div");
    emptyElement.className = "agent-list-empty";

    const messageElement = document.createElement("p");
    messageElement.className = "agent-list-empty-message";
    messageElement.textContent = t("agent.listEmpty");
    emptyElement.appendChild(messageElement);

    const hintElement = document.createElement("p");
    hintElement.className = "agent-list-empty-hint";
    hintElement.textContent = t("agent.listEmptyHint");
    emptyElement.appendChild(hintElement);

    return emptyElement;
}

//=================================================================================================
// 에이전트 패널을 다시 그린다.
// panelContext: { agents, selectedAgentId, isCollapsed, onSelectAgent, onToggleCollapse,
//                 onAddAgent, onOpenAgentMenu }
//=================================================================================================
export function createAgentPanel(agentPanelElement, panelContext)
{
    agentPanelElement.replaceChildren();

    const headerElement = document.createElement("div");
    headerElement.className = "agent-panel-header";

    const headerLabelElement = document.createElement("span");
    headerLabelElement.className = "agent-panel-header-label";
    headerLabelElement.textContent = t("nav.header");
    headerElement.appendChild(headerLabelElement);

    const toggleButtonElement = document.createElement("button");
    toggleButtonElement.className = "agent-panel-toggle";
    const isCollapsed = panelContext.isCollapsed;
    if (isCollapsed === true)
    {
        toggleButtonElement.textContent = "»";
    }
    else
    {
        toggleButtonElement.textContent = "«";
    }
    const onToggleCollapse = panelContext.onToggleCollapse;
    toggleButtonElement.addEventListener("click", function (toggleClickEvent)
    {
        onToggleCollapse();
    });
    headerElement.appendChild(toggleButtonElement);

    agentPanelElement.appendChild(headerElement);

    const listElement = document.createElement("div");
    listElement.className = "agent-list";

    const agents = panelContext.agents;
    const agentCount = agents.length;
    if (agentCount === 0)
    {
        const emptyElement = createEmptyMessage();
        listElement.appendChild(emptyElement);
    }
    else
    {
        for (const agent of agents)
        {
            const itemElement = createAgentItem(agent, panelContext);
            listElement.appendChild(itemElement);
        }
    }

    agentPanelElement.appendChild(listElement);

    const addButtonElement = document.createElement("button");
    addButtonElement.className = "agent-add-button";
    addButtonElement.textContent = "+";
    addButtonElement.title = t("agent.add");
    const onAddAgent = panelContext.onAddAgent;
    addButtonElement.addEventListener("click", function (addClickEvent)
    {
        onAddAgent();
    });
    agentPanelElement.appendChild(addButtonElement);
}
