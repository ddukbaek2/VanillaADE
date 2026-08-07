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
// 라벨과 입력 컨트롤을 묶은 폼 필드를 만든다. hintText 가 있으면 컨트롤 아래에 설명을 붙인다.
//=================================================================================================
function createFormField(labelText, controlElement, hintText)
{
    const fieldElement = document.createElement("div");
    fieldElement.className = "form-field";

    const labelElement = document.createElement("span");
    labelElement.className = "form-field-label";
    labelElement.textContent = labelText;
    fieldElement.appendChild(labelElement);

    fieldElement.appendChild(controlElement);

    if (hintText !== undefined)
    {
        const hintElement = document.createElement("span");
        hintElement.className = "form-field-hint";
        hintElement.textContent = hintText;
        fieldElement.appendChild(hintElement);
    }

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
    let initialGoogleApiKey = "";
    if (targetAgent !== null && targetAgent !== undefined)
    {
        selectedDirectory = targetAgent.directory;
        initialName = targetAgent.name;
        initialKind = targetAgent.kind;
        const targetGoogleApiKey = targetAgent.googleApiKey;
        if (targetGoogleApiKey !== undefined && targetGoogleApiKey !== null)
        {
            initialGoogleApiKey = targetGoogleApiKey;
        }
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

    // 소스 선택 탭. 새로 만들거나 여는 방식과 저장소를 클론하는 방식 중 하나를 고른다.
    let sourceMode = "open";
    let openTabButtonElement = null;
    let cloneTabButtonElement = null;
    if (dialogMode !== "edit")
    {
        const tabsElement = document.createElement("div");
        tabsElement.className = "modal-tabs";

        openTabButtonElement = document.createElement("button");
        openTabButtonElement.className = "modal-tab active";
        openTabButtonElement.textContent = t("agent.tabOpen");
        tabsElement.appendChild(openTabButtonElement);

        cloneTabButtonElement = document.createElement("button");
        cloneTabButtonElement.className = "modal-tab";
        cloneTabButtonElement.textContent = t("agent.tabClone");
        tabsElement.appendChild(cloneTabButtonElement);

        dialogElement.appendChild(tabsElement);
    }

    // 이름 (비우면 폴더 이름을 사용)
    const nameInputElement = document.createElement("input");
    nameInputElement.className = "text-input";
    nameInputElement.type = "text";
    nameInputElement.placeholder = t("agent.namePlaceholder");
    nameInputElement.value = initialName;
    const nameFieldElement = createFormField(t("agent.name"), nameInputElement);
    bodyElement.appendChild(nameFieldElement);

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

    // 프로젝트 디렉토리 (추가 모드에서만 변경 가능)
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

    // 저장소 클론 (Clone 탭에서만 사용)
    let selectedParentDirectory = "";
    const repositoryUrlInputElement = document.createElement("input");
    repositoryUrlInputElement.className = "text-input";
    repositoryUrlInputElement.type = "text";
    repositoryUrlInputElement.placeholder = t("agent.repositoryUrlPlaceholder");
    const repositoryUrlFieldElement = createFormField(t("agent.repositoryUrl"), repositoryUrlInputElement);
    repositoryUrlFieldElement.style.display = "none";
    bodyElement.appendChild(repositoryUrlFieldElement);

    const parentDirectoryRowElement = document.createElement("div");
    parentDirectoryRowElement.className = "form-field-row";

    const parentDirectoryInputElement = document.createElement("input");
    parentDirectoryInputElement.className = "text-input";
    parentDirectoryInputElement.type = "text";
    parentDirectoryInputElement.readOnly = true;
    parentDirectoryInputElement.placeholder = t("agent.cloneParentPlaceholder");
    parentDirectoryRowElement.appendChild(parentDirectoryInputElement);

    const selectParentButtonElement = document.createElement("button");
    selectParentButtonElement.className = "secondary-button";
    selectParentButtonElement.textContent = t("agent.selectDirectory");
    selectParentButtonElement.addEventListener("click", async function (selectParentClickEvent)
    {
        const vanilla = window.vanilla;
        const pickedDirectory = await vanilla.selectDirectory();
        if (pickedDirectory === null)
        {
            return;
        }
        selectedParentDirectory = pickedDirectory;
        parentDirectoryInputElement.value = pickedDirectory;
    });
    parentDirectoryRowElement.appendChild(selectParentButtonElement);

    const cloneParentHint = t("agent.cloneParentHint");
    const parentDirectoryFieldElement = createFormField(t("agent.cloneParent"), parentDirectoryRowElement, cloneParentHint);
    parentDirectoryFieldElement.style.display = "none";
    bodyElement.appendChild(parentDirectoryFieldElement);

    //=========================================================================================
    // 선택한 탭에 맞춰 소스 입력 필드를 전환한다.
    //=========================================================================================
    function selectSourceMode(nextSourceMode)
    {
        sourceMode = nextSourceMode;
        const isClone = nextSourceMode === "clone";
        if (isClone === true)
        {
            directoryFieldElement.style.display = "none";
            repositoryUrlFieldElement.style.display = "";
            parentDirectoryFieldElement.style.display = "";
            openTabButtonElement.classList.remove("active");
            cloneTabButtonElement.classList.add("active");
            repositoryUrlInputElement.focus();
        }
        else
        {
            directoryFieldElement.style.display = "";
            repositoryUrlFieldElement.style.display = "none";
            parentDirectoryFieldElement.style.display = "none";
            cloneTabButtonElement.classList.remove("active");
            openTabButtonElement.classList.add("active");
        }
    }

    if (dialogMode !== "edit")
    {
        openTabButtonElement.addEventListener("click", function (openTabClickEvent)
        {
            selectSourceMode("open");
        });
        cloneTabButtonElement.addEventListener("click", function (cloneTabClickEvent)
        {
            selectSourceMode("clone");
        });
    }

    // 구글 API 키 (프로젝트 디렉토리의 .env 에 저장된다)
    const googleApiKeyInputElement = document.createElement("input");
    googleApiKeyInputElement.className = "text-input";
    googleApiKeyInputElement.type = "password";
    googleApiKeyInputElement.placeholder = t("agent.googleApiKeyPlaceholder");
    googleApiKeyInputElement.value = initialGoogleApiKey;
    const googleApiKeyHint = t("agent.googleApiKeyHint");
    const googleApiKeyFieldElement = createFormField(t("agent.googleApiKey"), googleApiKeyInputElement, googleApiKeyHint);
    bodyElement.appendChild(googleApiKeyFieldElement);

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
        const repositoryUrl = repositoryUrlInputElement.value.trim();
        const isClone = sourceMode === "clone";
        if (isClone === true)
        {
            if (repositoryUrl.length === 0)
            {
                errorElement.textContent = t("agent.repositoryUrlRequired");
                return;
            }
            if (selectedParentDirectory.length === 0)
            {
                errorElement.textContent = t("agent.cloneParentRequired");
                return;
            }
        }
        else
        {
            if (selectedDirectory.length === 0)
            {
                errorElement.textContent = t("agent.directoryRequired");
                return;
            }
        }

        const formValues =
        {
            sourceMode: sourceMode,
            directory: selectedDirectory,
            repositoryUrl: repositoryUrl,
            parentDirectory: selectedParentDirectory,
            name: nameInputElement.value.trim(),
            kind: kindSelectElement.value,
            googleApiKey: googleApiKeyInputElement.value.trim()
        };

        confirmButtonElement.disabled = true;
        if (isClone === true)
        {
            errorElement.classList.add("working");
            errorElement.textContent = t("agent.cloning");
        }
        const submitResult = await onSubmit(formValues);
        confirmButtonElement.disabled = false;
        errorElement.classList.remove("working");
        errorElement.textContent = "";
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
