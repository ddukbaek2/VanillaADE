//=================================================================================================
// statusBar.js
// 하단 상태바. 현재 열린 프로젝트 정보와 애플리케이션 이름을 표시한다.
//=================================================================================================

const System = globalThis;

import { t } from "./locale.js";

//=================================================================================================
// 상태바를 다시 그린다.
// statusContext: { projectPath, projectData }
//=================================================================================================
export function renderStatusBar(statusBarElement, statusContext)
{
    statusBarElement.replaceChildren();

    const leftElement = document.createElement("div");
    leftElement.className = "status-bar-left";

    const projectPath = statusContext.projectPath;
    if (projectPath === null)
    {
        leftElement.textContent = t("status.noProject");
    }
    else
    {
        const projectData = statusContext.projectData;
        const projectName = projectData.name;
        leftElement.textContent = projectName + "  —  " + projectPath;
    }

    const rightElement = document.createElement("div");
    rightElement.className = "status-bar-right";
    rightElement.textContent = t("status.appName");

    statusBarElement.appendChild(leftElement);
    statusBarElement.appendChild(rightElement);
}
