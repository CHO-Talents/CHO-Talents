# 상품 이미지 이전 및 Slack 알림 복구

## 외부 상품 이미지 이전

`scripts/migrate-external-product-images.mjs`는 운영 프로젝트의 상품 썸네일과 상세 이미지 중 허용된 외부 도메인의 이미지를 `Talents_Items` 버킷으로 복사하고 상품 URL을 갱신한다. 기존 URL이 동시에 수정된 경우에는 덮어쓰지 않는다. HTTPS, 도메인 허용 목록, 리다이렉트 차단, 10MB 제한 및 이미지 파일 서명 확인을 적용한다. 파일 서명 검사는 이미지 전체의 디코딩 가능성을 보장하지 않는다.

```powershell
node scripts/migrate-external-product-images.mjs --check
node scripts/migrate-external-product-images.mjs --apply
```

`--check`는 DB와 저장소를 변경하지 않는다. 로컬 서버 키가 없으면 공개 권한으로 보이는 상품만 집계한다. `--apply`는 저장소 업로드와 상품 데이터 수정을 수행하며 저장소 루트의 Git 제외 `.env.local` 또는 실행 환경에 운영 프로젝트의 `SUPABASE_SECRET_KEY`나 `SUPABASE_SERVICE_ROLE_KEY`가 필요하다. `SUPABASE_URL`이 설정된 경우 운영 프로젝트 URL과 일치해야 한다. 키를 채팅이나 Git에 넣지 않는다.

다운로드 또는 업로드가 실패하면 원래 URL은 유지된다. 업로드 후 상품 갱신이 실패하거나 결과가 불명확하면 해당 파일을 자동 삭제하지 않고 경로를 출력한다. 운영자가 상품 URL 참조 여부를 확인한 후 정리해야 한다. 허용 목록 밖의 URL은 자동 이전하지 않으며, 목록 변경 전에 출처와 이미지 사용 권한을 확인한다. 파일을 사용할 수 없는 상품은 상품 관리 화면에서 새 이미지 파일을 올려 교체한다.

## Slack 재시도

`slack-notify` Edge Function은 Slack이 명시적으로 HTTP 429와 유효한 `Retry-After`를 반환하고 지연이 10초 이하인 경우에만 최대 두 번 재전송한다. 요청이 전달됐는지 불명확한 네트워크 오류나 5xx는 중복 알림 가능성 때문에 자동 재전송하지 않는다. 알림 전송 실패 로그와 Slack 채널을 대조해 처리한다. 이 방식은 전달 보장이나 중복 없는 재전송을 보장하지 않는다.

운영에 적용하려면 `slack-notify` Edge Function을 `supabase/functions/slack-notify`와 `_shared` 코드를 포함해 배포해야 한다. 배포 후 실패 로그와 수신 결과를 확인한다. 테스트는 실제 Slack으로 메시지를 보내지 않고 아래 명령으로 실행한다.

```powershell
node scripts/test-image-migration-slack-retry.mjs
```
