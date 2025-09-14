
// ==================================================
// MARK: スクロール連動class
// ==================================================

// 一定量スクロールすることによって、対象にclassを付与するJS
// スクロールに応じてシャドウをつける、要素を表示させる、などの処理に利用


// 初期設定
// --------------------------------------------------

// 表示する要素のclassを指定（複数可能）
const targets = document.querySelectorAll(' .header , .cta ');

// 付与するclassを指定( `_is_effect` , `_is_visible` , `_is_active` など )
const activeClass = '_is_active';

// 表示/非表示のスクロールトリガー量（ピクセル）
const showTriggerScroll = 40; // 表示するスクロール量
const hideTriggerScroll = 20; // 非表示にするスクロール量

// 要素が表示されているかどうかを追跡するフラグ
let targetActive = false;


// メイン処理
// --------------------------------------------------

window.addEventListener('scroll', () => {
	const currentScrollY = window.scrollY;

	// 表示処理
	if (currentScrollY > showTriggerScroll && !targetActive) {
		targets.forEach(target => target.classList.add(activeClass));
		targetActive = true;
	// 非表示処理
	} else if (currentScrollY < hideTriggerScroll && targetActive) {
		targets.forEach(target => target.classList.remove(activeClass));
		targetActive = false;
	}

	// スクロール位置を更新
	lastScrollY = currentScrollY;
});

// ページロード時に現在のスクロール位置を確認して、対象を表示するかどうかを判断
window.addEventListener('load', () => {
	const currentScrollY = window.scrollY;
	if (currentScrollY > showTriggerScroll) {
		targets.forEach(target => target.classList.add(activeClass));
		targetActive = true;
	} else {
		targets.forEach(target => target.classList.remove(activeClass));
		targetActive = false;
	}
});

