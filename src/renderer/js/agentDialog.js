//=================================================================================================
// agentDialog.js
// 에이전트 추가 / 설정 팝업. 작업 폴더와 에이전트 종류(콤보박스), 이름을 지정한다.
// 폴더는 에이전트 정보의 저장 위치이므로 설정 모드에서는 변경할 수 없다.
//=================================================================================================

const System = globalThis;

import { t } from "./locale.js";

//=================================================================================================
// 선택 가능한 에이전트 종류 목록. (현재는 Claude Code 만 지원)
//=================================================================================================
export const AGENT_KINDS =
[
    {
        id: "claude-code",
        labelKey: "agent.kindClaudeCode"
    }
];

//=================================================================================================
// 에이전트 종류 아이디에 해당하는 표시 이름을 반환한다. (모르는 종류면 아이디 그대로)
//=================================================================================================
export function getAgentKindLabel(agentKind)
{
    for (const kindDefinition of AGENT_KINDS)
    {
        if (kindDefinition.id === agentKind)
        {
            const labelKey = kindDefinition.labelKey;
            const labelText = t(labelKey);
            return labelText;
        }
    }
    return agentKind;
}

//=================================================================================================
// 라벨과 입력 컨트롤을 묶은 폼 필드를 만든다.
//=================================================================================================
function createFormField(labelText, controlElement)
{
    const fieldElement = document.createElement("div");
    fieldElement.className = "form-field";

    const labelElement = document.createElement("span");
    labelElement.className = "form-field-label";
    labelElement.textContent = labelText;
    fieldElement.appendChild(labelElement);

    fieldElement.appendChild(controlElement);
    return fieldElement;
}

//=================================================================================================
// 에이전트 추가 / 설정 팝업을 연다.
// dialogOptions: { mode: "add" | "edit", agent, onSubmit }
// onSubmit(formValues) 는 { ok, message } 를 반환한다. ok 가 true 면 팝업을 닫는다.
//=================================================================================================
export function openAgentDialog(dialogOptions)
{
    const dialogMode = dialogOptions.mode;
    const targetAgent = dialogOptions.agent;
    const onSubmit = dialogOptions.onSubmit;

    let selectedDirectory = "";
    let initialName = "";
    let initialKind = AGENT_KINDS[0].id;
    if (targetAgent !== null && targetAgent !== undefined)
    {
        selectedDirectory = targetAgent.directory;
        initialName = targetAgent.name;
        initialKind = targetAgent.kind;
    }

    const overlayElement = document.createElement("div");
    overlayElement.className = "modal-overlay";

    const dialogElement = document.createElement("div");
    dialogElement.className = "modal-dialog";

    const titleElement = document.createElement("div");
    titleElement.className = "modal-title";
    if (dialogMode === "edit")
    {
        titleElement.textContent = t("agent.editTitle");
    }
    else
    {
        titleElement.textContent = t("agent.addTitle");
    }
    dialogElement.appendChild(titleElement);

    const bodyElement = document.createElement("div");
    bodyElement.className = "modal-body";

    // 폴더 선택 (추가 모드에서만 변경 가능)
    const directoryRowElement = document.createElement("div");
    directoryRowElement.className = "form-field-row";

    const directoryInputElement = document.createElement("input");
    directoryInputElement.className = "text-input";
    directoryInputElement.type = "text";
    directoryInputElement.readOnly = true;
    directoryInputElement.placeholder = t("agent.directoryPlaceholder");
    directoryInputElement.value = selectedDirectory;
    directoryRowElement.appendChild(directoryInputElement);

    if (dialogMode !== "edit")
    {
        const selectDirectoryButtonElement = document.createElement("button");
        selectDirectoryButtonElement.className = "secondary-button";
        selectDirectoryButtonElement.textContent = t("agent.selectDirectory");
        selectDirectoryButtonElement.addEventListener("click", async function (selectClickEvent)
        {
            const vanilla = window.vanilla;
            const pickedDirectory = await vanilla.selectDirectory();
            if (pickedDirectory === null)
            {
                return;
            }
            selectedDirectory = pickedDirectory;
            directoryInputElement.value = pickedDirectory;
        });
        directoryRowElement.appendChild(selectDirectoryButtonElement);
    }

    const directoryFieldElement = createFormField(t("agent.directory"), directoryRowElement);
    bodyElement.appendChild(directoryFieldElement);

    // 에이전트 종류 (콤보박스)
    const kindSelectElement = document.createElement("select");
    kindSelectElement.className = "select-input";
    for (const kindDefinition of AGENT_KINDS)
    {
        const optionElement = document.createElement("option");
        optionElement.value = kindDefinition.id;
        const labelKey = kindDefinition.labelKey;
        optionElement.textContent = t(labelKey);
        if (kindDefinition.id === initialKind)
        {
            optionElement.selected = true;
        }
        kindSelectElement.appendChild(optionElement);
    }
    const kindFieldElement = createFormField(t("agent.kind"), kindSelectElement);
    bodyElement.appendChild(kindFieldElement);

    // 이름 (비우면 폴더 이름을 사용)
    const nameInputElement = document.createElement("input");
    nameInputElement.className = "text-input";
    nameInputElement.type = "text";
    nameInputElement.placeholder = t("agent.namePlaceholder");
    nameInputElement.value = initialName;
    const nameFieldElement = createFormField(t("agent.name"), nameInputElement);
    bodyElement.appendChild(nameFieldElement);

    const errorElement = document.createElement("p");
    errorElement.className = "modal-error";
    bodyElement.appendChild(errorElement);

    dialogElement.appendChild(bodyElement);

    const footerElement = document.createElement("div");
    footerElement.className = "modal-footer";

    function closeDialog()
    {
        overlayElement.remove();
        document.removeEventListener("keydown", handleKeyDown, true);
    }

    function handleKeyDown(keyDownEvent)
    {
        const pressedKey = keyDownEvent.key;
        if (pressedKey === "Escape")
        {
            keyDownEvent.preventDefault();
            closeDialog();
        }
    }

    const cancelButtonElement = document.createElement("button");
    cancelButtonElement.className = "secondary-button";
    cancelButtonElement.textContent = t("common.cancel");
    cancelButtonElement.addEventListener("click", function (cancelClickEvent)
    {
        closeDialog();
    });
    footerElement.appendChild(cancelButtonElement);

    const confirmButtonElement = document.createElement("button");
    confirmButtonElement.className = "primary-button";
    confirmButtonElement.textContent = t("common.confirm");
    confirmButtonElement.addEventListener("click", async function (confirmClickEvent)
    {
        if (selectedDirectory.length === 0)
        {
            errorElement.textContent = t("agent.directoryRequired");
            return;
        }
        const formValues =
        {
            directory: selectedDirectory,
            name: nameInputElement.value.trim(),
            kind: kindSelectElement.value
        };
        confirmButtonElement.disabled = true;
        const submitResult = await onSubmit(formValues);
        confirmButtonElement.disabled = false;
        if (submitResult.ok === true)
        {
            closeDialog();
            return;
        }
        errorElement.textContent = submitResult.message;
    });
    footerElement.appendChild(confirmButtonElement);

    dialogElement.appendChild(footerElement);
    overlayElement.appendChild(dialogElement);

    overlayElement.addEventListener("mousedown", function (overlayMouseDownEvent)
    {
        if (overlayMouseDownEvent.target === overlayElement)
        {
            closeDialog();
        }
    });

    document.addEventListener("keydown", handleKeyDown, true);
    document.body.appendChild(overlayElement);
    nameInputElement.focus();
}
