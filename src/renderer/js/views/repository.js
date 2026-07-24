//=================================================================================================
// views/repository.js
// 저장소 뷰. 현재 프로젝트가 Git 저장소인지, 원격 저장소와 연결되어 있는지 표시한다.
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
// 라벨/값 한 줄을 만든다.
//=================================================================================================
function createInfoRow(labelText, valueText)
{
    const rowElement = document.createElement("div");
    rowElement.className = "dashboard-info-row";

    const labelElement = document.createElement("div");
    labelElement.className = "dashboard-info-label";
    labelElement.textContent = labelText;

    const valueElement = document.createElement("div");
    valueElement.className = "dashboard-info-value";
    valueElement.textContent = valueText;

    rowElement.appendChild(labelElement);
    rowElement.appendChild(valueElement);
    return rowElement;
}

//=================================================================================================
// 연결 상태 배지를 만든다.
//=================================================================================================
function createStatusBadge(labelText, isConnected)
{
    const badgeElement = document.createElement("span");
    badgeElement.className = "status-badge";
    if (isConnected === true)
    {
        badgeElement.classList.add("connected");
    }
    else
    {
        badgeElement.classList.add("disconnected");
    }
    badgeElement.textContent = labelText;
    return badgeElement;
}

//=================================================================================================
// 저장소 정보를 렌더링한다.
//=================================================================================================
function renderRepositoryInfo(contentElement, repositoryInfo)
{
    const headerElement = createHeader(t("nav.repository"), t("repository.description"));
    contentElement.appendChild(headerElement);

    const isRepository = repositoryInfo.isRepository;
    if (isRepository === false)
    {
        const messageElement = document.createElement("p");
        messageElement.className = "dashboard-empty-message";
        messageElement.textContent = t("repository.notRepo");
        contentElement.appendChild(messageElement);
        return;
    }

    const infoElement = document.createElement("div");
    infoElement.className = "dashboard-info";

    const statusRow = document.createElement("div");
    statusRow.className = "dashboard-info-row";
    const statusLabel = document.createElement("div");
    statusLabel.className = "dashboard-info-label";
    statusLabel.textContent = t("repository.remoteConnection");
    const statusValue = document.createElement("div");
    statusValue.className = "dashboard-info-value";
    const hasRemote = repositoryInfo.hasRemote;
    let badgeText = t("repository.notConnectedBadge");
    if (hasRemote === true)
    {
        badgeText = t("repository.connectedBadge");
    }
    const statusBadge = createStatusBadge(badgeText, hasRemote);
    statusValue.appendChild(statusBadge);
    statusRow.appendChild(statusLabel);
    statusRow.appendChild(statusValue);
    infoElement.appendChild(statusRow);

    const branchName = repositoryInfo.branch;
    const branchRow = createInfoRow(t("repository.branch"), branchName);
    infoElement.appendChild(branchRow);

    const remotes = repositoryInfo.remotes;
    for (const remote of remotes)
    {
        const remoteName = remote.name;
        const remoteUrl = remote.url;
        const remoteRow = createInfoRow(remoteName, remoteUrl);
        infoElement.appendChild(remoteRow);
    }

    contentElement.appendChild(infoElement);
}

//=================================================================================================
// 프로젝트가 열려있지 않을 때의 안내를 렌더링한다.
//=================================================================================================
function renderNoProject(contentElement)
{
    const headerElement = createHeader(t("nav.repository"), "");
    contentElement.appendChild(headerElement);

    const messageElement = document.createElement("p");
    messageElement.className = "dashboard-empty-message";
    messageElement.textContent = t("common.noProject");
    contentElement.appendChild(messageElement);
}

//=================================================================================================
// 조회 중 안내를 렌더링한다.
//=================================================================================================
function renderLoading(contentElement)
{
    const headerElement = createHeader(t("nav.repository"), "");
    contentElement.appendChild(headerElement);

    const messageElement = document.createElement("p");
    messageElement.className = "dashboard-empty-message";
    messageElement.textContent = t("repository.loading");
    contentElement.appendChild(messageElement);
}

export const repositoryView =
{
    id: "repository",
    label: "저장소",
    render: async function (contentElement, viewContext)
    {
        contentElement.replaceChildren();
        const projectPath = viewContext.projectPath;
        if (projectPath === null)
        {
            renderNoProject(contentElement);
            return;
        }
        renderLoading(contentElement);
        const vanilla = window.vanilla;
        const repositoryInfo = await vanilla.getRepositoryInfo(projectPath);
        contentElement.replaceChildren();
        renderRepositoryInfo(contentElement, repositoryInfo);
    }
};
