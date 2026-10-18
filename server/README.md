# AGENT PARTNERS ログサーバー（簡易ファイルDB）

静的サイトの配信と、チャットボット入力ログの保存を行う**依存ライブラリなし**の Node サーバーです。
データベースは外部DB不要で、**ローカルファイル `data/chat-logs.ndjson`**（1行=1レコードのNDJSON＝追記型の簡易DB）を使います。

## 起動
```bash
cd html/server
npm start          # = node server.js
```
起動後：
- サイト　 … http://localhost:3000/
- 管理画面 … http://localhost:3000/admin.html

> Windows PowerShell でも `npm start` または `node server.js` でOK。

## 仕組み
```
ブラウザ（chatbot.js）
   └─ POST /api/chat-log ──► server.js ──► data/chat-logs.ndjson に1行追記
管理画面（admin.html）
   └─ GET /api/chat-logs ──► server.js ──► ファイルを読み出して一覧/集計
```
- サーバー起動中：入力は**全訪問者分**がファイルに集約される。
- サーバー未起動／`file://`直接閲覧：`chatbot.js` は localStorage にフォールバック記録、`admin.html` は localStorage を表示。

## API
| メソッド | パス | 説明 | 認証 |
|---|---|---|---|
| POST | `/api/chat-log` | ログ1件を追記（JSON body） | なし |
| GET | `/api/chat-logs` | 全件取得 `{ok, data[]}` | ADMIN_TOKEN設定時のみ要 |
| DELETE | `/api/chat-logs` | 全件消去 | ADMIN_TOKEN設定時のみ要 |

レコード形式：`{ t, page, q, source, matched, id, score }`

## 環境変数
| 変数 | 既定 | 説明 |
|---|---|---|
| `PORT` | `3000` | 待受ポート |
| `ADMIN_TOKEN` | （空） | 設定すると取得/消去API に `x-admin-token` ヘッダ必須。`admin.html` 冒頭の `ADMIN_TOKEN` に同じ値を設定してください。 |

```bash
# 例: ポートとトークンを指定して起動（PowerShell）
$env:PORT=8080; $env:ADMIN_TOKEN="change-me"; node server.js
```

## セキュリティ・運用メモ
- パストラバーサル防御済み。`/server/` 配下（本コード・DBファイル）は静的配信から遮断。
- 公開運用時は、HTTPS化・`ADMIN_TOKEN` 設定・リバースプロキシ等のアクセス制限を推奨。
- 自由入力には個人情報が含まれ得ます。保管期間・取り扱いは社内ルールに従ってください。
- 大量運用やSQL検索が必要になったら、`readAll()`/`appendFileSync` をMySQL等へ差し替え可能（API契約は不変更）。

## バックアップ／初期化
- バックアップ：`data/chat-logs.ndjson` をコピーするだけ。
- 初期化：ファイルを空にする（管理画面の「ログ消去」でも可）。
