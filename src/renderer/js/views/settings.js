//=================================================================================================
// views/settings.js
// 설정 뷰. ADE 환경설정 목록을 컨텐트 영역에 표시한다. (테마 설정, 언어 설정)
// 에이전트 목록에는 없고, 파일 > 환경설정 메뉴로 진입한다.
//=================================================================================================

const System = globalThis;

import { t, getLocale, setLocale, SUPPORTED_LOCALES } from "../locale.js";
import { getStoredTheme, setTheme } from "../themeManager.js";

const settingsViewState =
{
    contentElement: null
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

    selectElement.addEventListener("change", function (selectChangeEvent)
    {
        const selectedLocale = selectElement.value;
        setLocale(selectedLocale);
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

    const rootElement = document.createElement("div");
    rootElement.className = "settings-root";

    const headerElement = document.createElement("div");
    headerElement.className = "view-header";
    const titleElement = document.createElement("h1");
    titleElement.className = "view-title";
    titleElement.textContent = t("settings.title");
    headerElement.appendChild(titleElement);
    const descriptionElement = document.createElement("p");
    descriptionElement.className = "view-description";
    descriptionElement.textContent = t("settings.description");
    headerElement.appendChild(descriptionElement);
    rootElement.appendChild(headerElement);

    const listElement = document.createElement("div");
    listElement.className = "settings-list";

    // 일반 그룹: 테마, 언어
    const generalGroupElement = createSettingsGroup(t("settings.groupGeneral"));
    const themeSectionElement = createThemeSetting();
    generalGroupElement.appendChild(themeSectionElement);
    const languageSectionElement = createLanguageSetting();
    generalGroupElement.appendChild(languageSectionElement);
    listElement.appendChild(generalGroupElement);

    rootElement.appendChild(listElement);
    contentElement.appendChild(rootElement);
}

export const settingsView =
{
    id: "settings",
    render: function (contentElement, viewContext)
    {
        settingsViewState.contentElement = contentElement;
        loadAndRender();
    }
};
