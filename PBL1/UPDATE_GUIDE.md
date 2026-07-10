# PBL1 업데이트 가이드

이 문서는 GitHub Pages에 배포된 PBL1 사이트를 터미널에서 직접 업데이트할 때 사용하는 안내서입니다.

## 1. 먼저 확인할 것
- 현재 작업 폴더가 PBL1 루트인지 확인합니다.
- Git 저장소가 연결되어 있는지 확인합니다.

```powershell
cd C:\Users\vipgo\Dev\PBL1
git status
```

## 2. 수정한 내용 확인
수정한 파일이 보이면 변경사항이 반영된 상태입니다.

```powershell
git status --short
```

## 3. 변경사항 올리기
모든 변경사항을 올리려면:

```powershell
git add .
```

특정 파일만 올리려면:

```powershell
git add index.html css js pages assets
```

## 4. 커밋하기
```powershell
git commit -m "Update PBL1 site"
```

커밋 메시지는 의미 있게 적으면 됩니다.
예:
```powershell
git commit -m "Fix workshop page layout"
```

## 5. GitHub에 푸시하기
```powershell
git push origin main
```

## 6. 반영 확인하기
GitHub 저장소에 푸시가 완료되면, 브라우저에서 사이트를 새로고침합니다.

- 캐시 문제를 피하려면 Ctrl + F5
- 주소가 바뀌지 않으면 몇 분 정도 기다린 뒤 다시 확인

## 7. 반영이 안 될 때 확인할 것
다음 항목을 확인하세요.

1. GitHub 저장소의 Settings → Pages 확인
2. 배포 브랜치가 main인지 확인
3. GitHub Pages가 정상적으로 빌드/배포되었는지 확인
4. 브라우저 캐시 제거 후 다시 확인

## 8. 자주 쓰는 명령어 요약
```powershell
git status
git add .
git commit -m "Update PBL1 site"
git push origin main
```

## 9. 참고
- 만약 다른 사람이 작업한 변경사항이 있다면 먼저 가져오세요.

```powershell
git pull origin main
```

- 충돌이 발생하면 충돌 파일을 열어 수정한 뒤 다시 커밋합니다.
