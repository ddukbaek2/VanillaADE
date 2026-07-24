//=================================================================================================
// preferences.js
// 앱 전역 환경설정을 localStorage 에 유지한다. (테마/언어와 별개의 일반 설정)
//=================================================================================================

const System = globalThis;

const AUTO_INSTALL_STORAGE_KEY = "vanilla-ade-auto-install-devtools";

//=================================================================================================
// 필요한 개발 도구 자동 설치 설정을 반환한다. (기본값 false — 설치 여부를 먼저 확인)
//=================================================================================================
export function getAutoInstallDevTools()
{
    const localStorage = window.localStorage;
    const storedValue = localStorage.getItem(AUTO_INSTALL_STORAGE_KEY);
    if (storedValue === "true")
    {
        return true;
    }
    return false;
}

//=================================================================================================
// 필요한 개발 도구 자동 설치 설정을 저장한다.
//=================================================================================================
export function setAutoInstallDevTools(isEnabled)
{
    const localStorage = window.localStorage;
    const storedValue = isEnabled === true ? "true" : "false";
    localStorage.setItem(AUTO_INSTALL_STORAGE_KEY, storedValue);
}
