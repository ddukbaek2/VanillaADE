//=================================================================================================
// views/agentChat.js
// 기본 모드 대화 화면. 사용자가 채팅하듯 요청하면 ADE 가 프로젝트 설정을 붙여 에이전트에 전달하고,
// 응답을 말풍선으로 표시한다. 대화 기록은 프로젝트의 .vanilla/chat.json 에 남는다.
//=================================================================================================

const System = globalThis;

import { getAgentKindLabel } from "../agentDialog.js";
import { t } from "../locale.js";

const chatViewState =
{
    contentElement: null,
    agent: null,
    viewContext: null,
    messages: [],
    activityLabel: "",
    isBusy: false,
    draftText: ""
};

//=================================================================================================
// 말풍선 하나를 만든다.
//=================================================================================================
function createMessageBubble(chatMessage)
{
    const rowElement = document.createElement("div");
    rowElement.className = "chat-row";
    const messageRole = chatMessage.role;
    if (messageRole === "user")
    {
        rowElement.classList.add("user");
    }
    else
    {
        rowElement.classList.add("assistant");
    }

    const bubbleElement = document.createElement("div");
    bubbleElement.className = "chat-bubble";
    bubbleElement.textContent = chatMessage.text;
    rowElement.appendChild(bubbleElement);

    return rowElement;
}

//=================================================================================================
// 대화 목록 영역을 만든다.
//=================================================================================================
function createMessageList()
{
    const listElement = document.createElement("div");
    listElement.className = "chat-list";

    const messages = chatViewState.messages;
    const messageCount = messages.length;
    if (messageCount === 0)
    {
        const emptyElement = document.createElement("p");
        emptyElement.className = "chat-empty-message";
        emptyElement.textContent = t("chat.empty");
        listElement.appendChild(emptyElement);
    }
    else
    {
        for (const chatMessage of messages)
        {
            const rowElement = createMessageBubble(chatMessage);
            listElement.appendChild(rowElement);
        }
    }

    const isBusy = chatViewState.isBusy;
    if (isBusy === true)
    {
        const activityElement = document.createElement("div");
        activityElement.className = "chat-activity";
        let activityText = chatViewState.activityLabel;
        if (activityText.length === 0)
        {
            activityText = t("chat.thinking");
        }
        activityElement.textContent = activityText;
        listElement.appendChild(activityElement);
    }

    return listElement;
}

//=================================================================================================
// 입력 영역(메시지 입력 + 전송/중단)을 만든다.
//=================================================================================================
function createComposer()
{
    const composerElement = document.createElement("div");
    composerElement.className = "chat-composer";

    const inputElement = document.createElement("textarea");
    inputElement.className = "chat-input";
    inputElement.placeholder = t("chat.inputPlaceholder");
    inputElement.value = chatViewState.draftText;
    inputElement.addEventListener("input", function (inputChangeEvent)
    {
        chatViewState.draftText = inputElement.value;
    });
    composerElement.appendChild(inputElement);

    const isBusy = chatViewState.isBusy;
    if (isBusy === true)
    {
        const cancelButtonElement = document.createElement("button");
        cancelButtonElement.className = "secondary-button";
        cancelButtonElement.textContent = t("chat.cancel");
        cancelButtonElement.addEventListener("click", function (cancelClickEvent)
        {
            const viewContext = chatViewState.viewContext;
            const onCancelMessage = viewContext.onCancelMessage;
            onCancelMessage();
        });
        composerElement.appendChild(cancelButtonElement);
    }
    else
    {
        const sendButtonElement = document.createElement("button");
        sendButtonElement.className = "primary-button";
        sendButtonElement.textContent = t("chat.send");
        sendButtonElement.addEventListener("click", function (sendClickEvent)
        {
            submitDraft();
        });
        composerElement.appendChild(sendButtonElement);
    }

    // Enter 로 전송, Shift+Enter 로 줄바꿈.
    inputElement.addEventListener("keydown", function (keyDownEvent)
    {
        const pressedKey = keyDownEvent.key;
        if (pressedKey !== "Enter")
        {
            return;
        }
        if (keyDownEvent.shiftKey === true)
        {
            return;
        }
        keyDownEvent.preventDefault();
        submitDraft();
    });

    return composerElement;
}

//=================================================================================================
// 입력한 메시지를 전송한다.
//=================================================================================================
function submitDraft()
{
    const isBusy = chatViewState.isBusy;
    if (isBusy === true)
    {
        return;
    }
    const draftText = chatViewState.draftText.trim();
    if (draftText.length === 0)
    {
        return;
    }
    chatViewState.draftText = "";
    const viewContext = chatViewState.viewContext;
    const onSendMessage = viewContext.onSendMessage;
    onSendMessage(draftText);
}

