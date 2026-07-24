//=================================================================================================
// views/pipeline.js
// 파이프라인 뷰(노드 그래프 에디터).
//   좌측: 파이프라인 목록(추가/선택/삭제)
//   중측: 액션 목록(팔레트) — 캔버스로 드래그해 액션 노드를 추가
//   우측: 플로우 맵(캔버스) — 시작/종료 노드 + 액션 노드, 포트 간 라인으로 처리 순서를 연결
// 파이프라인 = 액션 노드들의 집합 + 처리 순서. .vanilla/pipelines.json 에 저장.
//=================================================================================================

const System = globalThis;

import { t } from "../locale.js";
import { logSystem } from "../historyLog.js";
import { openContextMenu } from "../contextMenu.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const NODE_WIDTH = 156;
const NODE_HEIGHT = 48;
const GRID_SIZE = 20;
const SURFACE_WIDTH = 3000;
const SURFACE_HEIGHT = 2000;

//=================================================================================================
// 액션 카탈로그. 참고: pipemania/docs/개발-프로세스.md 의 빌드·테스트·배포 워크플로우.
//=================================================================================================
const ACTION_CATALOG =
[
    {
        actionId: "git-commit",
        category: "version"
    },
    {
        actionId: "web-build",
        category: "build"
    },
    {
        actionId: "version-info",
        category: "build"
    },
    {
        actionId: "deploy-web",
        category: "deploy"
    },
    {
        actionId: "work-log",
        category: "record"
    },
    {
        actionId: "platform-build",
        category: "build"
    },
    {
        actionId: "headless-test",
        category: "test"
    },
    {
        actionId: "device-test",
        category: "test"
    },
    {
        actionId: "store-upload",
        category: "deploy"
    }
];

const MINIMUM_COLUMN_WIDTH = 150;
const MAXIMUM_COLUMN_WIDTH = 420;

const pipelineViewState =
{
    projectPath: null,
    contentElement: null,
    pipelines: [],
    currentPipelineId: null,
    current: null,
    canvasElement: null,
    surfaceElement: null,
    edgeSvgElement: null,
    nodeLayerElement: null,
    panX: 0,
    panY: 0,
    dragState: null,
    listWidth: 190,
    actionWidth: 200,
    inspectorWidth: 280,
    listPanelElement: null,
    actionPanelElement: null,
    inspectorPanelElement: null,
    inspectorContainerElement: null,
    selectedNodeId: null,
    customActions: []
};

//=================================================================================================
// 액션 정의를 찾는다.
//=================================================================================================
function findActionDefinition(actionId)
{
    for (const actionDefinition of ACTION_CATALOG)
    {
        if (actionDefinition.actionId === actionId)
        {
            return actionDefinition;
        }
    }
    for (const customAction of pipelineViewState.customActions)
    {
        if (customAction.actionId === actionId)
        {
            return customAction;
        }
    }
    return null;
}

//=================================================================================================
// 액션의 표시 이름을 반환한다. (빌트인은 로케일, 커스텀은 저장된 이름)
//=================================================================================================
function getActionName(actionId)
{
    for (const actionDefinition of ACTION_CATALOG)
    {
        if (actionDefinition.actionId === actionId)
        {
            const actionNameKey = "action." + actionId;
            return t(actionNameKey);
        }
    }
    const customDefinition = findActionDefinition(actionId);
    if (customDefinition !== null && customDefinition.name !== undefined)
    {
        return customDefinition.name;
    }
    const fallbackKey = "action." + actionId;
    return t(fallbackKey);
}

//=================================================================================================
// 현재 파이프라인에서 노드를 찾는다.
//=================================================================================================
function findNode(nodeId)
{
    const current = pipelineViewState.current;
    if (current === null)
    {
        return null;
    }
    for (const node of current.nodes)
    {
        if (node.nodeId === nodeId)
        {
            return node;
        }
    }
    return null;
}

//=================================================================================================
// 액션 노드용 다음 정수 아이디를 계산한다.
//=================================================================================================
function computeNextNodeId(nodes)
{
    let maximumId = 0;
    for (const node of nodes)
    {
        const nodeId = node.nodeId;
        if (typeof nodeId === "number" && nodeId > maximumId)
        {
            maximumId = nodeId;
        }
    }
    return maximumId + 1;
}

//=================================================================================================
// 두 노드의 사각형이 (여백 포함) 겹치는지 확인한다.
//=================================================================================================
function nodesOverlap(nodeA, nodeB)
{
    const gap = 14;
    if (nodeA.x + NODE_WIDTH + gap <= nodeB.x)
    {
        return false;
    }
    if (nodeB.x + NODE_WIDTH + gap <= nodeA.x)
    {
        return false;
    }
    if (nodeA.y + NODE_HEIGHT + gap <= nodeB.y)
    {
        return false;
    }
    if (nodeB.y + NODE_HEIGHT + gap <= nodeA.y)
    {
        return false;
    }
    return true;
}

//=================================================================================================
// 노드 위치를 배경 그리드(GRID_SIZE)에 맞춰 스냅한다.
//=================================================================================================
function snapNodeToGrid(node)
{
    node.x = System.Math.round(node.x / GRID_SIZE) * GRID_SIZE;
    node.y = System.Math.round(node.y / GRID_SIZE) * GRID_SIZE;
    if (node.x < 0)
    {
        node.x = 0;
    }
    if (node.y < 0)
    {
        node.y = 0;
    }
}

//=================================================================================================
// movingNode 를 anchorNode 와 겹치지 않도록 최소 이동 방향으로 밀어낸다. (anchorNode 는 고정)
//=================================================================================================
function pushNodeAway(movingNode, anchorNode)
{
    const gap = 14;
    const rightTargetX = anchorNode.x + NODE_WIDTH + gap;
    const leftTargetX = anchorNode.x - NODE_WIDTH - gap;
    const downTargetY = anchorNode.y + NODE_HEIGHT + gap;
    const upTargetY = anchorNode.y - NODE_HEIGHT - gap;

    const rightCost = System.Math.abs(rightTargetX - movingNode.x);
    const leftCost = System.Math.abs(movingNode.x - leftTargetX);
    const downCost = System.Math.abs(downTargetY - movingNode.y);
    const upCost = System.Math.abs(movingNode.y - upTargetY);

    let bestAxis = "down";
    let bestCost = downCost;
    if (rightCost < bestCost)
    {
        bestCost = rightCost;
        bestAxis = "right";
    }
    if (leftTargetX >= 0 && leftCost < bestCost)
    {
        bestCost = leftCost;
        bestAxis = "left";
    }
    if (upTargetY >= 0 && upCost < bestCost)
    {
        bestCost = upCost;
        bestAxis = "up";
    }

    if (bestAxis === "right")
    {
        movingNode.x = rightTargetX;
    }
    else if (bestAxis === "left")
    {
        movingNode.x = leftTargetX;
    }
    else if (bestAxis === "up")
    {
        movingNode.y = upTargetY;
    }
    else
    {
        movingNode.y = downTargetY;
    }

    if (movingNode.x < 0)
    {
        movingNode.x = 0;
    }
    if (movingNode.y < 0)
    {
        movingNode.y = 0;
    }
}

