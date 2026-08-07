//=================================================================================================
// contextMenu.js
// 앵커 엘리먼트 근처 또는 마우스 좌표에 뜨는 공용 컨텍스트 메뉴. menuItems: [{ label, action }]
//=================================================================================================

const System = globalThis;

const VIEWPORT_MARGIN = 8;

//=================================================================================================
// 메뉴 엘리먼트를 만들어 문서에 붙이고 반환한다. (이미 떠있는 메뉴는 닫는다)
//=================================================================================================
function createMenuElement(menuItems)
{
    const existingMenuElement = document.getElementById("app-context-menu");
    if (existingMenuElement !== null)
    {
        existingMenuElement.remove();
    }

    const menuElement = document.createElement("div");
    menuElement.id = "app-context-menu";
    menuElement.className = "context-menu";

    for (const menuItem of menuItems)
    {
        const itemButtonElement = document.createElement("button");
        itemButtonElement.className = "context-menu-item";
        const itemVariant = menuItem.variant;
        if (itemVariant !== undefined)
        {
            itemButtonElement.classList.add(itemVariant);
        }
        itemButtonElement.textContent = menuItem.label;
        const itemAction = menuItem.action;
        itemButtonElement.addEventListener("click", function (itemClickEvent)
        {
            itemClickEvent.stopPropagation();
            menuElement.remove();
            itemAction();
        });
        menuElement.appendChild(itemButtonElement);
    }

    document.body.appendChild(menuElement);
    return menuElement;
}

//=================================================================================================
// 메뉴를 지정 좌표에 배치한다. 화면 밖으로 나가지 않도록 보정한다.
//=================================================================================================
function placeMenuElement(menuElement, preferredLeft, preferredTop)
{
    const menuWidth = menuElement.offsetWidth;
    const menuHeight = menuElement.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let menuLeft = preferredLeft;
    const maximumLeft = viewportWidth - menuWidth - VIEWPORT_MARGIN;
    if (menuLeft > maximumLeft)
    {
        menuLeft = maximumLeft;
    }
    if (menuLeft < VIEWPORT_MARGIN)
    {
        menuLeft = VIEWPORT_MARGIN;
    }

    let menuTop = preferredTop;
    const maximumTop = viewportHeight - menuHeight - VIEWPORT_MARGIN;
    if (menuTop > maximumTop)
    {
        menuTop = maximumTop;
    }
    if (menuTop < VIEWPORT_MARGIN)
    {
        menuTop = VIEWPORT_MARGIN;
    }

    menuElement.style.left = menuLeft + "px";
    menuElement.style.top = menuTop + "px";
}

//=================================================================================================
// 메뉴 바깥 클릭 시 닫히도록 감시를 시작한다.
//=================================================================================================
function watchOutsideMouseDown(menuElement)
{
    function handleOutsideMouseDown(outsideMouseDownEvent)
    {
        const isInside = menuElement.contains(outsideMouseDownEvent.target);
        if (isInside === false)
        {
            menuElement.remove();
            document.removeEventListener("mousedown", handleOutsideMouseDown, true);
        }
    }
    window.setTimeout(function ()
    {
        document.addEventListener("mousedown", handleOutsideMouseDown, true);
    }, 0);
}

//=================================================================================================
// 앵커 엘리먼트 아래에 컨텍스트 메뉴를 띄운다.
//=================================================================================================
export function openContextMenu(anchorElement, menuItems)
{
    const menuElement = createMenuElement(menuItems);
    const anchorBounds = anchorElement.getBoundingClientRect();
    const menuWidth = menuElement.offsetWidth;
    const preferredLeft = anchorBounds.right - menuWidth;
    const preferredTop = anchorBounds.bottom + 4;
    placeMenuElement(menuElement, preferredLeft, preferredTop);
    watchOutsideMouseDown(menuElement);
}

//=================================================================================================
// 마우스 좌표 위치에 컨텍스트 메뉴를 띄운다. (우클릭용)
//=================================================================================================
export function openContextMenuAt(clientX, clientY, menuItems)
{
    const menuElement = createMenuElement(menuItems);
    placeMenuElement(menuElement, clientX, clientY);
    watchOutsideMouseDown(menuElement);
}
