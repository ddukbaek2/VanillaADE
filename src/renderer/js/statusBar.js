//=================================================================================================
// statusBar.js
// 하단 상태바. 현재 선택된 에이전트 정보와 애플리케이션 이름을 표시한다.
//=================================================================================================

const System = globalThis;

import { t } from "./locale.js";

//=================================================================================================
// 상태바를 다시 그린다.
// statusContext: { agent }
//=================================================================================================
export function renderStatusBar(statusBarElement, statusContext)
{
    statusBarElement.replaceChildren();

    const leftElement = document.createElement("div");
    leftElement.className = "status-bar-left";

    const agent = statusContext.agent;
    if (agent === null)
    {
        leftElement.textContent = t("status.noAgent");
    }
    else
    {
        const isRunning = agent.running;
        let statusText = t("agent.statusStopped");
        if (isRunning === true)
        {
            statusText = t("agent.statusRunning");
        }
        leftElement.textContent = agent.name + "  —  " + agent.directory + "  ·  " + statusText;
    }

    const rightElement = document.createElement("div");
    rightElement.className = "status-bar-right";
    rightElement.textContent = t("status.appName");

    statusBarElement.appendChild(leftElement);
    statusBarElement.appendChild(rightElement);
}
