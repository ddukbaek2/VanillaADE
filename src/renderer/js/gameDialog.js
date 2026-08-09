//=================================================================================================
// gameDialog.js
// 게임 설정 팝업. 게임 이름 · 엔진 버전 · 해상도 · 화면 방향 · 배포 대상을 지정한다.
// 여기서 저장한 값은 프로젝트의 game.config.js 에 즉시 반영되어 게임에 그대로 적용된다.
//=================================================================================================

const System = globalThis;

import { t } from "./locale.js";

//=================================================================================================
// 화면 방향 목록.
//=================================================================================================
const ORIENTATIONS =
[
    {
        id: "portrait",
        labelKey: "game.orientationPortrait"
    },
    {
        id: "landscape",
        labelKey: "game.orientationLandscape"
    },
    {
        id: "any",
        labelKey: "game.orientationAny"
    }
];

//=================================================================================================
// 라벨과 입력 컨트롤을 묶은 폼 필드를 만든다.
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
// 게임 설정 팝업을 연다.
// dialogOptions: { gameConfig, markets, engineVersions, onSubmit }
//=================================================================================================
export function openGameDialog(dialogOptions)
{
    const currentConfig = dialogOptions.gameConfig;
    const markets = dialogOptions.markets;
    const engineVersions = dialogOptions.engineVersions;
    const onSubmit = dialogOptions.onSubmit;

    const overlayElement = document.createElement("div");
    overlayElement.className = "modal-overlay";

    const dialogElement = document.createElement("div");
    dialogElement.className = "modal-dialog";

    const titleElement = document.createElement("div");
    titleElement.className = "modal-title";
    titleElement.textContent = t("game.title");
    dialogElement.appendChild(titleElement);

    const bodyElement = document.createElement("div");
    bodyElement.className = "modal-body";

    // 게임 이름
    const gameNameInputElement = document.createElement("input");
    gameNameInputElement.className = "text-input";
    gameNameInputElement.type = "text";
    gameNameInputElement.value = currentConfig.gameName;
    const gameNameFieldElement = createFormField(t("game.name"), gameNameInputElement);
    bodyElement.appendChild(gameNameFieldElement);

    // 엔진 버전
    const engineSelectElement = document.createElement("select");
    engineSelectElement.className = "select-input";
    let hasCurrentVersion = false;
    for (const versionName of engineVersions)
    {
        const optionElement = document.createElement("option");
        optionElement.value = versionName;
        optionElement.textContent = versionName;
        if (versionName === currentConfig.engineVersion)
        {
            optionElement.selected = true;
            hasCurrentVersion = true;
        }
        engineSelectElement.appendChild(optionElement);
    }
    if (hasCurrentVersion === false)
    {
        const currentOptionElement = document.createElement("option");
        currentOptionElement.value = currentConfig.engineVersion;
        currentOptionElement.textContent = currentConfig.engineVersion;
        currentOptionElement.selected = true;
        engineSelectElement.insertBefore(currentOptionElement, engineSelectElement.firstChild);
    }
    const engineHint = t("game.engineVersionHint");
    const engineFieldElement = createFormField(t("game.engineVersion"), engineSelectElement, engineHint);
    bodyElement.appendChild(engineFieldElement);

    // 해상도
    const resolutionRowElement = document.createElement("div");
    resolutionRowElement.className = "form-field-row";

    const widthInputElement = document.createElement("input");
    widthInputElement.className = "text-input";
    widthInputElement.type = "number";
    widthInputElement.min = "1";
    widthInputElement.value = String(currentConfig.resolutionWidth);
    resolutionRowElement.appendChild(widthInputElement);

    const resolutionSeparatorElement = document.createElement("span");
    resolutionSeparatorElement.className = "form-field-separator";
    resolutionSeparatorElement.textContent = "×";
    resolutionRowElement.appendChild(resolutionSeparatorElement);

    const heightInputElement = document.createElement("input");
    heightInputElement.className = "text-input";
    heightInputElement.type = "number";
    heightInputElement.min = "1";
    heightInputElement.value = String(currentConfig.resolutionHeight);
    resolutionRowElement.appendChild(heightInputElement);

    const resolutionHint = t("game.resolutionHint");
    const resolutionFieldElement = createFormField(t("game.resolution"), resolutionRowElement, resolutionHint);
    bodyElement.appendChild(resolutionFieldElement);

    // 화면 방향
    const orientationSelectElement = document.createElement("select");
    orientationSelectElement.className = "select-input";
    for (const orientationDefinition of ORIENTATIONS)
    {
        const optionElement = document.createElement("option");
        optionElement.value = orientationDefinition.id;
        const orientationLabelKey = orientationDefinition.labelKey;
        optionElement.textContent = t(orientationLabelKey);
        if (orientationDefinition.id === currentConfig.orientation)
        {
            optionElement.selected = true;
        }
        orientationSelectElement.appendChild(optionElement);
    }
    const orientationFieldElement = createFormField(t("game.orientation"), orientationSelectElement);
    bodyElement.appendChild(orientationFieldElement);

    // 배포 대상 (마켓)
    const marketsElement = document.createElement("div");
    marketsElement.className = "market-list";
    const marketCheckboxes = [];
    for (const marketDefinition of markets)
    {
        const marketRowElement = document.createElement("label");
        marketRowElement.className = "market-item";

        const checkboxElement = document.createElement("input");
        checkboxElement.type = "checkbox";
        checkboxElement.value = marketDefinition.id;
        const selectedIndex = currentConfig.markets.indexOf(marketDefinition.id);
        if (selectedIndex >= 0)
        {
            checkboxElement.checked = true;
        }
        if (marketDefinition.supported === false)
        {
            checkboxElement.disabled = true;
        }
        marketRowElement.appendChild(checkboxElement);
        marketCheckboxes.push(checkboxElement);

        const marketLabelElement = document.createElement("span");
        const marketLabelKey = "market." + marketDefinition.id;
        let marketLabelText = t(marketLabelKey);
        if (marketDefinition.supported === false)
        {
            marketLabelText = marketLabelText + " " + t("game.marketPreparing");
        }
        marketLabelElement.textContent = marketLabelText;
        marketRowElement.appendChild(marketLabelElement);

        marketsElement.appendChild(marketRowElement);
    }
    const marketHint = t("game.marketHint");
    const marketFieldElement = createFormField(t("game.markets"), marketsElement, marketHint);
    bodyElement.appendChild(marketFieldElement);

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
    confirmButtonElement.textContent = t("common.save");
    confirmButtonElement.addEventListener("click", async function (confirmClickEvent)
    {
        const resolutionWidth = System.Number(widthInputElement.value);
        const resolutionHeight = System.Number(heightInputElement.value);
        const isValidSize = System.Number.isFinite(resolutionWidth) === true && resolutionWidth > 0
            && System.Number.isFinite(resolutionHeight) === true && resolutionHeight > 0;
        if (isValidSize === false)
        {
            errorElement.textContent = t("game.resolutionRequired");
            return;
        }

        const selectedMarkets = [];
        for (const checkboxElement of marketCheckboxes)
        {
            if (checkboxElement.checked === true)
            {
                selectedMarkets.push(checkboxElement.value);
            }
        }
        if (selectedMarkets.length === 0)
        {
            errorElement.textContent = t("game.marketRequired");
            return;
        }

        const nextConfig =
        {
            gameName: gameNameInputElement.value.trim(),
            engineVersion: engineSelectElement.value,
            resolutionWidth: resolutionWidth,
            resolutionHeight: resolutionHeight,
            orientation: orientationSelectElement.value,
            markets: selectedMarkets
        };

        confirmButtonElement.disabled = true;
        errorElement.classList.add("working");
        errorElement.textContent = t("game.saving");
        const submitResult = await onSubmit(nextConfig);
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
    gameNameInputElement.focus();
}
