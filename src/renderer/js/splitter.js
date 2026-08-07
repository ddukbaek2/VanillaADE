//=================================================================================================
// splitter.js
// 에이전트 영역과 컨텐트 영역 사이의 구분선을 마우스로 드래그해 에이전트 영역 너비를 조절한다.
//=================================================================================================

const System = globalThis;

const MINIMUM_PANEL_WIDTH = 180;
const MAXIMUM_PANEL_WIDTH = 560;

//=================================================================================================
// 구분선 드래그 리사이즈를 초기화한다.
// splitterElement: 구분선 엘리먼트, applicationElement: 그리드 컨테이너(#application)
// onResize: 너비가 바뀔 때마다 호출되는 콜백
//=================================================================================================
export function initializeSplitter(splitterElement, applicationElement, onResize)
{
    let isDragging = false;

    function clampWidth(width)
    {
        if (width < MINIMUM_PANEL_WIDTH)
        {
            return MINIMUM_PANEL_WIDTH;
        }
        if (width > MAXIMUM_PANEL_WIDTH)
        {
            return MAXIMUM_PANEL_WIDTH;
        }
        return width;
    }

    function handlePointerMove(pointerMoveEvent)
    {
        if (isDragging === false)
        {
            return;
        }
        const applicationBounds = applicationElement.getBoundingClientRect();
        const pointerX = pointerMoveEvent.clientX;
        const rawWidth = pointerX - applicationBounds.left;
        const clampedWidth = clampWidth(rawWidth);
        const rootStyle = applicationElement.style;
        rootStyle.setProperty("--agent-panel-width", clampedWidth + "px");
        onResize();
    }

    function handlePointerUp(pointerUpEvent)
    {
        if (isDragging === false)
        {
            return;
        }
        isDragging = false;
        splitterElement.classList.remove("dragging");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    }

    splitterElement.addEventListener("pointerdown", function (pointerDownEvent)
    {
        pointerDownEvent.preventDefault();
        isDragging = true;
        splitterElement.classList.add("dragging");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    });

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
}
