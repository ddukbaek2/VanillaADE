//=================================================================================================
// views/history.js
// 히스토리 목록 뷰. 에이전트 작업뿐 아니라 Vanilla ADE 시스템 이벤트(저장/삭제 등)까지 모든 기록을
// 시간 역순으로 표시한다. 소스(에이전트/Vanilla ADE)에 따라 배지 색을 다르게 하고,
// 각 항목 우측 끝의 X 로 삭제, 그 왼쪽의 "자세히" 로 전체 로그를 팝업으로 볼 수 있다.
//=================================================================================================

const System = globalThis;

import { t } from "../locale.js";

const historyViewState =
{
    projectPath: null,
    contentElement: null
};

//=================================================================================================
// ISO 문자열을 읽기 좋은 형식으로 변환한다.
//=================================================================================================
function formatDateTime(isoString)
{
    if (isoString === undefined)
    {
        return "-";
    }
    const dateValue = new System.Date(isoString);
    const formattedValue = dateValue.toLocaleString();
    return formattedValue;
}

//=================================================================================================
// 항목의 소스를 판별한다. (source 필드 우선, 없으면 taskTitle 유무로 추정)
//=================================================================================================
function resolveSource(historyItem)
{
    const source = historyItem.source;
    if (source === "agent" || source === "project" || source === "app")
    {
        return source;
    }
    if (source === "system")
    {
        return "project";
    }
    const taskTitle = historyItem.taskTitle;
    if (taskTitle !== undefined)
    {
        return "agent";
    }
    return "project";
}

//=================================================================================================
// "자세히" 전체 로그 팝업을 연다.
//=================================================================================================
function openDetailModal(titleText, metaText, detailText)
{
    const overlayElement = document.createElement("div");
    overlayElement.className = "modal-overlay";

    const dialogElement = document.createElement("div");
    dialogElement.className = "modal-dialog";

    const headerElement = document.createElement("div");
    headerElement.className = "modal-header";
    const modalTitleElement = document.createElement("div");
    modalTitleElement.className = "modal-title";
    modalTitleElement.textContent = t("history.detailTitle");
    headerElement.appendChild(modalTitleElement);
    dialogElement.appendChild(headerElement);

    const subjectElement = document.createElement("div");
    subjectElement.className = "modal-subject";
    subjectElement.textContent = titleText;
    dialogElement.appendChild(subjectElement);

    const metaElement = document.createElement("div");
    metaElement.className = "modal-meta";
    metaElement.textContent = metaText;
    dialogElement.appendChild(metaElement);

    const bodyElement = document.createElement("pre");
    bodyElement.className = "modal-body";
    bodyElement.textContent = detailText;
    dialogElement.appendChild(bodyElement);

    const footerElement = document.createElement("div");
    footerElement.className = "modal-footer";
    const closeButtonElement = document.createElement("button");
    closeButtonElement.className = "primary-button";
    closeButtonElement.textContent = t("common.close");
    closeButtonElement.addEventListener("click", function (closeClickEvent)
    {
        overlayElement.remove();
    });
    footerElement.appendChild(closeButtonElement);
    dialogElement.appendChild(footerElement);

    overlayElement.appendChild(dialogElement);
    overlayElement.addEventListener("click", function (overlayClickEvent)
    {
        if (overlayClickEvent.target === overlayElement)
        {
            overlayElement.remove();
        }
    });

    const bodyContainer = document.body;
    bodyContainer.appendChild(overlayElement);
}

//=================================================================================================
// 히스토리 항목을 삭제한다.
//=================================================================================================
async function deleteHistoryItem(historyId)
{
    const vanilla = window.vanilla;
    const projectPath = historyViewState.projectPath;
    await vanilla.deleteHistory(projectPath, historyId);
    loadAndRender();
}

