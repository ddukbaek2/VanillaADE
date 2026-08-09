//=================================================================================================
// actionLogDialog.js
// 고정 액션(빌드 · 점검 · 설치) 실행 로그 팝업. 실행 중에는 출력이 실시간으로 쌓이고,
// 끝나면 성공 / 실패를 표시한다.
//=================================================================================================

const System = globalThis;

import { t } from "./locale.js";

const logDialogState =
{
    overlayElement: null,
    outputElement: null,
    statusElement: null,
    closeButtonElement: null,
    cancelButtonElement: null,
    onCancel: null
};

//=================================================================================================
// 로그 팝업을 닫는다.
//=================================================================================================
function closeDialog()
{
    const overlayElement = logDialogState.overlayElement;
    if (overlayElement === null)
    {
        return;
    }
    overlayElement.remove();
    logDialogState.overlayElement = null;
    logDialogState.outputElement = null;
    logDialogState.statusElement = null;
    logDialogState.closeButtonElement = null;
    logDialogState.cancelButtonElement = null;
}

//=================================================================================================
// 액션 로그 팝업을 연다. (이미 열려 있으면 새로 연다)
// dialogOptions: { actionLabel, onCancel }
//=================================================================================================
export function openActionLogDialog(dialogOptions)
{
    closeDialog();

    const overlayElement = document.createElement("div");
    overlayElement.className = "modal-overlay";

    const dialogElement = document.createElement("div");
    dialogElement.className = "modal-dialog";

    const titleElement = document.createElement("div");
    titleElement.className = "modal-title";
    titleElement.textContent = dialogOptions.actionLabel;
    dialogElement.appendChild(titleElement);

    const statusElement = document.createElement("p");
    statusElement.className = "action-log-status working";
    statusElement.textContent = t("action.running");
    dialogElement.appendChild(statusElement);

    const outputElement = document.createElement("pre");
    outputElement.className = "action-log-output";
    dialogElement.appendChild(outputElement);

    const footerElement = document.createElement("div");
    footerElement.className = "modal-footer";

    const cancelButtonElement = document.createElement("button");
    cancelButtonElement.className = "secondary-button";
    cancelButtonElement.textContent = t("action.cancel");
    const onCancel = dialogOptions.onCancel;
    cancelButtonElement.addEventListener("click", function (cancelClickEvent)
    {
        onCancel();
    });
    footerElement.appendChild(cancelButtonElement);

    const closeButtonElement = document.createElement("button");
    closeButtonElement.className = "primary-button";
    closeButtonElement.textContent = t("common.close");
    closeButtonElement.style.display = "none";
    closeButtonElement.addEventListener("click", function (closeClickEvent)
    {
        closeDialog();
    });
    footerElement.appendChild(closeButtonElement);

    dialogElement.appendChild(footerElement);
    overlayElement.appendChild(dialogElement);
    document.body.appendChild(overlayElement);

    logDialogState.overlayElement = overlayElement;
    logDialogState.outputElement = outputElement;
    logDialogState.statusElement = statusElement;
    logDialogState.closeButtonElement = closeButtonElement;
    logDialogState.cancelButtonElement = cancelButtonElement;
}

//=================================================================================================
// 로그에 출력 한 조각을 덧붙인다.
//=================================================================================================
export function appendActionLog(text)
{
    const outputElement = logDialogState.outputElement;
    if (outputElement === null)
    {
        return;
    }
    outputElement.textContent = outputElement.textContent + text;
    outputElement.scrollTop = outputElement.scrollHeight;
}

//=================================================================================================
// 액션이 끝났음을 표시한다.
//=================================================================================================
export function finishActionLog(isSuccess, statusMessage)
{
    const statusElement = logDialogState.statusElement;
    if (statusElement === null)
    {
        return;
    }
    statusElement.classList.remove("working");
    if (isSuccess === true)
    {
        statusElement.classList.add("success");
        statusElement.textContent = t("action.succeeded");
    }
    else
    {
        statusElement.classList.add("failure");
        statusElement.textContent = statusMessage;
    }

    const cancelButtonElement = logDialogState.cancelButtonElement;
    if (cancelButtonElement !== null)
    {
        cancelButtonElement.style.display = "none";
    }
    const closeButtonElement = logDialogState.closeButtonElement;
    if (closeButtonElement !== null)
    {
        closeButtonElement.style.display = "";
    }
}