//=================================================================================================
// 겹침을 해소한다. pinnedNodeId(방금 놓은 노드)는 고정하고, 겹치는 다른 노드들을 밀어낸다.
//=================================================================================================
function relaxOverlaps(pinnedNodeId)
{
    const nodes = pipelineViewState.current.nodes;
    let iterationCount = 0;
    while (iterationCount < 600)
    {
        let overlapFound = false;
        for (let indexA = 0; indexA < nodes.length; indexA++)
        {
            for (let indexB = indexA + 1; indexB < nodes.length; indexB++)
            {
                const nodeA = nodes[indexA];
                const nodeB = nodes[indexB];
                if (nodesOverlap(nodeA, nodeB) === false)
                {
                    continue;
                }
                overlapFound = true;
                if (nodeA.nodeId === pinnedNodeId)
                {
                    pushNodeAway(nodeB, nodeA);
                }
                else
                {
                    pushNodeAway(nodeA, nodeB);
                }
            }
        }
        if (overlapFound === false)
        {
            return;
        }
        iterationCount += 1;
    }
}

//=================================================================================================
// 클라이언트 좌표를 캔버스 로컬 좌표로 변환한다.
//=================================================================================================
function getCanvasPoint(clientX, clientY)
{
    const canvasElement = pipelineViewState.canvasElement;
    const canvasBounds = canvasElement.getBoundingClientRect();
    const localX = clientX - canvasBounds.left - pipelineViewState.panX;
    const localY = clientY - canvasBounds.top - pipelineViewState.panY;
    const point =
    {
        x: localX,
        y: localY
    };
    return point;
}

//=================================================================================================
// 현재 파이프라인을 저장하고 목록을 갱신한다.
//=================================================================================================
async function saveCurrent()
{
    const current = pipelineViewState.current;
    if (current === null)
    {
        return;
    }
    const vanilla = window.vanilla;
    const projectPath = pipelineViewState.projectPath;
    const savedPipeline = await vanilla.savePipeline(projectPath, current);
    pipelineViewState.current.id = savedPipeline.id;
    pipelineViewState.currentPipelineId = savedPipeline.id;
    const pipelines = await vanilla.listPipelines(projectPath);
    pipelineViewState.pipelines = pipelines;
    renderList();
}

//=================================================================================================
// 두 노드 사이에 엣지가 이미 있는지 확인한다.
//=================================================================================================
function hasEdge(fromNodeId, toNodeId)
{
    const current = pipelineViewState.current;
    for (const edge of current.edges)
    {
        if (edge.from === fromNodeId && edge.to === toNodeId)
        {
            return true;
        }
    }
    return false;
}

//=================================================================================================
// 엣지의 베지어 경로 문자열을 만든다.
//=================================================================================================
function buildEdgePath(fromNode, toNode)
{
    const startX = fromNode.x + NODE_WIDTH;
    const startY = fromNode.y + NODE_HEIGHT / 2;
    const endX = toNode.x;
    const endY = toNode.y + NODE_HEIGHT / 2;
    const controlOffset = 48;
    const pathData = "M " + startX + " " + startY
        + " C " + (startX + controlOffset) + " " + startY
        + ", " + (endX - controlOffset) + " " + endY
        + ", " + endX + " " + endY;
    return pathData;
}

//=================================================================================================
// 엣지들을 SVG 에 다시 그린다.
//=================================================================================================
function drawEdges()
{
    const edgeSvgElement = pipelineViewState.edgeSvgElement;
    edgeSvgElement.replaceChildren();

    const current = pipelineViewState.current;
    for (let edgeIndex = 0; edgeIndex < current.edges.length; edgeIndex++)
    {
        const edge = current.edges[edgeIndex];
        const fromNode = findNode(edge.from);
        const toNode = findNode(edge.to);
        if (fromNode === null || toNode === null)
        {
            continue;
        }
        const pathData = buildEdgePath(fromNode, toNode);
        const pathElement = document.createElementNS(SVG_NAMESPACE, "path");
        pathElement.setAttribute("d", pathData);
        pathElement.setAttribute("class", "flow-edge");
        const capturedIndex = edgeIndex;
        pathElement.addEventListener("click", function (edgeClickEvent)
        {
            removeEdge(capturedIndex);
        });
        edgeSvgElement.appendChild(pathElement);
    }
}

//=================================================================================================
// 엣지를 삭제한다.
//=================================================================================================
async function removeEdge(edgeIndex)
{
    const current = pipelineViewState.current;
    current.edges.splice(edgeIndex, 1);
    await saveCurrent();
    await logSystem(pipelineViewState.projectPath, t("history.disconnectedNodes"), "");
    renderCanvas();
}

//=================================================================================================
// 노드 하나의 엘리먼트를 만든다.
//=================================================================================================
function createNodeElement(node)
{
    const nodeElement = document.createElement("div");
    nodeElement.className = "flow-node flow-node-" + node.kind;
    if (node.nodeId === pipelineViewState.selectedNodeId)
    {
        nodeElement.classList.add("flow-node-selected");
    }
    nodeElement.style.left = node.x + "px";
    nodeElement.style.top = node.y + "px";
    nodeElement.style.width = NODE_WIDTH + "px";
    nodeElement.style.height = NODE_HEIGHT + "px";

    if (node.kind !== "start")
    {
        const inputPortElement = document.createElement("div");
        inputPortElement.className = "flow-port flow-port-input";
        inputPortElement.dataset.nodeId = String(node.nodeId);
        const inputNodeId = node.nodeId;
        inputPortElement.addEventListener("mousedown", function (inputPortMouseDownEvent)
        {
            inputPortMouseDownEvent.stopPropagation();
            inputPortMouseDownEvent.preventDefault();
            beginReconnectFromInput(inputNodeId, inputPortMouseDownEvent);
        });
        nodeElement.appendChild(inputPortElement);
    }

    const labelElement = document.createElement("div");
    labelElement.className = "flow-node-label";
    let nodeLabelText = node.name;
    if (node.kind === "start")
    {
        nodeLabelText = t("pipeline.startNode");
    }
    else if (node.kind === "end")
    {
        nodeLabelText = t("pipeline.endNode");
    }
    else if (node.actionId !== undefined)
    {
        nodeLabelText = getActionName(node.actionId);
    }
    labelElement.textContent = nodeLabelText;
    nodeElement.appendChild(labelElement);

    if (node.kind === "action")
    {
        const removeButtonElement = document.createElement("button");
        removeButtonElement.className = "flow-node-remove";
        removeButtonElement.textContent = "✕";
        const nodeId = node.nodeId;
        removeButtonElement.addEventListener("mousedown", function (removeMouseDownEvent)
        {
            removeMouseDownEvent.stopPropagation();
        });
        removeButtonElement.addEventListener("click", function (removeClickEvent)
        {
            removeClickEvent.stopPropagation();
            removeNode(nodeId);
        });
        nodeElement.appendChild(removeButtonElement);
    }

    if (node.kind !== "end")
    {
        const outputPortElement = document.createElement("div");
        outputPortElement.className = "flow-port flow-port-output";
        const fromNodeId = node.nodeId;
        outputPortElement.addEventListener("mousedown", function (portMouseDownEvent)
        {
            portMouseDownEvent.stopPropagation();
            portMouseDownEvent.preventDefault();
            beginEdgeDrag(fromNodeId, portMouseDownEvent);
        });
        nodeElement.appendChild(outputPortElement);
    }

    const nodeId = node.nodeId;
    nodeElement.addEventListener("mousedown", function (nodeMouseDownEvent)
    {
        beginNodeDrag(nodeId, nodeMouseDownEvent);
    });

    return nodeElement;
}

