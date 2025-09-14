
// ==================================================
// MARK: モーダルビデオ
// ==================================================

// https://www.appleple.com/blog/oss/modal-video-js.html

// new ModalVideo の`M`は通常では大文字で良いが、もしバンドルするときは小文字でないとエラーが出る。
// 公式ドキュメントが間違えている可能性があるため、要調査
// CSSはSCSSファイルから読み込むこと


// 通常の実行コード
window.addEventListener('DOMContentLoaded', function () {
	new ModalVideo('.js_modal_video');
});

// 要素を検知してから実行
window.addEventListener('DOMContentLoaded', function () {
	const modalVideoElement = document.querySelector('.js_modal_video');
	if (modalVideoElement) {
			new ModalVideo('.js_modal_video');
	}
});