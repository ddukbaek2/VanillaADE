//=================================================================================================
// views/settings.js
// 설정 뷰. ADE 환경설정 목록을 컨텐트 영역에 표시한다. (테마 설정, 언어 설정)
// 사이드바 네비게이션에는 없고, 파일 > 환경설정 메뉴로 진입한다.
//=================================================================================================

const System = globalThis;

import { t, getLocale, setLocale, SUPPORTED_LOCALES } from "../locale.js";
import { getStoredTheme, setTheme } from "../themeManager.js";
import { getAutoInstallDevTools, setAutoInstallDevTools } from "../preferences.js";
import { logApp } from "../historyLog.js";

const settingsViewState =
{
    contentElement: null,
    projectPath: null
};

//=================================================================================================
// 설정 그룹(상단 그룹 제목 + 하위 섹션들)을 만든다.
//=================================================================================================
function createSettingsGroup(groupTitleText)
{
    const groupElement = document.createElement("div");
    groupElement.className = "settings-group";

    const groupTitleElement = document.createElement("div");
    groupTitleElement.className = "settings-group-title";
    groupTitleElement.textContent = groupTitleText;
    groupElement.appendChild(groupTitleElement);

    return groupElement;
}

//=================================================================================================
// 설정 섹션(제목 + 내용)을 만든다.
//=================================================================================================
function createSettingsSection(titleText)
{
    const sectionElement = document.createElement("div");
    sectionElement.className = "settings-section";

    const titleElement = document.createElement("div");
    titleElement.className = "settings-section-title";
    titleElement.textContent = titleText;
    sectionElement.appendChild(titleElement);

    return sectionElement;
}

//=================================================================================================
// 필요한 개발 도구 자동 설치 토글을 만든다.
// 켜짐: 에이전트가 없는 도구를 묻지 않고 자동 설치. 꺼짐: 설치 여부를 먼저 확인.
//=================================================================================================
function createAutoInstallSetting()
{
    const sectionElement = createSettingsSection(t("settings.autoInstall"));

    const descriptionElement = document.createElement("p");
    descriptionElement.className = "settings-section-description";
    descriptionElement.textContent = t("settings.autoInstallDescription");
    sectionElement.appendChild(descriptionElement);

    const isEnabled = getAutoInstallDevTools();

    const switchElement = document.createElement("button");
    switchElement.className = "settings-switch";
    switchElement.setAttribute("type", "button");
    if (isEnabled === true)
    {
        switchElement.classList.add("on");
    }
    switchElement.setAttribute("aria-pressed", String(isEnabled));

    const switchHandleElement = document.createElement("span");
    switchHandleElement.className = "settings-switch-handle";
    switchElement.appendChild(switchHandleElement);

    switchElement.addEventListener("click", function (switchClickEvent)
    {
        const previousValue = getAutoInstallDevTools();
        const nextValue = previousValue === false;
        setAutoInstallDevTools(nextValue);
        const projectPath = settingsViewState.projectPath;
        logApp(projectPath, t("history.changedAutoInstall"), String(nextValue));
        loadAndRender();
    });

    sectionElement.appendChild(switchElement);
    return sectionElement;
}

//=================================================================================================
// 테마 설정(라이트/다크 선택)을 만든다.
//=================================================================================================
function createThemeSetting()
{
    const sectionElement = createSettingsSection(t("settings.theme"));

    const optionsElement = document.createElement("div");
    optionsElement.className = "settings-segment";

    const currentTheme = getStoredTheme();

    const themeOptions =
    [
        {
            value: "light",
            label: t("settings.themeLight")
        },
        {
            value: "dark",
            label: t("settings.themeDark")
        }
    ];

    for (const themeOption of themeOptions)
    {
        const optionButtonElement = document.createElement("button");
        optionButtonElement.className = "settings-segment-option";
        if (themeOption.value === currentTheme)
        {
            optionButtonElement.classList.add("active");
        }
        optionButtonElement.textContent = themeOption.label;
        const themeValue = themeOption.value;
        optionButtonElement.addEventListener("click", function (optionClickEvent)
        {
            setTheme(themeValue);
            const projectPath = settingsViewState.projectPath;
            logApp(projectPath, t("history.changedTheme"), themeValue);
            loadAndRender();
        });
        optionsElement.appendChild(optionButtonElement);
    }

    sectionElement.appendChild(optionsElement);
    return sectionElement;
}

//=================================================================================================
// 언어 설정(지원 언어 선택)을 만든다. 변경 시 재로드해 전체에 반영한다.
//=================================================================================================
function createLanguageSetting()
{
    const sectionElement = createSettingsSection(t("settings.language"));

    const selectElement = document.createElement("select");
    selectElement.className = "select-input";

    const currentLocale = getLocale();
    for (const supportedLocale of SUPPORTED_LOCALES)
    {
        const optionElement = document.createElement("option");
        optionElement.value = supportedLocale.id;
        optionElement.textContent = supportedLocale.name;
        if (supportedLocale.id === currentLocale)
        {
            optionElement.selected = true;
        }
        selectElement.appendChild(optionElement);
    }

    selectElement.addEventListener("change", async function (selectChangeEvent)
    {
        const selectedLocale = selectElement.value;
        setLocale(selectedLocale);
        const projectPath = settingsViewState.projectPath;
        await logApp(projectPath, t("history.changedLanguage"), selectedLocale);
        const windowReference = window;
        windowReference.location.reload();
    });

    sectionElement.appendChild(selectElement);
    return sectionElement;
}

//=================================================================================================
// 현재 상태를 다시 그린다.
//=================================================================================================
function loadAndRender()
{
    const contentElement = settingsViewState.contentElement;
    if (contentElement === null)
    {
        return;
    }
    contentElement.replaceChildren();

    const headerElement = document.createElement("div");
    headerElement.className = "dashboard-header";
    const titleElement = document.createElement("h1");
    titleElement.className = "dashboard-title";
    titleElement.textContent = t("settings.title");
    headerElement.appendChild(titleElement);
    const descriptionElement = document.createElement("p");
    descriptionElement.className = "dashboard-description";
    descriptionElement.textContent = t("settings.description");
    headerElement.appendChild(descriptionElement);
    contentElement.appendChild(headerElement);

    const listElement = document.createElement("div");
    listElement.className = "settings-list";

    // 일반 그룹: 테마, 언어
    const generalGroupElement = createSettingsGroup(t("settings.groupGeneral"));
    const themeSectionElement = createThemeSetting();
    generalGroupElement.appendChild(themeSectionElement);
    const languageSectionElement = createLanguageSetting();
    generalGroupElement.appendChild(languageSectionElement);
    listElement.appendChild(generalGroupElement);

    // 개발 도구 그룹: 필요한 개발 도구 자동 설치
    const devToolsGroupElement = createSettingsGroup(t("settings.groupDevTools"));
    const autoInstallSectionElement = createAutoInstallSetting();
    devToolsGroupElement.appendChild(autoInstallSectionElement);
    listElement.appendChild(devToolsGroupElement);

    contentElement.appendChild(listElement);
}

export const settingsView =
{
    id: "settings",
    label: "Settings",
    render: function (contentElement, viewContext)
    {
        settingsViewState.contentElement = contentElement;
        settingsViewState.projectPath = viewContext.projectPath;
        loadAndRender();
    }
};