//=================================================================================================
// 액션 노드를 삭제한다. (연결된 엣지도 함께 제거)
//=================================================================================================
async function removeNode(nodeId)
{
    const current = pipelineViewState.current;
    const remainingNodes = [];
    for (const node of current.nodes)
    {
        if (node.nodeId !== nodeId)
        {
            remainingNodes.push(node);
        }
    }
    current.nodes = remainingNodes;

    const remainingEdges = [];
    for (const edge of current.edges)
    {
        if (edge.from !== nodeId && edge.to !== nodeId)
        {
            remainingEdges.push(edge);
        }
    }
    current.edges = remainingEdges;

    await saveCurrent();
    await logSystem(pipelineViewState.projectPath, t("history.removedNode"), "");
    renderCanvas();
}

//=================================================================================================
// 노드를 선택하고 하이라이트 + 인스펙터를 갱신한다.
//=================================================================================================
function selectNode(nodeId)
{
    pipelineViewState.selectedNodeId = nodeId;
    updateNodeSelectionHighlight();
    renderInspector();
}

//=================================================================================================
// 현재 선택 노드에 맞춰 노드 엘리먼트의 선택 하이라이트 클래스를 갱신한다.
//=================================================================================================
function updateNodeSelectionHighlight()
{
    const nodeLayerElement = pipelineViewState.nodeLayerElement;
    if (nodeLayerElement === null)
    {
        return;
    }
    const selectedNodeId = pipelineViewState.selectedNodeId;
    const nodeElements = nodeLayerElement.children;
    for (const nodeElement of nodeElements)
    {
        const elementNodeId = nodeElement.dataset.nodeId;
        if (elementNodeId === String(selectedNodeId))
        {
            nodeElement.classList.add("flow-node-selected");
        }
        else
        {
            nodeElement.classList.remove("flow-node-selected");
        }
    }
}

//=================================================================================================
// 노드 이동 드래그를 시작한다.
//=================================================================================================
function beginNodeDrag(nodeId, mouseEvent)
{
    const node = findNode(nodeId);
    if (node === null)
    {
        return;
    }
    selectNode(nodeId);
    const point = getCanvasPoint(mouseEvent.clientX, mouseEvent.clientY);
    const grabOffsetX = point.x - node.x;
    const grabOffsetY = point.y - node.y;
    pipelineViewState.dragState =
    {
        mode: "node",
        nodeId: nodeId,
        grabOffsetX: grabOffsetX,
        grabOffsetY: grabOffsetY
    };
}

//=================================================================================================
// 맵 배경 드래그(팬)를 시작한다. 빈 영역을 잡고 끌어 맵의 다른 부분으로 이동한다.
//=================================================================================================
function beginPanDrag(mouseEvent)
{
    selectNode(null);
    const canvasElement = pipelineViewState.canvasElement;
    if (canvasElement !== null)
    {
        canvasElement.classList.add("panning");
    }
    pipelineViewState.dragState =
    {
        mode: "pan",
        startClientX: mouseEvent.clientX,
        startClientY: mouseEvent.clientY,
        startPanX: pipelineViewState.panX,
        startPanY: pipelineViewState.panY
    };
}

//=================================================================================================
// 엣지 연결 드래그를 시작한다.
//=================================================================================================
function beginEdgeDrag(fromNodeId, mouseEvent)
{
    const temporaryPathElement = document.createElementNS(SVG_NAMESPACE, "path");
    temporaryPathElement.setAttribute("class", "flow-edge flow-edge-temporary");
    const edgeSvgElement = pipelineViewState.edgeSvgElement;
    edgeSvgElement.appendChild(temporaryPathElement);
    pipelineViewState.dragState =
    {
        mode: "edge",
        fromNodeId: fromNodeId,
        temporaryPathElement: temporaryPathElement,
        highlightedPort: null
    };
}

//=================================================================================================
// 엣지 드래그 중 커서 아래의 입력 포트를 찾아 대상 하이라이트를 갱신한다.
//=================================================================================================
function updateEdgeTargetHighlight(dragState, clientX, clientY)
{
    const targetElement = document.elementFromPoint(clientX, clientY);
    let targetPortElement = null;
    if (targetElement !== null && targetElement.classList.contains("flow-port-input") === true)
    {
        targetPortElement = targetElement;
    }

    const previousPortElement = dragState.highlightedPort;
    if (previousPortElement === targetPortElement)
    {
        return;
    }

    if (previousPortElement !== null && previousPortElement !== undefined)
    {
        previousPortElement.classList.remove("flow-port-target");
        const previousNodeElement = previousPortElement.closest(".flow-node");
        if (previousNodeElement !== null)
        {
            previousNodeElement.classList.remove("flow-node-target");
        }
    }
    if (targetPortElement !== null)
    {
        targetPortElement.classList.add("flow-port-target");
        const targetNodeElement = targetPortElement.closest(".flow-node");
        if (targetNodeElement !== null)
        {
            targetNodeElement.classList.add("flow-node-target");
        }
    }
    dragState.highlightedPort = targetPortElement;
}

//=================================================================================================
// 입력 포트를 눌러 기존 연결을 떼어내고, 그 소스에서 재연결 드래그를 시작한다.
//=================================================================================================
function beginReconnectFromInput(toNodeId, mouseEvent)
{
    const current = pipelineViewState.current;
    let existingEdgeIndex = -1;
    for (let edgeIndex = 0; edgeIndex < current.edges.length; edgeIndex++)
    {
        const edge = current.edges[edgeIndex];
        if (edge.to === toNodeId)
        {
            existingEdgeIndex = edgeIndex;
            break;
        }
    }
    if (existingEdgeIndex < 0)
    {
        return;
    }
    const existingEdge = current.edges[existingEdgeIndex];
    const fromNodeId = existingEdge.from;
    current.edges.splice(existingEdgeIndex, 1);
    renderCanvas();
    beginEdgeDrag(fromNodeId, mouseEvent);
    saveCurrent();
}

//=================================================================================================
// 팔레트에서 액션 노드 드래그를 시작한다.
//=================================================================================================
function beginPaletteDrag(actionId, mouseEvent)
{
    const actionDefinition = findActionDefinition(actionId);
    if (actionDefinition === null)
    {
        return;
    }
    const ghostElement = document.createElement("div");
    ghostElement.className = "flow-drag-ghost";
    ghostElement.textContent = getActionName(actionDefinition.actionId);
    document.body.appendChild(ghostElement);
    ghostElement.style.left = mouseEvent.clientX + "px";
    ghostElement.style.top = mouseEvent.clientY + "px";
    pipelineViewState.dragState =
    {
        mode: "palette",
        actionId: actionId,
        ghostElement: ghostElement
    };
}