//=================================================================================================
// 히스토리 항목 카드를 만든다.
//=================================================================================================
function createHistoryCard(historyItem)
{
    const cardElement = document.createElement("div");
    cardElement.className = "record-card";

    const headerRowElement = document.createElement("div");
    headerRowElement.className = "history-card-header";

    const sourceType = resolveSource(historyItem);
    const sourceBadgeElement = document.createElement("span");
    sourceBadgeElement.className = "source-badge source-" + sourceType;
    let sourceBadgeKey = "history.sourceProject";
    if (sourceType === "agent")
    {
        sourceBadgeKey = "history.sourceAgent";
    }
    else if (sourceType === "app")
    {
        sourceBadgeKey = "history.sourceApp";
    }
    sourceBadgeElement.textContent = t(sourceBadgeKey);
    headerRowElement.appendChild(sourceBadgeElement);

    const titleElement = document.createElement("div");
    titleElement.className = "history-card-title";
    let titleText = historyItem.title;
    if (titleText === undefined)
    {
        titleText = historyItem.taskTitle;
    }
    titleElement.textContent = titleText;
    headerRowElement.appendChild(titleElement);

    const actionsElement = document.createElement("div");
    actionsElement.className = "history-card-actions";

    const createdText = formatDateTime(historyItem.createdAt);
    let metaText = createdText;
    if (sourceType === "agent")
    {
        const agentTitle = historyItem.agentTitle;
        metaText = t("common.assignedMeta", [agentTitle, createdText]);
    }

    const detailButtonElement = document.createElement("button");
    detailButtonElement.className = "secondary-button";
    detailButtonElement.textContent = t("history.detail");
    detailButtonElement.addEventListener("click", function (detailClickEvent)
    {
        let detailText = historyItem.detail;
        if (detailText === undefined || detailText.length === 0)
        {
            detailText = titleText;
        }
        openDetailModal(titleText, metaText, detailText);
    });
    actionsElement.appendChild(detailButtonElement);

    const deleteButtonElement = document.createElement("button");
    deleteButtonElement.className = "icon-button";
    deleteButtonElement.textContent = "✕";
    const historyId = historyItem.id;
    deleteButtonElement.addEventListener("click", function (deleteClickEvent)
    {
        deleteHistoryItem(historyId);
    });
    actionsElement.appendChild(deleteButtonElement);

    headerRowElement.appendChild(actionsElement);
    cardElement.appendChild(headerRowElement);

    return cardElement;
}

//=================================================================================================
// 현재 상태를 다시 그린다.
//=================================================================================================
async function loadAndRender()
{
    const contentElement = historyViewState.contentElement;
    if (contentElement === null)
    {
        return;
    }
    contentElement.replaceChildren();

    const projectPath = historyViewState.projectPath;
    if (projectPath === null)
    {
        const messageElement = document.createElement("p");
        messageElement.className = "dashboard-empty-message";
        messageElement.textContent = t("common.noProject");
        contentElement.appendChild(messageElement);
        return;
    }

    const headerElement = document.createElement("div");
    headerElement.className = "dashboard-header";
    const titleElement = document.createElement("h1");
    titleElement.className = "dashboard-title";
    titleElement.textContent = t("nav.history");
    headerElement.appendChild(titleElement);
    const descriptionElement = document.createElement("p");
    descriptionElement.className = "dashboard-description";
    descriptionElement.textContent = t("history.description");
    headerElement.appendChild(descriptionElement);
    contentElement.appendChild(headerElement);

    const vanilla = window.vanilla;
    const historyItems = await vanilla.listHistory(projectPath);

    if (historyItems.length === 0)
    {
        const emptyElement = document.createElement("p");
        emptyElement.className = "dashboard-empty-message";
        emptyElement.textContent = t("history.empty");
        contentElement.appendChild(emptyElement);
        return;
    }

    const listElement = document.createElement("div");
    listElement.className = "record-list";
    let itemIndex = historyItems.length - 1;
    while (itemIndex >= 0)
    {
        const historyItem = historyItems[itemIndex];
        const cardElement = createHistoryCard(historyItem);
        listElement.appendChild(cardElement);
        itemIndex -= 1;
    }
    contentElement.appendChild(listElement);
}

export const historyView =
{
    id: "history",
    label: "히스토리 목록",
    render: function (contentElement, viewContext)
    {
        historyViewState.projectPath = viewContext.projectPath;
        historyViewState.contentElement = contentElement;
        loadAndRender();
    }
};
