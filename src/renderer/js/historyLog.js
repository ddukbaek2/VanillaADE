//=================================================================================================
// historyLog.js
// 히스토리에 이벤트를 기록하고 토스트 알림을 함께 띄운다.
// 소스는 3가지: "agent"(에이전트 작업) / "project"(프로젝트 데이터 변경) / "app"(앱 환경설정 등).
//=================================================================================================

const System = globalThis;

import { showToast } from "./toast.js";

//=================================================================================================
// 히스토리에 항목을 추가하고 토스트를 띄운다. projectPath 가 없으면 토스트만 띄운다.
//=================================================================================================
export async function logHistory(projectPath, source, title, detail)
{
    showToast(title);
    if (projectPath === null || projectPath === undefined)
    {
        return;
    }
    const vanilla = window.vanilla;
    const currentDate = new System.Date();
    const nowIsoString = currentDate.toISOString();
    const historyItem =
    {
        source: source,
        title: title,
        detail: detail,
        createdAt: nowIsoString
    };
    await vanilla.appendHistory(projectPath, historyItem);
}

//=================================================================================================
// 프로젝트 데이터 변경 이벤트를 기록한다. (규칙/작업/파이프라인 등)
//=================================================================================================
export async function logProject(projectPath, title, detail)
{
    await logHistory(projectPath, "project", title, detail);
}

//=================================================================================================
// 앱 이벤트를 기록한다. (환경설정 등)
//=================================================================================================
export async function logApp(projectPath, title, detail)
{
    await logHistory(projectPath, "app", title, detail);
}

//=================================================================================================
// 하위 호환용 별칭. (기존 호출은 프로젝트 이벤트로 처리)
//=================================================================================================
export async function logSystem(projectPath, title, detail)
{
    await logProject(projectPath, title, detail);
}