//=================================================================================================
// 문서 마우스 이동 처리. (드래그 모드별 분기)
//=================================================================================================
function handleDocumentMouseMove(mouseEvent)
{
    const dragState = pipelineViewState.dragState;
    if (dragState === null)
    {
        return;
    }
    if (dragState.mode === "pan")
    {
        const canvasElement = pipelineViewState.canvasElement;
        const deltaX = mouseEvent.clientX - dragState.startClientX;
        const deltaY = mouseEvent.clientY - dragState.startClientY;
        let nextPanX = dragState.startPanX + deltaX;
        let nextPanY = dragState.startPanY + deltaY;
        const minimumPanX = canvasElement.clientWidth - SURFACE_WIDTH;
        const minimumPanY = canvasElement.clientHeight - SURFACE_HEIGHT;
        if (nextPanX > 0)
        {
            nextPanX = 0;
        }
        if (nextPanX < minimumPanX)
        {
            nextPanX = minimumPanX;
        }
        if (nextPanY > 0)
        {
            nextPanY = 0;
        }
        if (nextPanY < minimumPanY)
        {
            nextPanY = minimumPanY;
        }
        pipelineViewState.panX = nextPanX;
        pipelineViewState.panY = nextPanY;
        applyCanvasTransform();
        return;
    }
    if (dragState.mode === "column")
    {
        const deltaX = mouseEvent.clientX - dragState.startX;
        let nextWidth = dragState.startWidth + deltaX;
        if (dragState.target === "inspector")
        {
            nextWidth = dragState.startWidth - deltaX;
        }
        if (nextWidth < MINIMUM_COLUMN_WIDTH)
        {
            nextWidth = MINIMUM_COLUMN_WIDTH;
        }
        if (nextWidth > MAXIMUM_COLUMN_WIDTH)
        {
            nextWidth = MAXIMUM_COLUMN_WIDTH;
        }
        if (dragState.target === "list")
        {
            pipelineViewState.listWidth = nextWidth;
            const listPanelElement = pipelineViewState.listPanelElement;
            if (listPanelElement !== null)
            {
                listPanelElement.style.width = nextWidth + "px";
            }
        }
        else if (dragState.target === "action")
        {
            pipelineViewState.actionWidth = nextWidth;
            const actionPanelElement = pipelineViewState.actionPanelElement;
            if (actionPanelElement !== null)
            {
                actionPanelElement.style.width = nextWidth + "px";
            }
        }
        else
        {
            pipelineViewState.inspectorWidth = nextWidth;
            const inspectorPanelElement = pipelineViewState.inspectorPanelElement;
            if (inspectorPanelElement !== null)
            {
                inspectorPanelElement.style.width = nextWidth + "px";
            }
        }
        return;
    }
    if (dragState.mode === "node")
    {
        const node = findNode(dragState.nodeId);
        if (node === null)
        {
            return;
        }
        const point = getCanvasPoint(mouseEvent.clientX, mouseEvent.clientY);
        let nextX = point.x - dragState.grabOffsetX;
        let nextY = point.y - dragState.grabOffsetY;
        if (nextX < 0)
        {
            nextX = 0;
        }
        if (nextY < 0)
        {
            nextY = 0;
        }
        node.x = nextX;
        node.y = nextY;
        const nodeLayerElement = pipelineViewState.nodeLayerElement;
        const nodeElements = nodeLayerElement.children;
        for (const nodeElement of nodeElements)
        {
            const elementNodeId = nodeElement.dataset.nodeId;
            if (elementNodeId === String(dragState.nodeId))
            {
                nodeElement.style.left = nextX + "px";
                nodeElement.style.top = nextY + "px";
            }
        }
        drawEdges();
        return;
    }
    if (dragState.mode === "edge")
    {
        const fromNode = findNode(dragState.fromNodeId);
        if (fromNode === null)
        {
            return;
        }
        const point = getCanvasPoint(mouseEvent.clientX, mouseEvent.clientY);
        const startX = fromNode.x + NODE_WIDTH;
        const startY = fromNode.y + NODE_HEIGHT / 2;
        const controlOffset = 48;
        const pathData = "M " + startX + " " + startY
            + " C " + (startX + controlOffset) + " " + startY
            + ", " + (point.x - controlOffset) + " " + point.y
            + ", " + point.x + " " + point.y;
        dragState.temporaryPathElement.setAttribute("d", pathData);
        updateEdgeTargetHighlight(dragState, mouseEvent.clientX, mouseEvent.clientY);
        return;
    }
    if (dragState.mode === "palette")
    {
        const ghostElement = dragState.ghostElement;
        ghostElement.style.left = mouseEvent.clientX + "px";
        ghostElement.style.top = mouseEvent.clientY + "px";
        return;
    }
}

//=================================================================================================
// 클라이언트 좌표가 캔버스 영역 안인지 확인한다.
//=================================================================================================
function isInsideCanvas(clientX, clientY)
{
    const canvasElement = pipelineViewState.canvasElement;
    if (canvasElement === null)
    {
        return false;
    }
    const canvasBounds = canvasElement.getBoundingClientRect();
    if (clientX < canvasBounds.left || clientX > canvasBounds.right)
    {
        return false;
    }
    if (clientY < canvasBounds.top || clientY > canvasBounds.bottom)
    {
        return false;
    }
    return true;
}

//=================================================================================================
// 문서 마우스 업 처리. (드래그 종료·확정)
//=================================================================================================
async function handleDocumentMouseUp(mouseEvent)
{
    const dragState = pipelineViewState.dragState;
    if (dragState === null)
    {
        return;
    }
    pipelineViewState.dragState = null;

    if (dragState.mode === "pan")
    {
        const canvasElement = pipelineViewState.canvasElement;
        if (canvasElement !== null)
        {
            canvasElement.classList.remove("panning");
        }
        return;
    }

    if (dragState.mode === "node")
    {
        const movedNode = findNode(dragState.nodeId);
        if (movedNode !== null)
        {
            snapNodeToGrid(movedNode);
            relaxOverlaps(movedNode.nodeId);
            renderCanvas();
        }
        await saveCurrent();
        return;
    }
    if (dragState.mode === "edge")
    {
        const temporaryPathElement = dragState.temporaryPathElement;
        temporaryPathElement.remove();
        const targetElement = document.elementFromPoint(mouseEvent.clientX, mouseEvent.clientY);
        if (targetElement !== null && targetElement.classList.contains("flow-port-input") === true)
        {
            const toNodeIdRaw = targetElement.dataset.nodeId;
            let toNodeId = toNodeIdRaw;
            const numericToNodeId = System.Number(toNodeIdRaw);
            if (String(numericToNodeId) === toNodeIdRaw)
            {
                toNodeId = numericToNodeId;
            }
            const fromNodeId = dragState.fromNodeId;
            if (toNodeId !== fromNodeId && hasEdge(fromNodeId, toNodeId) === false)
            {
                const current = pipelineViewState.current;
                const newEdge =
                {
                    from: fromNodeId,
                    to: toNodeId
                };
                current.edges.push(newEdge);
                await saveCurrent();
                await logSystem(pipelineViewState.projectPath, t("history.connectedNodes"), "");
            }
        }
        renderCanvas();
        return;
    }
    if (dragState.mode === "palette")
    {
        const ghostElement = dragState.ghostElement;
        ghostElement.remove();
        const insideCanvas = isInsideCanvas(mouseEvent.clientX, mouseEvent.clientY);
        if (insideCanvas === true)
        {
            const actionDefinition = findActionDefinition(dragState.actionId);
            const point = getCanvasPoint(mouseEvent.clientX, mouseEvent.clientY);
            const current = pipelineViewState.current;
            const newNodeId = computeNextNodeId(current.nodes);
            const newNode =
            {
                nodeId: newNodeId,
                kind: "action",
                actionId: actionDefinition.actionId,
                name: getActionName(actionDefinition.actionId),
                config: {},
                x: point.x - NODE_WIDTH / 2,
                y: point.y - NODE_HEIGHT / 2
            };
            if (newNode.x < 0)
            {
                newNode.x = 0;
            }
            if (newNode.y < 0)
            {
                newNode.y = 0;
            }
            snapNodeToGrid(newNode);
            current.nodes.push(newNode);
            relaxOverlaps(newNode.nodeId);
            await saveCurrent();
            await logSystem(pipelineViewState.projectPath, t("history.addedNode"), newNode.name);
            renderCanvas();
        }
        return;
    }
}

