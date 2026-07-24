//=================================================================================================
// collection.js
// .vanilla 폴더의 이름별 JSON 배열(규칙/작업/히스토리 등)에 대한 목록/저장/삭제 CRUD 를 제공한다.
//=================================================================================================

const System = globalThis;
const project = require("./project");

//=================================================================================================
// 항목 배열에서 다음 정수 아이디(최대값 + 1)를 계산한다.
//=================================================================================================
function computeNextId(items)
{
    let maximumId = 0;
    for (const item of items)
    {
        const itemId = item.id;
        if (typeof itemId === "number" && itemId > maximumId)
        {
            maximumId = itemId;
        }
    }
    return maximumId + 1;
}

//=================================================================================================
// 컬렉션 전체 목록을 반환한다.
//=================================================================================================
async function listItems(projectDirectoryPath, fileName)
{
    const emptyList = [];
    const items = await project.readProjectJson(projectDirectoryPath, fileName, emptyList);
    return items;
}

//=================================================================================================
// 항목을 저장한다. id 가 없으면 새로 부여해 추가하고, 있으면 해당 항목을 교체한다. 저장된 항목을 반환한다.
//=================================================================================================
async function saveItem(projectDirectoryPath, fileName, item)
{
    const emptyList = [];
    const items = await project.readProjectJson(projectDirectoryPath, fileName, emptyList);

    const incomingId = item.id;
    if (incomingId === undefined || incomingId === null)
    {
        const newId = computeNextId(items);
        item.id = newId;
        items.push(item);
    }
    else
    {
        let isReplaced = false;
        for (let index = 0; index < items.length; index++)
        {
            const existingItem = items[index];
            if (existingItem.id === incomingId)
            {
                items[index] = item;
                isReplaced = true;
                break;
            }
        }
        if (isReplaced === false)
        {
            items.push(item);
        }
    }

    await project.writeProjectJson(projectDirectoryPath, fileName, items);
    return item;
}

//=================================================================================================
// 아이디로 항목을 삭제한다.
//=================================================================================================
async function deleteItem(projectDirectoryPath, fileName, itemId)
{
    const emptyList = [];
    const items = await project.readProjectJson(projectDirectoryPath, fileName, emptyList);
    const remainingItems = [];
    for (const item of items)
    {
        if (item.id !== itemId)
        {
            remainingItems.push(item);
        }
    }
    await project.writeProjectJson(projectDirectoryPath, fileName, remainingItems);
    return true;
}

module.exports =
{
    listItems,
    saveItem,
    deleteItem
};
