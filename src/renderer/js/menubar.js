//=================================================================================================
// menubar.js
// 상단 인-윈도우 메뉴바(= 커스텀 타이틀바). 드롭다운, 니모닉(Alt+문자), 단축키(액셀러레이터) 처리.
//=================================================================================================

const System = globalThis;

//=================================================================================================
// "Ctrl+Shift+O" 같은 액셀러레이터 문자열을 { ctrl, shift, alt, key } 로 파싱한다.
//=================================================================================================
function parseAccelerator(acceleratorText)
{
    const parts = acceleratorText.split("+");
    const parsed =
    {
        ctrl: false,
        shift: false,
        alt: false,
        key: ""
    };
    for (const part of parts)
    {
        const trimmedPart = part.trim();
        const lowerPart = trimmedPart.toLowerCase();
        if (lowerPart === "ctrl")
        {
            parsed.ctrl = true;
        }
        else if (lowerPart === "shift")
        {
            parsed.shift = true;
        }
        else if (lowerPart === "alt")
        {
            parsed.alt = true;
        }
        else
        {
            parsed.key = lowerPart;
        }
    }
    return parsed;
}

//=================================================================================================
// 메뉴 정의 배열을 받아 메뉴바를 구성한다.
// brandLabel: 좌측 브랜드 문자열
// menuDefinitions: [{ label, mnemonic, items: [{ label, accelerator, bindGlobal, action }] }]
//=================================================================================================
export function createMenubar(menubarElement, brandLabel, menuDefinitions)
{
    let openMenuElement = null;

    const brandElement = document.createElement("div");
    brandElement.className = "menubar-brand";

    const brandMarkElement = document.createElement("span");
    brandMarkElement.className = "menubar-brand-mark";
    brandElement.appendChild(brandMarkElement);

    const brandTextElement = document.createElement("span");
    brandTextElement.className = "menubar-brand-text";
    brandTextElement.textContent = brandLabel;
    brandElement.appendChild(brandTextElement);

    menubarElement.appendChild(brandElement);

    function closeOpenMenu()
    {
        if (openMenuElement !== null)
        {
            openMenuElement.classList.remove("open");
            openMenuElement = null;
        }
    }

    function openMenu(menuElement)
    {
        closeOpenMenu();
        menuElement.classList.add("open");
        openMenuElement = menuElement;
    }

    document.addEventListener("click", function (documentClickEvent)
    {
        closeOpenMenu();
    });

    const mnemonicMap = new System.Map();
    const acceleratorBindings = [];

    for (const menuDefinition of menuDefinitions)
    {
        const menuElement = document.createElement("div");
        menuElement.className = "menu";

        const menuTitleElement = document.createElement("button");
        menuTitleElement.className = "menu-title";
        menuTitleElement.textContent = menuDefinition.label;
        menuElement.appendChild(menuTitleElement);

        const dropdownElement = document.createElement("div");
        dropdownElement.className = "menu-dropdown";

        for (const itemDefinition of menuDefinition.items)
        {
            const itemElement = document.createElement("button");
            itemElement.className = "menu-item";

            const itemLabelElement = document.createElement("span");
            itemLabelElement.className = "menu-item-label";
            itemLabelElement.textContent = itemDefinition.label;
            itemElement.appendChild(itemLabelElement);

            const acceleratorText = itemDefinition.accelerator;
            if (acceleratorText !== undefined)
            {
                const acceleratorElement = document.createElement("span");
                acceleratorElement.className = "menu-item-accelerator";
                acceleratorElement.textContent = acceleratorText;
                itemElement.appendChild(acceleratorElement);
            }

            const itemAction = itemDefinition.action;
            itemElement.addEventListener("click", function (itemClickEvent)
            {
                itemClickEvent.stopPropagation();
                closeOpenMenu();
                itemAction();
            });
            dropdownElement.appendChild(itemElement);

            const bindGlobal = itemDefinition.bindGlobal;
            if (acceleratorText !== undefined && bindGlobal !== false)
            {
                const parsedAccelerator = parseAccelerator(acceleratorText);
                const binding =
                {
                    parsed: parsedAccelerator,
                    action: itemAction
                };
                acceleratorBindings.push(binding);
            }
        }

        menuElement.appendChild(dropdownElement);

        menuTitleElement.addEventListener("click", function (titleClickEvent)
        {
            titleClickEvent.stopPropagation();
            const isCurrentlyOpen = menuElement.classList.contains("open");
            closeOpenMenu();
            if (isCurrentlyOpen === false)
            {
                openMenu(menuElement);
            }
        });

        const mnemonic = menuDefinition.mnemonic;
        if (mnemonic !== undefined)
        {
            const lowerMnemonic = mnemonic.toLowerCase();
            mnemonicMap.set(lowerMnemonic, menuElement);
        }

        menubarElement.appendChild(menuElement);
    }

    document.addEventListener("keydown", function (keyDownEvent)
    {
        const pressedKey = keyDownEvent.key.toLowerCase();

        // Alt + 니모닉 문자로 해당 메뉴를 연다.
        if (keyDownEvent.altKey === true && keyDownEvent.ctrlKey === false)
        {
            const mnemonicMenuElement = mnemonicMap.get(pressedKey);
            if (mnemonicMenuElement !== undefined)
            {
                keyDownEvent.preventDefault();
                const isCurrentlyOpen = mnemonicMenuElement.classList.contains("open");
                if (isCurrentlyOpen === true)
                {
                    closeOpenMenu();
                }
                else
                {
                    openMenu(mnemonicMenuElement);
                }
                return;
            }
        }

        // Escape 로 열린 메뉴를 닫는다.
        if (pressedKey === "escape")
        {
            closeOpenMenu();
            return;
        }

        // 등록된 액셀러레이터 처리.
        for (const binding of acceleratorBindings)
        {
            const parsed = binding.parsed;
            if (keyDownEvent.ctrlKey === parsed.ctrl
                && keyDownEvent.shiftKey === parsed.shift
                && keyDownEvent.altKey === parsed.alt
                && pressedKey === parsed.key)
            {
                keyDownEvent.preventDefault();
                closeOpenMenu();
                const bindingAction = binding.action;
                bindingAction();
                return;
            }
        }
    });
}