//=================================================================================================
// 노드를 엣지 흐름에 따라 레이어(열)로 예쁘게 자동 배치한다.
//=================================================================================================
async function autoArrange()
{
    const current = pipelineViewState.current;
    if (current === null)
    {
        return;
    }
    const nodes = current.nodes;
    const edges = current.edges;

    // 각 노드의 깊이(시작으로부터의 최장 경로)를 반복 완화로 계산한다.
    const depthMap = {};
    for (const node of nodes)
    {
        depthMap[node.nodeId] = 0;
    }
    let isChanged = true;
    let guardCount = 0;
    while (isChanged === true && guardCount < 1000)
    {
        isChanged = false;
        for (const edge of edges)
        {
            const fromDepth = depthMap[edge.from];
            const toDepth = depthMap[edge.to];
            if (fromDepth !== undefined && toDepth !== undefined)
            {
                if (toDepth < fromDepth + 1)
                {
                    depthMap[edge.to] = fromDepth + 1;
                    isChanged = true;
                }
            }
        }
        guardCount += 1;
    }

    // 깊이별로 노드를 모은다.
    const layers = {};
    let maximumDepth = 0;
    for (const node of nodes)
    {
        const nodeDepth = depthMap[node.nodeId];
        if (layers[nodeDepth] === undefined)
        {
            layers[nodeDepth] = [];
        }
        layers[nodeDepth].push(node);
        if (nodeDepth > maximumDepth)
        {
            maximumDepth = nodeDepth;
        }
    }

    // 세로(위→아래) 흐름: 깊이가 커질수록 아래로 내려가고, 각 층은 가로 중앙 정렬한다.
    const marginX = 60;
    const marginY = 40;
    const columnGap = NODE_WIDTH + 40;
    const rowGap = NODE_HEIGHT + 60;

    // 가장 넓은 층을 기준으로 공통 중심 X 를 잡는다.
    let maximumLayerSize = 1;
    for (let depth = 0; depth <= maximumDepth; depth++)
    {
        const layerNodes = layers[depth];
        if (layerNodes === undefined)
        {
            continue;
        }
        if (layerNodes.length > maximumLayerSize)
        {
            maximumLayerSize = layerNodes.length;
        }
    }
    const centerX = marginX + (maximumLayerSize - 1) * columnGap / 2 + NODE_WIDTH / 2;

    for (let depth = 0; depth <= maximumDepth; depth++)
    {
        const layerNodes = layers[depth];
        if (layerNodes === undefined)
        {
            continue;
        }
        for (let columnIndex = 0; columnIndex < layerNodes.length; columnIndex++)
        {
            const node = layerNodes[columnIndex];
            const centerOffset = (columnIndex - (layerNodes.length - 1) / 2) * columnGap;
            node.x = centerX + centerOffset - NODE_WIDTH / 2;
            node.y = marginY + depth * rowGap;
            snapNodeToGrid(node);
        }
    }

    // 정렬 직후 상단(시작 노드)이 보이도록 맵 이동을 초기화한다.
    pipelineViewState.panX = 0;
    pipelineViewState.panY = 0;

    await saveCurrent();
    renderCanvas();
}

//=================================================================================================
// 캔버스(엣지 SVG + 노드 레이어)를 다시 그린다.
//=================================================================================================
function renderCanvas()
{
    const canvasElement = pipelineViewState.canvasElement;
    if (canvasElement === null)
    {
        return;
    }
    canvasElement.replaceChildren();

    // 맵의 내부 면(뷰포트보다 큰 스크롤 영역). 빈 곳을 드래그하면 이 면을 이동한다.
    const surfaceElement = document.createElement("div");
    surfaceElement.className = "pipeline-canvas-surface";
    surfaceElement.style.width = SURFACE_WIDTH + "px";
    surfaceElement.style.height = SURFACE_HEIGHT + "px";
    canvasElement.appendChild(surfaceElement);
    pipelineViewState.surfaceElement = surfaceElement;

    const edgeSvgElement = document.createElementNS(SVG_NAMESPACE, "svg");
    edgeSvgElement.setAttribute("class", "flow-edges");
    edgeSvgElement.setAttribute("width", String(SURFACE_WIDTH));
    edgeSvgElement.setAttribute("height", String(SURFACE_HEIGHT));
    surfaceElement.appendChild(edgeSvgElement);
    pipelineViewState.edgeSvgElement = edgeSvgElement;

    const nodeLayerElement = document.createElement("div");
    nodeLayerElement.className = "flow-node-layer";
    surfaceElement.appendChild(nodeLayerElement);
    pipelineViewState.nodeLayerElement = nodeLayerElement;

    const current = pipelineViewState.current;
    for (const node of current.nodes)
    {
        const nodeElement = createNodeElement(node);
        nodeElement.dataset.nodeId = String(node.nodeId);
        nodeLayerElement.appendChild(nodeElement);
    }

    applyCanvasTransform();
    drawEdges();
}

//=================================================================================================
// 현재 pan 오프셋을 맵 내부 면에 적용한다.
//=================================================================================================
function applyCanvasTransform()
{
    const surfaceElement = pipelineViewState.surfaceElement;
    if (surfaceElement === null)
    {
        return;
    }
    const translateX = pipelineViewState.panX;
    const translateY = pipelineViewState.panY;
    surfaceElement.style.transform = "translate(" + translateX + "px, " + translateY + "px)";
}

//=================================================================================================
// 좌측 파이프라인 목록을 다시 그린다.
//=================================================================================================
function renderList()
{
    const listContainerElement = pipelineViewState.listContainerElement;
    if (listContainerElement === undefined || listContainerElement === null)
    {
        return;
    }
    listContainerElement.replaceChildren();

    const pipelines = pipelineViewState.pipelines;
    if (pipelines.length === 0)
    {
        const emptyElement = document.createElement("p");
        emptyElement.className = "pipeline-list-empty";
        emptyElement.textContent = t("pipeline.listEmpty");
        listContainerElement.appendChild(emptyElement);
        return;
    }

    for (const pipeline of pipelines)
    {
        const itemElement = document.createElement("div");
        itemElement.className = "pipeline-list-item";
        if (pipeline.id === pipelineViewState.currentPipelineId)
        {
            itemElement.classList.add("active");
        }

        const nameElement = document.createElement("button");
        nameElement.className = "pipeline-list-name";
        nameElement.textContent = pipeline.name;
        const pipelineId = pipeline.id;
        const pipelineName = pipeline.name;
        nameElement.addEventListener("click", function (nameClickEvent)
        {
            selectPipeline(pipelineId);
        });
        nameElement.addEventListener("dblclick", function (nameDoubleClickEvent)
        {
            beginListRename(itemElement, nameElement, pipelineId, pipelineName);
        });
        itemElement.appendChild(nameElement);

        const settingsButtonElement = document.createElement("button");
        settingsButtonElement.className = "icon-button";
        settingsButtonElement.textContent = "⚙";
        settingsButtonElement.addEventListener("click", function (settingsClickEvent)
        {
            settingsClickEvent.stopPropagation();
            const menuItems =
            [
                {
                    label: t("pipeline.rename"),
                    action: function ()
                    {
                        beginListRename(itemElement, nameElement, pipelineId, pipelineName);
                    }
                },
                {
                    label: t("pipeline.remove"),
                    action: function ()
                    {
                        deletePipeline(pipelineId);
                    }
                }
            ];
            openContextMenu(settingsButtonElement, menuItems);
        });
        itemElement.appendChild(settingsButtonElement);

        listContainerElement.appendChild(itemElement);
    }
}

