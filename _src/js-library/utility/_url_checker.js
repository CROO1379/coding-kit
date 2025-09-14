
// ==================================================
// MARK: サイトURLチェック
// ==================================================

// プロジェクトごとにsite_urlに本番サイトのURL
// pre_urlにテストサイトのURLを入力する


const site_url = '';
const pre_url = 'localhost';
const url = location.href;

if(!pre_url.includes(pre_url) || !url.includes(site_url) ){
	alert("URL異常 adminとディレクターにサイトURLの確認をしてください")
}


