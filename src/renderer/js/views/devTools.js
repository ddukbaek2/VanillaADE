//=================================================================================================
// views/devTools.js
// 개발 도구 뷰. 에이전트가 사용할 CLI 도구들의 설치 여부/버전을 세로 목록으로 표시한다.
// 지원하지만 설치되지 않은 도구도 함께 나열한다.
//=================================================================================================

const System = globalThis;

import { t } from "../locale.js";

//=================================================================================================
// 헤더(제목 + 설명)를 만든다.
//=================================================================================================
function createHeader(titleText, descriptionText)
{
    const headerElement = document.createElement("div");
    headerElement.className = "dashboard-header";

    const titleElement = document.createElement("h1");
    titleElement.className = "dashboard-title";
    titleElement.textContent = titleText;
    headerElement.appendChild(titleElement);

    if (descriptionText !== undefined && descriptionText.length > 0)
    {
        const descriptionElement = document.createElement("p");
        descriptionElement.className = "dashboard-description";
        descriptionElement.textContent = descriptionText;
        headerElement.appendChild(descriptionElement);
    }

    return headerElement;
}

//=================================================================================================
// 도구 하나의 카드를 만든다.
//=================================================================================================
function createToolCard(toolInfo)
{
    const cardElement = document.createElement("div");
    cardElement.className = "dev-tools-card";

    const headerRowElement = document.createElement("div");
    headerRowElement.className = "dev-tools-card-header";

    const nameElement = document.createElement("div");
    nameElement.className = "dev-tools-card-name";
    nameElement.textContent = toolInfo.name;
    headerRowElement.appendChild(nameElement);

    const badgeElement = document.createElement("span");
    badgeElement.className = "status-badge";
    const isInstalled = toolInfo.installed;
    if (isInstalled === true)
    {
        badgeElement.classList.add("connected");
        badgeElement.textContent = t("devTools.installed");
    }
    else
    {
        badgeElement.classList.add("disconnected");
        badgeElement.textContent = t("devTools.notInstalled");
    }
    headerRowElement.appendChild(badgeElement);

    cardElement.appendChild(headerRowElement);

    const descriptionElement = document.createElement("div");
    descriptionElement.className = "dev-tools-card-description";
    const toolDescriptionKey = "toolDesc." + toolInfo.id;
    descriptionElement.textContent = t(toolDescriptionKey);
    cardElement.appendChild(descriptionElement);

    if (isInstalled === true)
    {
        const versionElement = document.createElement("div");
        versionElement.className = "dev-tools-card-version";
        const versionText = toolInfo.version;
        versionElement.textContent = versionText;
        cardElement.appendChild(versionElement);
    }

    const installUrl = toolInfo.installUrl;
    if (installUrl !== undefined && installUrl.length > 0)
    {
        const installLinkElement = document.createElement("button");
        installLinkElement.className = "dev-tools-card-install-link";
        installLinkElement.textContent = t("devTools.installLink");
        installLinkElement.title = installUrl;
        installLinkElement.addEventListener("click", function (installLinkClickEvent)
        {
            const vanilla = window.vanilla;
            vanilla.openExternal(installUrl);
        });
        cardElement.appendChild(installLinkElement);
    }

    return cardElement;
}

//=================================================================================================
// 도구 목록을 렌더링한다.
//=================================================================================================
function renderTools(contentElement, toolInfoList)
{
    const headerElement = createHeader(t("nav.dev-tools"), t("devTools.description"));
    contentElement.appendChild(headerElement);

    const listElement = document.createElement("div");
    listElement.className = "dev-tools-list";

    for (const toolInfo of toolInfoList)
    {
        const cardElement = createToolCard(toolInfo);
        listElement.appendChild(cardElement);
    }

    contentElement.appendChild(listElement);
}

//=================================================================================================
// 조회 중 안내를 렌더링한다.
//=================================================================================================
function renderLoading(contentElement)
{
    const headerElement = createHeader(t("nav.dev-tools"), "");
    contentElement.appendChild(headerElement);

    const messageElement = document.createElement("p");
    messageElement.className = "dashboard-empty-message";
    messageElement.textContent = t("devTools.loading");
    contentElement.appendChild(messageElement);
}

export const devToolsView =
{
    id: "dev-tools",
    label: "개발 도구",
    render: async function (contentElement, viewContext)
    {
        contentElement.replaceChildren();
        renderLoading(contentElement);
        const vanilla = window.vanilla;
        const toolInfoList = await vanilla.listDevTools();
        contentElement.replaceChildren();
        renderTools(contentElement, toolInfoList);
    }
};