//=================================================================================================
// 목록 항목을 인라인 입력으로 바꿔 이름 변경을 시작한다.
//=================================================================================================
function beginListRename(itemElement, nameElement, pipelineId, currentName)
{
    const inputElement = document.createElement("input");
    inputElement.className = "pipeline-list-rename-input";
    inputElement.type = "text";
    inputElement.value = currentName;
    itemElement.replaceChild(inputElement, nameElement);
    inputElement.focus();
    inputElement.select();

    let isFinished = false;

    function commitRename()
    {
        if (isFinished === true)
        {
            return;
        }
        isFinished = true;
        const newName = inputElement.value;
        renamePipelineInList(pipelineId, newName);
    }

    inputElement.addEventListener("blur", function (blurEvent)
    {
        commitRename();
    });
    inputElement.addEventListener("keydown", function (keyDownEvent)
    {
        if (keyDownEvent.key === "Enter")
        {
            commitRename();
        }
        else if (keyDownEvent.key === "Escape")
        {
            isFinished = true;
            renderList();
        }
    });
}

//=================================================================================================
// 목록에서 파이프라인 이름을 변경하고 저장한다.
//=================================================================================================
async function renamePipelineInList(pipelineId, newName)
{
    const vanilla = window.vanilla;
    const projectPath = pipelineViewState.projectPath;
    const pipelines = pipelineViewState.pipelines;
    for (const pipeline of pipelines)
    {
        if (pipeline.id === pipelineId)
        {
            pipeline.name = newName;
            await vanilla.savePipeline(projectPath, pipeline);
            await logSystem(projectPath, t("history.renamedPipeline"), newName);
            if (pipelineViewState.currentPipelineId === pipelineId && pipelineViewState.current !== null)
            {
                pipelineViewState.current.name = newName;
            }
            const updatedPipelines = await vanilla.listPipelines(projectPath);
            pipelineViewState.pipelines = updatedPipelines;
            renderList();
            return;
        }
    }
}

//=================================================================================================
// 새 파이프라인을 만든다. (시작/종료 노드 포함)
//=================================================================================================
async function createPipeline()
{
    const startNode =
    {
        nodeId: "start",
        kind: "start",
        name: t("pipeline.startNode"),
        x: 24,
        y: 190
    };
    const endNode =
    {
        nodeId: "end",
        kind: "end",
        name: t("pipeline.endNode"),
        x: 470,
        y: 190
    };
    const newPipeline =
    {
        name: t("pipeline.defaultName"),
        nodes: [startNode, endNode],
        edges: []
    };
    const vanilla = window.vanilla;
    const projectPath = pipelineViewState.projectPath;
    const savedPipeline = await vanilla.savePipeline(projectPath, newPipeline);
    pipelineViewState.current = savedPipeline;
    pipelineViewState.currentPipelineId = savedPipeline.id;
    await logSystem(projectPath, t("history.createdPipeline"), savedPipeline.name);
    const pipelines = await vanilla.listPipelines(projectPath);
    pipelineViewState.pipelines = pipelines;
    renderView();
}

//=================================================================================================
// 파이프라인을 선택해 편집기에 로드한다.
//=================================================================================================
function selectPipeline(pipelineId)
{
    const pipelines = pipelineViewState.pipelines;
    for (const pipeline of pipelines)
    {
        if (pipeline.id === pipelineId)
        {
            const pipelineJson = System.JSON.stringify(pipeline);
            const pipelineCopy = System.JSON.parse(pipelineJson);
            pipelineViewState.current = pipelineCopy;
            pipelineViewState.currentPipelineId = pipelineId;
            pipelineViewState.selectedNodeId = null;
            pipelineViewState.panX = 0;
            pipelineViewState.panY = 0;
            renderView();
            return;
        }
    }
}

//=================================================================================================
// 파이프라인을 삭제한다.
//=================================================================================================
async function deletePipeline(pipelineId)
{
    const vanilla = window.vanilla;
    const projectPath = pipelineViewState.projectPath;
    await vanilla.deletePipeline(projectPath, pipelineId);
    await logSystem(projectPath, t("history.deletedPipeline"), "");
    if (pipelineViewState.currentPipelineId === pipelineId)
    {
        pipelineViewState.current = null;
        pipelineViewState.currentPipelineId = null;
    }
    const pipelines = await vanilla.listPipelines(projectPath);
    pipelineViewState.pipelines = pipelines;
    renderView();
}

//=================================================================================================
// 중측 액션 팔레트를 만든다.
//=================================================================================================
function createActionPalette()
{
    const paletteElement = document.createElement("div");
    paletteElement.className = "pipeline-action-panel";
    paletteElement.style.width = pipelineViewState.actionWidth + "px";
    pipelineViewState.actionPanelElement = paletteElement;

    const headerElement = document.createElement("div");
    headerElement.className = "pipeline-list-header";

    const columnTitleElement = document.createElement("div");
    columnTitleElement.className = "pipeline-column-title";
    columnTitleElement.textContent = t("pipeline.actionsTitle");
    headerElement.appendChild(columnTitleElement);

    const settingsButtonElement = document.createElement("button");
    settingsButtonElement.className = "icon-button";
    settingsButtonElement.textContent = "⚙";
    settingsButtonElement.addEventListener("click", function (settingsClickEvent)
    {
        settingsClickEvent.stopPropagation();
        const menuItems =
        [
            {
                label: t("pipeline.newAction"),
                action: function ()
                {
                    openNewActionModal();
                }
            }
        ];
        openContextMenu(settingsButtonElement, menuItems);
    });
    headerElement.appendChild(settingsButtonElement);

    paletteElement.appendChild(headerElement);

    const combinedCatalog = ACTION_CATALOG.concat(pipelineViewState.customActions);
    for (const actionDefinition of combinedCatalog)
    {
        const cardElement = document.createElement("div");
        cardElement.className = "action-card";

        const nameElement = document.createElement("span");
        nameElement.className = "action-card-name";
        nameElement.textContent = getActionName(actionDefinition.actionId);
        cardElement.appendChild(nameElement);

        const categoryElement = document.createElement("span");
        categoryElement.className = "action-card-category";
        const actionCategoryKey = "category." + actionDefinition.category;
        categoryElement.textContent = t(actionCategoryKey);
        cardElement.appendChild(categoryElement);

        const actionId = actionDefinition.actionId;
        cardElement.addEventListener("mousedown", function (cardMouseDownEvent)
        {
            cardMouseDownEvent.preventDefault();
            beginPaletteDrag(actionId, cardMouseDownEvent);
        });

        paletteElement.appendChild(cardElement);
    }

    return paletteElement;
}

//=================================================================================================
// 좌측 파이프라인 목록 패널을 만든다.
//=================================================================================================
function createListPanel()
{
    const listPanelElement = document.createElement("div");
    listPanelElement.className = "pipeline-list-panel";
    listPanelElement.style.width = pipelineViewState.listWidth + "px";
    pipelineViewState.listPanelElement = listPanelElement;

    const headerElement = document.createElement("div");
    headerElement.className = "pipeline-list-header";

    const columnTitleElement = document.createElement("div");
    columnTitleElement.className = "pipeline-column-title";
    columnTitleElement.textContent = t("pipeline.listTitle");
    headerElement.appendChild(columnTitleElement);

    const addButtonElement = document.createElement("button");
    addButtonElement.className = "pipeline-add-button";
    addButtonElement.textContent = "+";
    addButtonElement.title = t("pipeline.new");
    addButtonElement.addEventListener("click", function (addClickEvent)
    {
        createPipeline();
    });
    headerElement.appendChild(addButtonElement);

    listPanelElement.appendChild(headerElement);

    const listContainerElement = document.createElement("div");
    listContainerElement.className = "pipeline-list-items";
    listPanelElement.appendChild(listContainerElement);
    pipelineViewState.listContainerElement = listContainerElement;

    return listPanelElement;
}

