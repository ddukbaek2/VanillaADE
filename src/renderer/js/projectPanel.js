//=================================================================================================
// projectPanel.js
// 좌측 프로젝트 영역. 상단 섹션 헤더와, 등록된 뷰 목록을 아이콘+라벨 버튼으로 세로 나열한다.
// 선택 시 콜백을 호출한다.
//=================================================================================================

const System = globalThis;

import { t } from "./locale.js";
import { openContextMenu } from "./contextMenu.js";

//=================================================================================================
// 프로젝트 패널을 다시 그린다.
// headerLabel: 상단 섹션 헤더 문자열
// views: [{ id, label, icon }], activeViewId: string, onSelectView: (viewId) => void
//=================================================================================================
export function createProjectPanel(projectPanelElement, headerLabel, views, activeViewId, onSelectView, isCollapsed, onToggleCollapse, onOpenWindow)
{
    projectPanelElement.replaceChildren();

    const headerElement = document.createElement("div");
    headerElement.className = "project-panel-header";

    const headerLabelElement = document.createElement("span");
    headerLabelElement.className = "project-panel-header-label";
    headerLabelElement.textContent = headerLabel;
    headerElement.appendChild(headerLabelElement);

    const toggleButtonElement = document.createElement("button");
    toggleButtonElement.className = "project-panel-toggle";
    if (isCollapsed === true)
    {
        toggleButtonElement.textContent = "»";
    }
    else
    {
        toggleButtonElement.textContent = "«";
    }
    toggleButtonElement.addEventListener("click", function (toggleClickEvent)
    {
        onToggleCollapse();
    });
    headerElement.appendChild(toggleButtonElement);

    projectPanelElement.appendChild(headerElement);

    const listElement = document.createElement("div");
    listElement.className = "project-panel-list";

    for (const view of views)
    {
        const viewId = view.id;

        const itemElement = document.createElement("div");
        itemElement.className = "project-panel-item";

        const buttonElement = document.createElement("button");
        buttonElement.className = "project-panel-button";
        if (viewId === activeViewId)
        {
            buttonElement.classList.add("active");
        }

        const navLabelKey = "nav." + viewId;
        const navLabelText = t(navLabelKey);
        buttonElement.title = navLabelText;

        const iconElement = document.createElement("span");
        iconElement.className = "project-panel-icon";
        const iconMarkup = view.icon;
        if (iconMarkup !== undefined)
        {
            iconElement.innerHTML = iconMarkup;
        }
        buttonElement.appendChild(iconElement);

        const labelElement = document.createElement("span");
        labelElement.className = "project-panel-label";
        labelElement.textContent = navLabelText;
        buttonElement.appendChild(labelElement);

        buttonElement.addEventListener("click", function (buttonClickEvent)
        {
            onSelectView(viewId);
        });
        itemElement.appendChild(buttonElement);

        // 대시보드(메인 전용)를 제외한 뷰는 더보기 메뉴에서 별도 창으로 분리할 수 있다.
        if (viewId !== "dashboard")
        {
            const moreButtonElement = document.createElement("button");
            moreButtonElement.className = "project-panel-more";
            moreButtonElement.textContent = "⋯";
            moreButtonElement.title = t("common.more");
            moreButtonElement.addEventListener("click", function (moreClickEvent)
            {
                moreClickEvent.stopPropagation();
                const menuItems =
                [
                    {
                        label: t("common.openInNewWindow"),
                        action: function ()
                        {
                            onOpenWindow(viewId);
                        }
                    }
                ];
                openContextMenu(moreButtonElement, menuItems);
            });
            itemElement.appendChild(moreButtonElement);
        }

        listElement.appendChild(itemElement);
    }

    projectPanelElement.appendChild(listElement);
}
