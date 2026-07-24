//=================================================================================================
// themeManager.js
// 라이트/다크 테마를 전환하고 선택을 localStorage 에 유지한다.
// 테마는 <html> 의 data-theme 속성으로 적용되며, CSS 변수 오버라이드로 색이 바뀐다.
//=================================================================================================

const System = globalThis;

const THEME_STORAGE_KEY = "vanilla-ade-theme";

//=================================================================================================
// 저장된 테마 이름을 반환한다. (기본값 "dark")
//=================================================================================================
export function getStoredTheme()
{
    const localStorage = window.localStorage;
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light")
    {
        return "light";
    }
    return "dark";
}

//=================================================================================================
// 현재 테마의 컬러 테이블(theme.json 의 light/dark 하위 객체)을 반환한다.
//=================================================================================================
export function getThemeColors(themeName)
{
    const themeTable = window.theme;
    if (themeTable === undefined)
    {
        return {};
    }
    const colorSet = themeTable[themeName];
    if (colorSet === undefined)
    {
        return {};
    }
    return colorSet;
}

//=================================================================================================
// theme.json 의 컬러 값을 CSS 변수(--color-*)로 문서에 주입한다.
//=================================================================================================
function applyColorTable(themeName)
{
    const colorSet = getThemeColors(themeName);
    const rootElement = document.documentElement;
    const rootStyle = rootElement.style;
    const colorKeys = System.Object.keys(colorSet);
    for (const colorKey of colorKeys)
    {
        const colorValue = colorSet[colorKey];
        const variableName = "--color-" + colorKey;
        rootStyle.setProperty(variableName, colorValue);
    }
}

//=================================================================================================
// 테마를 문서에 적용하고(CSS 변수 주입) 커스텀 타이틀바 색을 갱신한다.
//=================================================================================================
function applyTheme(themeName)
{
    const rootElement = document.documentElement;
    rootElement.setAttribute("data-theme", themeName);

    applyColorTable(themeName);

    const vanilla = window.vanilla;
    if (vanilla === undefined)
    {
        return;
    }
    const colorSet = getThemeColors(themeName);
    const overlayOptions =
    {
        color: colorSet.menubar,
        symbolColor: colorSet["text-strong"]
    };
    vanilla.setTitleBarOverlay(overlayOptions);
    vanilla.notifyTheme(themeName);
}

//=================================================================================================
// 저장된 테마로 초기화한다.
//=================================================================================================
export function initializeTheme()
{
    const themeName = getStoredTheme();
    applyTheme(themeName);
    return themeName;
}

//=================================================================================================
// 라이트/다크를 전환하고 저장한다. 전환된 테마 이름을 반환한다.
//=================================================================================================
export function toggleTheme()
{
    const currentTheme = getStoredTheme();
    let nextTheme = "dark";
    if (currentTheme === "dark")
    {
        nextTheme = "light";
    }
    setTheme(nextTheme);
    return nextTheme;
}

//=================================================================================================
// 지정한 테마로 설정하고 저장한다.
//=================================================================================================
export function setTheme(themeName)
{
    const localStorage = window.localStorage;
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
    applyTheme(themeName);
}