//=================================================================================================
// 에이전트 정보와 대화 제어 버튼이 있는 상단 헤더를 만든다.
//=================================================================================================
function createHeader(agent, viewContext)
{
    const headerElement = document.createElement("div");
    headerElement.className = "agent-terminal-header";

    const titleRowElement = document.createElement("div");
    titleRowElement.className = "agent-terminal-title-row";

    const titleElement = document.createElement("h1");
    titleElement.className = "agent-terminal-title";
    titleElement.textContent = agent.name;
    titleRowElement.appendChild(titleElement);

    const modeBadgeElement = document.createElement("span");
    modeBadgeElement.className = "status-badge running";
    modeBadgeElement.textContent = t("agent.modeBasic");
    titleRowElement.appendChild(modeBadgeElement);

    const kindElement = document.createElement("span");
    kindElement.className = "agent-terminal-kind";
    const kindLabel = getAgentKindLabel(agent.kind);
    kindElement.textContent = kindLabel;
    titleRowElement.appendChild(kindElement);

    const actionsElement = document.createElement("div");
    actionsElement.className = "agent-terminal-actions";

    // 게임 프로젝트는 ADE 가 정해둔 고정 액션을 버튼으로 바로 실행할 수 있다.
    const isGameProject = agent.isGameProject;
    if (isGameProject === true)
    {
        const buildButtonElement = document.createElement("button");
        buildButtonElement.className = "secondary-button";
        buildButtonElement.textContent = t("action.web-build");
        const onRunAction = viewContext.onRunAction;
        buildButtonElement.addEventListener("click", function (buildClickEvent)
        {
            onRunAction(agent, "web-build");
        });
        actionsElement.appendChild(buildButtonElement);

        const gameSettingsButtonElement = document.createElement("button");
        gameSettingsButtonElement.className = "secondary-button";
        gameSettingsButtonElement.textContent = t("game.title");
        const onOpenGameSettings = viewContext.onOpenGameSettings;
        gameSettingsButtonElement.addEventListener("click", function (gameSettingsClickEvent)
        {
            onOpenGameSettings(agent);
        });
        actionsElement.appendChild(gameSettingsButtonElement);
    }

    const clearButtonElement = document.createElement("button");
    clearButtonElement.className = "secondary-button";
    clearButtonElement.textContent = t("chat.clear");
    const onClearMessages = viewContext.onClearMessages;
    clearButtonElement.addEventListener("click", function (clearClickEvent)
    {
        onClearMessages();
    });
    actionsElement.appendChild(clearButtonElement);
    titleRowElement.appendChild(actionsElement);

    headerElement.appendChild(titleRowElement);

    const directoryElement = document.createElement("div");
    directoryElement.className = "agent-terminal-directory";
    directoryElement.textContent = agent.directory;
    headerElement.appendChild(directoryElement);

    return headerElement;
}

//=================================================================================================
// 현재 상태를 다시 그린다.
//=================================================================================================
function renderView()
{
    const contentElement = chatViewState.contentElement;
    if (contentElement === null)
    {
        return;
    }
    contentElement.replaceChildren();

    const agent = chatViewState.agent;
    const viewContext = chatViewState.viewContext;

    const rootElement = document.createElement("div");
    rootElement.className = "agent-chat-root";

    const headerElement = createHeader(agent, viewContext);
    rootElement.appendChild(headerElement);

    const listElement = createMessageList();
    rootElement.appendChild(listElement);

    const composerElement = createComposer();
    rootElement.appendChild(composerElement);

    contentElement.appendChild(rootElement);

    // 새 메시지가 보이도록 항상 아래로 스크롤한다.
    listElement.scrollTop = listElement.scrollHeight;
}

//=================================================================================================
// 대화 기록 / 진행 상태를 갱신하고 화면을 다시 그린다.
//=================================================================================================
export function updateChatView(chatState)
{
    chatViewState.messages = chatState.messages;
    chatViewState.isBusy = chatState.isBusy;
    chatViewState.activityLabel = chatState.activityLabel;
    renderView();
}

export const agentChatView =
{
    id: "agent-chat",
    render: function (contentElement, viewContext)
    {
        chatViewState.contentElement = contentElement;
        chatViewState.agent = viewContext.agent;
        chatViewState.viewContext = viewContext;
        chatViewState.messages = viewContext.messages;
        chatViewState.isBusy = viewContext.isBusy;
        chatViewState.activityLabel = viewContext.activityLabel;
        renderView();
    }
};