//=================================================================================================
// 컬럼 사이의 리사이즈 구분선을 만든다. (target: "list" | "action")
//=================================================================================================
function createColumnSplitter(target)
{
    const splitterElement = document.createElement("div");
    splitterElement.className = "pipeline-col-splitter";
    splitterElement.addEventListener("mousedown", function (splitterMouseDownEvent)
    {
        splitterMouseDownEvent.preventDefault();
        beginColumnDrag(target, splitterMouseDownEvent);
    });
    return splitterElement;
}

//=================================================================================================
// 컬럼 너비 조절 드래그를 시작한다.
//=================================================================================================
function beginColumnDrag(target, mouseEvent)
{
    let startWidth = pipelineViewState.listWidth;
    if (target === "action")
    {
        startWidth = pipelineViewState.actionWidth;
    }
    else if (target === "inspector")
    {
        startWidth = pipelineViewState.inspectorWidth;
    }
    pipelineViewState.dragState =
    {
        mode: "column",
        target: target,
        startX: mouseEvent.clientX,
        startWidth: startWidth
    };
}

//=================================================================================================
// 우측 플로우 맵 패널을 만든다.
//=================================================================================================
function createCanvasPanel()
{
    const canvasPanelElement = document.createElement("div");
    canvasPanelElement.className = "pipeline-canvas-panel";

    const headerElement = document.createElement("div");
    headerElement.className = "pipeline-canvas-header";

    const columnTitleElement = document.createElement("div");
    columnTitleElement.className = "pipeline-column-title";
    columnTitleElement.textContent = t("pipeline.mapTitle");
    headerElement.appendChild(columnTitleElement);

    const current = pipelineViewState.current;
    if (current !== null)
    {
        const settingsButtonElement = document.createElement("button");
        settingsButtonElement.className = "icon-button";
        settingsButtonElement.textContent = "⚙";
        settingsButtonElement.addEventListener("click", function (settingsClickEvent)
        {
            settingsClickEvent.stopPropagation();
            const menuItems =
            [
                {
                    label: t("pipeline.autoArrange"),
                    action: function ()
                    {
                        autoArrange();
                    }
                }
            ];
            openContextMenu(settingsButtonElement, menuItems);
        });
        headerElement.appendChild(settingsButtonElement);
    }

    canvasPanelElement.appendChild(headerElement);

    if (current === null)
    {
        const messageElement = document.createElement("p");
        messageElement.className = "dashboard-empty-message";
        messageElement.textContent = t("pipeline.canvasEmpty");
        canvasPanelElement.appendChild(messageElement);
        return canvasPanelElement;
    }

    const canvasElement = document.createElement("div");
    canvasElement.className = "pipeline-canvas";
    canvasElement.addEventListener("mousedown", function (canvasMouseDownEvent)
    {
        const targetElement = canvasMouseDownEvent.target;
        // 노드/포트/엣지 위가 아닌 빈 배경에서만 맵을 이동(팬)한다.
        const nodeUnderCursor = targetElement.closest(".flow-node");
        if (nodeUnderCursor !== null)
        {
            return;
        }
        if (targetElement.classList.contains("flow-edge") === true)
        {
            return;
        }
        beginPanDrag(canvasMouseDownEvent);
    });
    canvasPanelElement.appendChild(canvasElement);
    pipelineViewState.canvasElement = canvasElement;

    return canvasPanelElement;
}

//=================================================================================================
// 노드의 표시 이름을 반환한다.
//=================================================================================================
function getNodeDisplayName(node)
{
    if (node.kind === "start")
    {
        return t("pipeline.startNode");
    }
    if (node.kind === "end")
    {
        return t("pipeline.endNode");
    }
    return getActionName(node.actionId);
}

//=================================================================================================
// 인스펙터의 라벨/값 한 줄을 만든다.
//=================================================================================================
function createInspectorRow(labelText, valueText)
{
    const rowElement = document.createElement("div");
    rowElement.className = "inspector-row";

    const labelElement = document.createElement("div");
    labelElement.className = "inspector-row-label";
    labelElement.textContent = labelText;
    rowElement.appendChild(labelElement);

    const valueElement = document.createElement("div");
    valueElement.className = "inspector-row-value";
    valueElement.textContent = valueText;
    rowElement.appendChild(valueElement);

    return rowElement;
}

//=================================================================================================
// 우측 인스펙터 패널을 만든다.
//=================================================================================================
function createInspectorPanel()
{
    const inspectorPanelElement = document.createElement("div");
    inspectorPanelElement.className = "pipeline-inspector-panel";
    inspectorPanelElement.style.width = pipelineViewState.inspectorWidth + "px";
    pipelineViewState.inspectorPanelElement = inspectorPanelElement;

    const columnTitleElement = document.createElement("div");
    columnTitleElement.className = "pipeline-column-title";
    columnTitleElement.textContent = t("pipeline.inspector");
    inspectorPanelElement.appendChild(columnTitleElement);

    const containerElement = document.createElement("div");
    containerElement.className = "pipeline-inspector-content";
    inspectorPanelElement.appendChild(containerElement);
    pipelineViewState.inspectorContainerElement = containerElement;

    return inspectorPanelElement;
}

//=================================================================================================
// 선택된 노드에 맞춰 인스펙터 내용을 그린다.
//=================================================================================================
function renderInspector()
{
    const containerElement = pipelineViewState.inspectorContainerElement;
    if (containerElement === undefined || containerElement === null)
    {
        return;
    }
    containerElement.replaceChildren();

    const current = pipelineViewState.current;
    const selectedNodeId = pipelineViewState.selectedNodeId;
    if (current === null || selectedNodeId === null)
    {
        const emptyElement = document.createElement("p");
        emptyElement.className = "pipeline-inspector-empty";
        emptyElement.textContent = t("pipeline.inspectorEmpty");
        containerElement.appendChild(emptyElement);
        return;
    }

    const node = findNode(selectedNodeId);
    if (node === null)
    {
        const emptyElement = document.createElement("p");
        emptyElement.className = "pipeline-inspector-empty";
        emptyElement.textContent = t("pipeline.inspectorEmpty");
        containerElement.appendChild(emptyElement);
        return;
    }

    const nameElement = document.createElement("div");
    nameElement.className = "inspector-node-name";
    nameElement.textContent = getNodeDisplayName(node);
    containerElement.appendChild(nameElement);

    const typeRowElement = createInspectorRow(t("pipeline.nodeType"), node.kind);
    containerElement.appendChild(typeRowElement);

    if (node.kind === "action")
    {
        const notesLabelElement = document.createElement("div");
        notesLabelElement.className = "inspector-label";
        notesLabelElement.textContent = t("pipeline.nodeNotes");
        containerElement.appendChild(notesLabelElement);

        if (node.config === undefined)
        {
            node.config = {};
        }
        let notesValue = node.config.notes;
        if (notesValue === undefined)
        {
            notesValue = "";
        }
        const notesInputElement = document.createElement("textarea");
        notesInputElement.className = "text-area";
        notesInputElement.value = notesValue;
        notesInputElement.addEventListener("change", function (notesChangeEvent)
        {
            if (node.config === undefined)
            {
                node.config = {};
            }
            node.config.notes = notesInputElement.value;
            saveCurrent();
        });
        containerElement.appendChild(notesInputElement);

        const deleteButtonElement = document.createElement("button");
        deleteButtonElement.className = "danger-button inspector-delete-button";
        deleteButtonElement.textContent = t("pipeline.deleteNode");
        const nodeId = node.nodeId;
        deleteButtonElement.addEventListener("click", function (deleteClickEvent)
        {
            pipelineViewState.selectedNodeId = null;
            removeNode(nodeId);
        });
        containerElement.appendChild(deleteButtonElement);
    }
}

