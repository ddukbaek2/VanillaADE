//=================================================================================================
// views/placeholder.js
// 아직 상세 구현 전인 프로젝트 영역 섹션(저장소 / 개발 도구 / 파이프라인 / 에이전트)을 위한
// 공통 스텁 뷰 팩토리. 각 섹션이 담당할 역할을 설명 문구로 안내한다.
//=================================================================================================

const System = globalThis;

//=================================================================================================
// 스텁 뷰 객체를 생성한다.
// id: string, label: string, descriptionLines: string[]
//=================================================================================================
export function createPlaceholderView(id, label, descriptionLines)
{
    const placeholderView =
    {
        id: id,
        label: label,
        render: function (contentElement, viewContext)
        {
            contentElement.replaceChildren();

            const headerElement = document.createElement("div");
            headerElement.className = "dashboard-header";

            const titleElement = document.createElement("h1");
            titleElement.className = "dashboard-title";
            titleElement.textContent = label;
            headerElement.appendChild(titleElement);

            const descriptionElement = document.createElement("p");
            descriptionElement.className = "dashboard-description";
            descriptionElement.textContent = "이 섹션은 다음 단계에서 구현될 예정입니다.";
            headerElement.appendChild(descriptionElement);

            contentElement.appendChild(headerElement);

            const listElement = document.createElement("ul");
            listElement.className = "dashboard-info";
            for (const descriptionLine of descriptionLines)
            {
                const listItemElement = document.createElement("li");
                listItemElement.className = "dashboard-info-value";
                listItemElement.textContent = descriptionLine;
                listElement.appendChild(listItemElement);
            }
            contentElement.appendChild(listElement);
        }
    };
    return placeholderView;
}
