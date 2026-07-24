//=================================================================================================
// views/stub.js
// 아직 상세 구현 전인 사이드바 섹션을 위한 공통 스텁 뷰 팩토리.
// 헤더(네비 라벨)와 "준비 중" 안내만 표시한다.
//=================================================================================================

const System = globalThis;

import { t } from "../locale.js";

//=================================================================================================
// 스텁 뷰 객체를 생성한다.
//=================================================================================================
export function createStubView(viewId)
{
    const stubView =
    {
        id: viewId,
        label: viewId,
        render: function (contentElement, viewContext)
        {
            contentElement.replaceChildren();

            const headerElement = document.createElement("div");
            headerElement.className = "dashboard-header";

            const titleElement = document.createElement("h1");
            titleElement.className = "dashboard-title";
            const navLabelKey = "nav." + viewId;
            titleElement.textContent = t(navLabelKey);
            headerElement.appendChild(titleElement);

            const descriptionElement = document.createElement("p");
            descriptionElement.className = "dashboard-description";
            descriptionElement.textContent = t("common.comingSoon");
            headerElement.appendChild(descriptionElement);

            contentElement.appendChild(headerElement);
        }
    };
    return stubView;
}