//=================================================================================================
// 텍스트 입력 모달을 띄운다. 확인 시 onConfirm(value) 를 호출한다.
//=================================================================================================
function openInputModal(titleText, placeholderText, onConfirm)
{
    const overlayElement = document.createElement("div");
    overlayElement.className = "modal-overlay";

    const dialogElement = document.createElement("div");
    dialogElement.className = "modal-dialog modal-dialog-compact";

    const titleElement = document.createElement("div");
    titleElement.className = "modal-title";
    titleElement.textContent = titleText;
    dialogElement.appendChild(titleElement);

    const inputElement = document.createElement("input");
    inputElement.className = "text-input";
    inputElement.type = "text";
    inputElement.placeholder = placeholderText;
    dialogElement.appendChild(inputElement);

    const footerElement = document.createElement("div");
    footerElement.className = "modal-footer";

    const cancelButtonElement = document.createElement("button");
    cancelButtonElement.className = "secondary-button";
    cancelButtonElement.textContent = t("common.cancel");
    cancelButtonElement.addEventListener("click", function (cancelClickEvent)
    {
        overlayElement.remove();
    });
    footerElement.appendChild(cancelButtonElement);

    const confirmButtonElement = document.createElement("button");
    confirmButtonElement.className = "primary-button";
    confirmButtonElement.textContent = t("common.confirm");

    function commitInput()
    {
        const inputValue = inputElement.value;
        overlayElement.remove();
        onConfirm(inputValue);
    }

    confirmButtonElement.addEventListener("click", function (confirmClickEvent)
    {
        commitInput();
    });
    inputElement.addEventListener("keydown", function (keyDownEvent)
    {
        if (keyDownEvent.key === "Enter")
        {
            commitInput();
        }
    });
    footerElement.appendChild(confirmButtonElement);

    dialogElement.appendChild(footerElement);
    overlayElement.appendChild(dialogElement);
    document.body.appendChild(overlayElement);
    inputElement.focus();
}

//=================================================================================================
// 새 액션 추가 모달을 연다.
//=================================================================================================
function openNewActionModal()
{
    openInputModal(t("pipeline.newAction"), t("pipeline.newActionPrompt"), function (nameValue)
    {
        const trimmedName = nameValue.trim();
        if (trimmedName.length === 0)
        {
            return;
        }
        addCustomAction(trimmedName);
    });
}

//=================================================================================================
// 커스텀 액션을 추가하고 저장한다.
//=================================================================================================
async function addCustomAction(nameValue)
{
    const vanilla = window.vanilla;
    const projectPath = pipelineViewState.projectPath;
    const currentDate = new System.Date();
    const uniqueActionId = "custom-" + currentDate.getTime();
    const actionItem =
    {
        actionId: uniqueActionId,
        name: nameValue,
        category: "custom"
    };
    await vanilla.saveAction(projectPath, actionItem);
    const actions = await vanilla.listActions(projectPath);
    pipelineViewState.customActions = actions;
    renderView();
}

//=================================================================================================
// 뷰 전체를 다시 그린다.
//=================================================================================================
function renderView()
{
    const contentElement = pipelineViewState.contentElement;
    if (contentElement === null)
    {
        return;
    }
    contentElement.replaceChildren();

    const rootElement = document.createElement("div");
    rootElement.className = "pipeline-view";

    const headerElement = document.createElement("div");
    headerElement.className = "dashboard-header";
    const titleElement = document.createElement("h1");
    titleElement.className = "dashboard-title";
    titleElement.textContent = t("nav.pipeline");
    headerElement.appendChild(titleElement);
    const descriptionElement = document.createElement("p");
    descriptionElement.className = "dashboard-description";
    descriptionElement.textContent = t("pipeline.description");
    headerElement.appendChild(descriptionElement);
    rootElement.appendChild(headerElement);

    const projectPath = pipelineViewState.projectPath;
    if (projectPath === null)
    {
        const messageElement = document.createElement("p");
        messageElement.className = "dashboard-empty-message";
        messageElement.textContent = t("common.noProject");
        rootElement.appendChild(messageElement);
        contentElement.appendChild(rootElement);
        return;
    }

    const bodyElement = document.createElement("div");
    bodyElement.className = "pipeline-editor";

    const listPanelElement = createListPanel();
    bodyElement.appendChild(listPanelElement);

    const listSplitterElement = createColumnSplitter("list");
    bodyElement.appendChild(listSplitterElement);

    const actionPanelElement = createActionPalette();
    bodyElement.appendChild(actionPanelElement);

    const actionSplitterElement = createColumnSplitter("action");
    bodyElement.appendChild(actionSplitterElement);

    const canvasPanelElement = createCanvasPanel();
    bodyElement.appendChild(canvasPanelElement);

    const inspectorSplitterElement = createColumnSplitter("inspector");
    bodyElement.appendChild(inspectorSplitterElement);

    const inspectorPanelElement = createInspectorPanel();
    bodyElement.appendChild(inspectorPanelElement);

    rootElement.appendChild(bodyElement);
    contentElement.appendChild(rootElement);

    renderList();
    if (pipelineViewState.current !== null)
    {
        renderCanvas();
    }
    renderInspector();
}

//=================================================================================================
// 저장된 파이프라인 목록을 불러온 뒤 렌더링한다.
//=================================================================================================
async function loadAndRender()
{
    const projectPath = pipelineViewState.projectPath;
    if (projectPath === null)
    {
        pipelineViewState.pipelines = [];
        pipelineViewState.current = null;
        renderView();
        return;
    }
    const vanilla = window.vanilla;
    const pipelines = await vanilla.listPipelines(projectPath);
    pipelineViewState.pipelines = pipelines;
    const customActions = await vanilla.listActions(projectPath);
    pipelineViewState.customActions = customActions;

    pipelineViewState.current = null;
    pipelineViewState.currentPipelineId = null;
    pipelineViewState.selectedNodeId = null;
    if (pipelines.length > 0)
    {
        const firstPipeline = pipelines[0];
        const pipelineJson = System.JSON.stringify(firstPipeline);
        const pipelineCopy = System.JSON.parse(pipelineJson);
        pipelineViewState.current = pipelineCopy;
        pipelineViewState.currentPipelineId = firstPipeline.id;
    }
    renderView();
}

document.addEventListener("mousemove", handleDocumentMouseMove);
document.addEventListener("mouseup", handleDocumentMouseUp);

export const pipelineView =
{
    id: "pipeline",
    label: "파이프라인",
    render: function (contentElement, viewContext)
    {
        pipelineViewState.projectPath = viewContext.projectPath;
        pipelineViewState.contentElement = contentElement;
        loadAndRender();
    }
};
