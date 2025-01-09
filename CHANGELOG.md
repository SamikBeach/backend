# 🚦 CHANGELOG

# [1.11.0](https://github.com/SamikBeach/backend/compare/1.10.0...1.11.0) (2025-01-09)


### Bug Fixes

* AuthResponse에 user 정보 포함 ([df95bb1](https://github.com/SamikBeach/backend/commit/df95bb180e31e9c0392c3bc7432896eaf32de6ea))
* bornDateIsBc, diedDateIsBc를 nullable하게 수정 ([b9ba04e](https://github.com/SamikBeach/backend/commit/b9ba04eeb6e51eb09db150959284b510ce8ea401))


### Features

* 좋아요, 댓글, 코멘트 업데이트시 카운트 연동해서 올라가도록 ([7430e61](https://github.com/SamikBeach/backend/commit/7430e61d179d597156165449f711fb159abde70b))

# [1.10.0](https://github.com/SamikBeach/backend/compare/1.9.0...1.10.0) (2025-01-08)


### Bug Fixes

* password select 옵션 수정 ([10b86a6](https://github.com/SamikBeach/backend/commit/10b86a61006c1bf5fe63d5ef1f000489d876ae42))
* 구글 로그인시 항상 유저 새로 생성되는 버그 픽스 ([c3c98bf](https://github.com/SamikBeach/backend/commit/c3c98bf83529a3bdc015eb2daddab574238007e8))
* 이메일 로그인 이슈 해소 ([46cf95b](https://github.com/SamikBeach/backend/commit/46cf95b03b41e974c01d97d5bcd790f6fb51a819))


### Features

* google login 서비스 로직 개선 ([199b123](https://github.com/SamikBeach/backend/commit/199b123271886d9161501bbd77049b832eaf6e96))
* password nullable 처리 ([22fe2d2](https://github.com/SamikBeach/backend/commit/22fe2d28ea5f8fed09ccb3f8de6b68145d0a123e))

# [1.9.0](https://github.com/SamikBeach/backend/compare/1.8.0...1.9.0) (2025-01-08)


### Bug Fixes

* entity 업데이트 ([88d90c6](https://github.com/SamikBeach/backend/commit/88d90c6f862202a94b63135941d0e98b3340565c))
* 불필요한 코드 제거 ([6f8e90c](https://github.com/SamikBeach/backend/commit/6f8e90c480cf9cde6e52eb3786f6bdfbbabc7b78))
* 외부 노출 필드 제한 방식 변경 ([1d5834b](https://github.com/SamikBeach/backend/commit/1d5834b9721ca57876f2f7ffd04ab9fc267bc590))


### Features

* author controller, service 로직 개선 ([e1c0108](https://github.com/SamikBeach/backend/commit/e1c0108a3d6edb9041d5d36ae94267c05f5f29b3))
* book controller, service 로직 개선 ([2a1d8e9](https://github.com/SamikBeach/backend/commit/2a1d8e940dcfa865248b0fba14bcdbf4cc6a7d10))
* book endpoint 및 서비스 로직 초안 ([2ecd90e](https://github.com/SamikBeach/backend/commit/2ecd90ec2959bde7642ca56e62df6f23ed1bb459))
* review module 개선 ([a7e8082](https://github.com/SamikBeach/backend/commit/a7e80824228b4720123f7e6739c4eebb51be448f))
* review module 초안 ([8aaaf38](https://github.com/SamikBeach/backend/commit/8aaaf38f2cae2a1d82e6ef7b9526fae55ced56b4))
* 외부 노출 필드 제한 ([6e0c68e](https://github.com/SamikBeach/backend/commit/6e0c68ef6662e876685047ac99f3526377d0c913))

# [1.8.0](https://github.com/SamikBeach/backend/compare/1.7.0...1.8.0) (2025-01-07)


### Features

* Auth Module 초안 구현 ([506a231](https://github.com/SamikBeach/backend/commit/506a2319e3ffb3f69df6bf5c5e1c802b2e9c66f2))
* Auth module에 토큰 갱신 엔드포인트 추가 ([f4a6132](https://github.com/SamikBeach/backend/commit/f4a6132b19d31ed70fd87e606e8973a01b1494e3))
* user module 초안 ([ba773d9](https://github.com/SamikBeach/backend/commit/ba773d99b03a9abb87feb0a8f5251907122b0463))
* User search 서비스 로직 추가 ([fef1a19](https://github.com/SamikBeach/backend/commit/fef1a19bd7ca0554441e48ed97fc9e606e464957))
* 로그아웃 서비스 로직 구현 ([8b5025f](https://github.com/SamikBeach/backend/commit/8b5025f5c37623c3c60c144cf454dbb3dd754ddb))
* 유저 삭제 서비스 로직 개선 ([2404a9a](https://github.com/SamikBeach/backend/commit/2404a9a9826e66834d96908bdd667197bf2f8a97))
* 유저 정보 업데이트 서비스 로직 개선 ([06f6c1e](https://github.com/SamikBeach/backend/commit/06f6c1e6acd5e53e80dd50a06272a8c5af1ad0c2))
* 유저 좋아요, 리뷰 정보 가져오는 로직 추가 ([a1be960](https://github.com/SamikBeach/backend/commit/a1be960026fbe67864cef6f1b3da08ff451fcf1d))
* 이메일 로그인, 구글 로그인 구현 ([dadc15a](https://github.com/SamikBeach/backend/commit/dadc15a6b53dd690729826a185f736bce253a90f))
* 이메일 인증 서비스 로직 개선 ([c6bc798](https://github.com/SamikBeach/backend/commit/c6bc798ea1a4bccf92c8171410d20e79f41a18e8))
* 회원가입 서비스 로직 개선 ([80e64c5](https://github.com/SamikBeach/backend/commit/80e64c52dd79731e9e4fd2eb95ac49694294498a))
* 회원탈퇴 서비스 로직 개선 ([61365a2](https://github.com/SamikBeach/backend/commit/61365a24545aadb0819ae685a4e5b171cf67aa42))

# [1.7.0](https://github.com/SamikBeach/backend/compare/1.6.0...1.7.0) (2025-01-07)


### Bug Fixes

* .gitignore & 포트 번호 수정 ([d5df7d3](https://github.com/SamikBeach/backend/commit/d5df7d3de29f8cdb701e681c717168f41538f3f3))


### Features

* tsconfig.json 수정(path alias 추가) ([150a88e](https://github.com/SamikBeach/backend/commit/150a88e5a33f40fe55dc2e80509f03079cc9a8c2))
* Typeorm 모듈 연결 ([ad2dc8f](https://github.com/SamikBeach/backend/commit/ad2dc8fce1654b27bbc2f8411da4f8ef4c1f597c))
* typeorm-model-generator로 entities 추가 ([8c6d46a](https://github.com/SamikBeach/backend/commit/8c6d46a6055bc42c624b1bb35dbd69c1c8f994f7))

# [1.6.0](https://github.com/SamikBeach/backend/compare/1.5.0...1.6.0) (2024-12-31)


### Features

* global ValidationPipe 적용 ([4dcec0d](https://github.com/SamikBeach/backend/commit/4dcec0df8cde371d36ede83f5444502b4a53bd1e))

# [1.5.0](https://github.com/SamikBeach/backend/compare/1.4.0...1.5.0) (2024-12-30)


### Features

* logger 옵션 추가 ([93daf6d](https://github.com/SamikBeach/backend/commit/93daf6ddd333e51a4bd51a6db752d62a5ec9565c))

# [1.4.0](https://github.com/SamikBeach/backend/compare/1.3.0...1.4.0) (2024-12-29)


### Features

* cors origin 설정 ([00afec7](https://github.com/SamikBeach/backend/commit/00afec7be958c710eec94d3d0e37293ce7791e2d))

# [1.3.0](https://github.com/SamikBeach/backend/compare/1.2.0...1.3.0) (2024-12-28)


### Features

* cookie-parser package 설치 & 적용 ([81ca950](https://github.com/SamikBeach/backend/commit/81ca950d62064953fad397b0b9d73fe11cb65e7f))

# [1.2.0](https://github.com/SamikBeach/backend/compare/1.1.0...1.2.0) (2024-12-27)


### Bug Fixes

* API version prefix 수정(v1 -> v2) ([01505f5](https://github.com/SamikBeach/backend/commit/01505f5ed805e2e2d07232972f941a892edacc48))


### Features

* ConfigModule 패키지 & 환경변수 설정 추가 ([cb156f0](https://github.com/SamikBeach/backend/commit/cb156f05029fdd231a4caba26651ff64aca7badd))

# [1.1.0](https://github.com/SamikBeach/backend/compare/1.0.0...1.1.0) (2024-12-26)


### Bug Fixes

* dev server start script 수정 ([5dbee67](https://github.com/SamikBeach/backend/commit/5dbee67d0a6a1d2d917a0d88fefbafdabba7f122))


### Features

* add @nestjs/swagger module ([4dc78f7](https://github.com/SamikBeach/backend/commit/4dc78f774402542f7ca8bfb69a258f00e525f195))
* global prefix, version 추가 ([3f56578](https://github.com/SamikBeach/backend/commit/3f565785c895775c2f4b96e811b7daa500e80be2))
* 스웨거 모듈 셋업 ([d548d36](https://github.com/SamikBeach/backend/commit/d548d36464fc6ff63f34eab0b0ce4d54bc5868af))

# 1.0.0 (2024-12-05)


### Bug Fixes

* release.yml에 Enable Corepack step 추가 ([1decf3c](https://github.com/SamikBeach/backend/commit/1decf3c2ce399c9bfa5f533dcc56b765ec156a83))
