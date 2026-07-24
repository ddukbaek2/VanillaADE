//=================================================================================================
// views/rules.js
// 규칙 목록 뷰. 에이전트가 따를 지침(CLAUDE.md 같은 규칙)을 .vanilla/rules.json 에 저장/편집한다.
//=================================================================================================

const System = globalThis;

import { t } from "../locale.js";
import { logSystem } from "../historyLog.js";

const rulesViewState =
{
    projectPath: null,
    contentElement: null
};

//=================================================================================================
// 헤더(제목 + 설명 + 액션 버튼)를 만든다.
//=================================================================================================
function createHeader()
{
    const headerElement = document.createElement("div");
    headerElement.className = "view-header";

    const titleBlockElement = document.createElement("div");

    const titleElement = document.createElement("h1");
    titleElement.className = "dashboard-title";
    titleElement.textContent = t("nav.rules");
    titleBlockElement.appendChild(titleElement);

    const descriptionElement = document.createElement("p");
    descriptionElement.className = "dashboard-description";
    descriptionElement.textContent = t("rules.description");
    titleBlockElement.appendChild(descriptionElement);

    headerElement.appendChild(titleBlockElement);

    const createButtonElement = document.createElement("button");
    createButtonElement.className = "primary-button";
    createButtonElement.textContent = t("rules.new");
    createButtonElement.addEventListener("click", function (createClickEvent)
    {
        createNewRule();
    });
    headerElement.appendChild(createButtonElement);

    return headerElement;
}

//=================================================================================================
// 규칙 카드(제목 입력 + 내용 편집 + 저장/삭제)를 만든다.
//=================================================================================================
function createRuleCard(rule)
{
    const cardElement = document.createElement("div");
    cardElement.className = "editor-card";

    const titleInputElement = document.createElement("input");
    titleInputElement.className = "text-input";
    titleInputElement.type = "text";
    titleInputElement.value = rule.title;
    titleInputElement.placeholder = t("rules.titlePlaceholder");
    cardElement.appendChild(titleInputElement);

    const contentInputElement = document.createElement("textarea");
    contentInputElement.className = "text-area";
    contentInputElement.value = rule.content;
    contentInputElement.placeholder = t("rules.contentPlaceholder");
    cardElement.appendChild(contentInputElement);

    const actionsElement = document.createElement("div");
    actionsElement.className = "card-actions";

    const saveButtonElement = document.createElement("button");
    saveButtonElement.className = "primary-button";
    saveButtonElement.textContent = t("common.save");
    const ruleId = rule.id;
    saveButtonElement.addEventListener("click", function (saveClickEvent)
    {
        const titleValue = titleInputElement.value;
        const contentValue = contentInputElement.value;
        saveRule(ruleId, titleValue, contentValue);
    });
    actionsElement.appendChild(saveButtonElement);

    const deleteButtonElement = document.createElement("button");
    deleteButtonElement.className = "danger-button";
    deleteButtonElement.textContent = t("common.delete");
    deleteButtonElement.addEventListener("click", function (deleteClickEvent)
    {
        deleteRule(ruleId);
    });
    actionsElement.appendChild(deleteButtonElement);

    cardElement.appendChild(actionsElement);
    return cardElement;
}

//=================================================================================================
// 새 규칙을 생성한다.
//=================================================================================================
async function createNewRule()
{
    const projectPath = rulesViewState.projectPath;
    const vanilla = window.vanilla;
    const newRule =
    {
        title: t("rules.defaultTitle"),
        content: ""
    };
    await vanilla.saveRule(projectPath, newRule);
    await logSystem(projectPath, t("history.addedRule"), newRule.title);
    loadAndRender();
}

//=================================================================================================
// 규칙을 저장한다.
//=================================================================================================
async function saveRule(ruleId, titleValue, contentValue)
{
    const projectPath = rulesViewState.projectPath;
    const vanilla = window.vanilla;
    const updatedRule =
    {
        id: ruleId,
        title: titleValue,
        content: contentValue
    };
    await vanilla.saveRule(projectPath, updatedRule);
    const savedDetail = titleValue + "\n\n" + contentValue;
    await logSystem(projectPath, t("history.savedRule"), savedDetail);
    loadAndRender();
}

//=================================================================================================
// 규칙을 삭제한다.
//=================================================================================================
async function deleteRule(ruleId)
{
    const projectPath = rulesViewState.projectPath;
    const vanilla = window.vanilla;
    await vanilla.deleteRule(projectPath, ruleId);
    await logSystem(projectPath, t("history.deletedRule"), "");
    loadAndRender();
}

//=================================================================================================
// 현재 상태를 다시 그린다.
//=================================================================================================
async function loadAndRender()
{
    const contentElement = rulesViewState.contentElement;
    if (contentElement === null)
    {
        return;
    }
    contentElement.replaceChildren();

    const projectPath = rulesViewState.projectPath;
    if (projectPath === null)
    {
        const messageElement = document.createElement("p");
        messageElement.className = "dashboard-empty-message";
        messageElement.textContent = t("common.noProject");
        contentElement.appendChild(messageElement);
        return;
    }

    const headerElement = createHeader();
    contentElement.appendChild(headerElement);

    const vanilla = window.vanilla;
    const rules = await vanilla.listRules(projectPath);

    if (rules.length === 0)
    {
        const emptyElement = document.createElement("p");
        emptyElement.className = "dashboard-empty-message";
        emptyElement.textContent = t("rules.empty");
        contentElement.appendChild(emptyElement);
        return;
    }

    const listElement = document.createElement("div");
    listElement.className = "editor-list";
    for (const rule of rules)
    {
        const cardElement = createRuleCard(rule);
        listElement.appendChild(cardElement);
    }
    contentElement.appendChild(listElement);
}

export const rulesView =
{
    id: "rules",
    label: "규칙 목록",
    render: function (contentElement, viewContext)
    {
        rulesViewState.projectPath = viewContext.projectPath;
        rulesViewState.contentElement = contentElement;
        loadAndRender();
    }
};
