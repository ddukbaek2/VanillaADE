<div align="center">

<img src="references/icons/4_dark_filled/icon_256.png" width="112" height="112" alt="Vanilla ADE" />

# Vanilla ADE

**AI 기반 크로스플랫폼 애플리케이션 개발 환경 (ADE)**

AI 에이전트가 크로스플랫폼 앱을 구현 · 테스트 · 빌드 · 배포하는 데스크톱 개발 환경.
앱을 만드는 앱, Vanilla ADE.

[![Website](https://img.shields.io/badge/웹사이트-다운로드-e0a52c?style=flat-square)](https://ddukbaek2.com/VanillaADE/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%C2%B7%20macOS%20%C2%B7%20Linux%20%C2%B7%20Android%20%C2%B7%20iOS%20%C2%B7%20Web-333?style=flat-square)](#지원-플랫폼)
![Version](https://img.shields.io/badge/version-0.2.0-333?style=flat-square)

</div>

---

## 다운로드

- **[배포 페이지에서 다운로드](https://ddukbaek2.com/VanillaADE/)** — Windows 포터블(설치 없이 바로 실행, 약 90 MB)

## 무엇을 할 수 있나요

폴더마다 AI 에이전트를 하나씩 두고, 한 화면에서 여러 에이전트와 나란히 작업합니다.

- **에이전트 목록** — 좌측 목록에서 등록된 에이전트를 오가며 작업. 실행 중 여부를 상태 점으로 표시
- **폴더 단위 에이전트** — 에이전트를 추가할 때 작업 폴더와 종류(Claude Code)를 지정
- **영속 관리** — 에이전트 정보는 해당 폴더의 `.vanilla/agent.json` 에 저장되어, 앱을 껐다 켜도 목록이 유지되고 언제든 다시 시작
- **에이전트 대화 화면** — 선택한 에이전트의 세션을 우측 화면에서 바로 대화. 화면을 옮겨 다녀도 세션과 대화 내용이 유지
- **컨텍스트 메뉴** — 에이전트 항목을 우클릭하거나 더보기 버튼으로 시작 · 중지 · 설정 · 제거
- **라이트 · 다크 테마** — 모든 색을 테마 테이블로 관리, 터미널까지 같은 테마로 통일

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
