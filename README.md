<div align="center">

<img src="references/icons/4_dark_filled/icon_256.png" width="112" height="112" alt="Vanilla ADE" />

# Vanilla ADE

**AI 기반 크로스플랫폼 애플리케이션 개발 환경 (ADE)**

AI 에이전트가 크로스플랫폼 앱을 구현 · 테스트 · 빌드 · 배포하는 데스크톱 개발 환경.
앱을 만드는 앱, Vanilla ADE.

[![Website](https://img.shields.io/badge/웹사이트-다운로드-e0a52c?style=flat-square)](https://ddukbaek2.com/VanillaADE/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%C2%B7%20macOS%20%C2%B7%20Linux%20%C2%B7%20Android%20%C2%B7%20iOS%20%C2%B7%20Web-333?style=flat-square)](#지원-플랫폼)
![Version](https://img.shields.io/badge/version-0.1.0-333?style=flat-square)

</div>

---

## 다운로드

- **[배포 페이지에서 다운로드](https://ddukbaek2.com/VanillaADE/)** — Windows 포터블(설치 없이 바로 실행, 약 90 MB)

## 무엇을 할 수 있나요

프로젝트 폴더 하나로, 개발부터 배포까지 한 화면에서 처리합니다.

- **AI 에이전트 터미널** — Claude Code 세션을 터미널로 연동해 여러 에이전트가 백그라운드에서 작업을 처리
- **파이프라인 GUI** — 액션 노드를 플로우 맵에 드래그 앤 드롭으로 배치하고 상하좌우로 연결해 워크플로우 설계
- **크로스플랫폼 빌드** — Electron으로 데스크톱을, Capacitor로 모바일을 함께 겨냥
- **내장 파일 편집기** — 프로젝트 폴더 트리 탐색, 우클릭 메뉴 · 다중 선택 · 드래그 앤 드롭 · 줄 번호 편집기
- **지침 · 작업 관리** — 에이전트가 따를 지침과 요청 작업을 목록 + 편집칸으로 관리
- **다중 모니터 창 분리** — 각 메뉴를 별도 창으로 분리해 여러 모니터에 배치
- **라이트 · 다크 테마** — 모든 색을 테마 테이블로 관리, 창끼리 실시간 동기화

## 지원 플랫폼

Electron · Capacitor 기반으로 하나의 프로젝트에서 다음 플랫폼을 겨냥합니다.

| 데스크톱 | 모바일 | 웹 |
|---|---|---|
| Windows · macOS · Linux | Android · iOS | Web |

> 현재 배포는 **Windows 포터블** 빌드를 제공하며, 다른 플랫폼 빌드는 순차적으로 추가될 예정입니다.

## 개발 · 실행

```bash
# 의존성 설치
npm install

# 개발 실행
npm start

# Windows 포터블 빌드
npm run build:win
```

- **런타임**: Electron 43 · Node.js
- **렌더러**: 빌드 도구 없는 순수 바닐라 JavaScript (ES Modules)
- **터미널**: node-pty · @xterm/xterm

## 라이선스

MIT © ddukbaek2
