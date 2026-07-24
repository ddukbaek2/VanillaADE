//=================================================================================================
// contextMenu.js
// 앵커 엘리먼트 근처에 뜨는 공용 컨텍스트 메뉴. menuItems: [{ label, action }]
//=================================================================================================

const System = globalThis;

//=================================================================================================
// 컨텍스트 메뉴를 띄운다. (이미 떠있는 메뉴는 닫고 새로 연다)
//=================================================================================================
export function openContextMenu(anchorElement, menuItems)
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

    const anchorBounds = anchorElement.getBoundingClientRect();
    const menuWidth = menuElement.offsetWidth;
    let menuLeft = anchorBounds.right - menuWidth;
    if (menuLeft < 8)
    {
        menuLeft = 8;
    }
    const menuTop = anchorBounds.bottom + 4;
    menuElement.style.left = menuLeft + "px";
    menuElement.style.top = menuTop + "px";

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
