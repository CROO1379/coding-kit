//
// MARK: サイト全域で利用するJavaScript
// ==================================================
//

document.addEventListener('DOMContentLoaded', function () {

	// ==================================================
	// MARK: 小サイズスクリーン対応
	// ==================================================
	// スマートフォンの特定サイズ以下を画面縮小で対応する
	// 
	!(function () {
		const viewport = document.querySelector('meta[name="viewport"]');
		function switchViewport() {
			const value =
				window.outerWidth > 360
					? 'width=device-width,initial-scale=1'
					: 'width=360';
			if (viewport.getAttribute('content') !== value) {
				viewport.setAttribute('content', value);
			}
		}
		addEventListener('resize', switchViewport, false);
		switchViewport();
	})();

}); // document.addEventListener




// スムーズスクロールとドロワーの挙動（セットで利用）
// ==================================================
// `load` を使うとスマートフォンで遷移後のアンカースクロールが効かなくなるので注意

document.addEventListener('DOMContentLoaded', function () {


	// ==================================================
	// MARK: スムーススクロール
	// ==================================================

	// ◆ 1・初期設定
	// --------------------------------------------------
	// ヘッダー要素のセレクタを変数で指定
	// 例） `.header` `#header` `header`
	const scrollHeaderElm = '.site_header';
	// 移動オフセット
	const SM_Offset = 0; // 画面幅：小
	const MD_Offset = 0; // 画面幅：中
	const LG_Offset = 0; // 画面幅：大
	// ヘッダー要素の取得
	let headerElement = scrollHeaderElm ? document.querySelector(scrollHeaderElm) : null; // 無い場合はnull
	// オフセット値の初期化
	let customOffset = LG_Offset;

	// ◆ 2・関数
	// --------------------------------------------------

	// ▼ レスポンシブの処理
	// ------------------------------
	function responsiveOffset() {
		const width = window.innerWidth;
		if (width < 400) {
			customOffset = SM_Offset;
		} else if (width < 900) {
			customOffset = MD_Offset;
		} else {
			customOffset = LG_Offset;
		}
	}

	// ▼ スクロール処理
	// ------------------------------
	function smoothScroll(selector) {
		document.querySelectorAll(selector).forEach(function (anchor) {
			anchor.addEventListener('click', function (e) {
				e.preventDefault();
				// ウィンドウサイズに応じたオフセットを再度計算
				responsiveOffset();
				// ヘッダー要素を再取得（念のために）
				headerElement = scrollHeaderElm ? document.querySelector(scrollHeaderElm) : null;
				// ヘッダーが存在しない場合、headerHeightは0に設定
				let headerHeight = headerElement ? headerElement.offsetHeight : 0;
				// クリックしたリンクのhref属性を取得し、ターゲット要素を取得
				let href = this.getAttribute("href");
				let target = document.querySelector(href === "#" || href === "" ? 'html' : href);

				if (target) {
					// ターゲットの位置をオフセットの分減算して計算
					let position = target.offsetTop - headerHeight - customOffset;
					window.scrollTo({
						top: position,
						behavior: 'smooth'
					});
				}
			});
		});
	}

	// ◆ 3・メイン処理
	// --------------------------------------------------
	// スムーズスクロールの実行
	smoothScroll('a[href^="#"]');





	// ==================================================
	// MARK: ドロワーメニューの開閉
	// ==================================================

	// ◆ 1・ドロワー 初期設定
	// --------------------------------------------------

	// ▼ 開閉動作のトリガーの指定
	// ------------------------------
	// ドロワー開閉(トグル)用のトリガーボタン
	const drawerTogglButton = document.querySelectorAll('.js_drawer_toggle');
	// ドロワー開閉ボタンの識別用class
	const stateClassTogglButton = '_is_active';
	// ドロワー内部に配置する閉じるボタン
	const drawerCloseButton = document.querySelectorAll('.js_drawer_close');

	// ▼ ドロワー本体とスクリーンの指定
	// ------------------------------
	// ドロワーのコンテナ
	const drawerContainer = document.querySelector('.drawer');
	// ドロワーの背景スクリーン
	const drawerScreen = document.querySelector('.drawer_screen');
	// ドロワーの識別用class
	const stateClassDrawer = '_is_open';

	// ▼ ルート要素の指定
	// ------------------------------
	// ドロワー利用中に識別用classを付与する対象（body or html）
	// 同時に、レイアウトシフト防止用の `padding-right` もJSから動的に付与&解除する
	const rootElm = document.querySelector('body');
	// ドロワー利用中の識別用class
	const stateClassRoot = '_use_drawer';

	// ▼ その他のレイアウトシフト防止要素（複数可）の指定
	// ------------------------------
	// fixedした要素はbodyから浮いているため、スクロールバーが消失したときにレイアウトシフトが起こる
	// 要素を指定して、レイアウトシフト防止用の `padding-right`プロパティを動的に付与&解除する
	const fixedElm = document.querySelectorAll('.js_drawer_add_fixed');

	// ▼ その他のアクティブclass付与要素（複数可）の指定
	// ------------------------------
	const activeStateElm = document.querySelectorAll('.js_drawer_add_is_active');
	const stateActiveElm = '_is_active';
	// console.log(activeStateElm):

	// ▼ ブラウザのスクロールバーの幅を取得（必須）
	// ------------------------------
	// レイアウトシフトするpx数を取得する。
	const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;


	// ◆ 2・ ドロワー 関数
	// --------------------------------------------------

	// ▼ 画面固定・解除処理
	// ----------------------------------------

	// 画面を固定
	function bodyFix() {
		// スクロール位置を取得
		const scrollPos = window.scrollY || document.documentElement.scrollTop;

		// ルート要素の処理
		// ------------------------------
		rootElm.style.width = '100vw';
		rootElm.style.height = '100vh';
		rootElm.style.paddingRight = `${scrollbarWidth}px`; // レイアウトシフト防止
		rootElm.style.overflow = 'hidden';

		// 以下、状況によって使い分け
		rootElm.style.position = 'fixed';
		rootElm.style.top = `-${scrollPos}px`;

		// その他Fixed要素に対するレイアウトシフト防止処理
		// ------------------------------
		if (fixedElm.length > 0) {
			fixedElm.forEach(element => {
				if (element) {
					element.style.paddingRight = `${scrollbarWidth}px`;
				}
			});
		}
		// ドロワー本体の処理
		// ------------------------------
		// ▼ 時間差の処理
		// setTimeout(function() {
		// }, 1000);
	}

	// 画面固定を解除
	function bodyScroll() {
		// スクロール位置を取得
		const scrollPos = -parseInt(document.body.style.top || '0', 10);
		// ルート要素の処理
		// ------------------------------
		rootElm.style.width = '';
		rootElm.style.height = '';
		rootElm.style.paddingRight = ''; // レイアウトシフト防止
		rootElm.style.overflow = '';

		// 以下、状況によって使い分け
		rootElm.style.position = '';
		window.scrollTo(0, scrollPos);
		rootElm.style.top = '';

		// その他Fixed要素に対するレイアウトシフト防止処理を解除
		// ------------------------------
		if (fixedElm.length > 0) {
			fixedElm.forEach(element => {
				if (element) {
					element.removeAttribute('style');
				}
			});
		}
		// ドロワー本体の処理
		// ------------------------------
		// ▼ 時間差の処理
		// ドロワー内部のアニメーション後に閉じる場合は時間差の処理が必要になる
		// setTimeout(function() {
		// }, 1000);
	}

	// ▼ class付与・除去処理
	// ----------------------------------------
	// class付与
	function addClass() {
		drawerContainer.classList.add(stateClassDrawer);
		drawerScreen.classList.add(stateClassDrawer);
		rootElm.classList.add(stateClassRoot);
		// 開閉トグルボタン
		if (drawerTogglButton.length > 0) {
			drawerTogglButton.forEach(target => {
				target.classList.add(stateClassTogglButton);
			});
		}
		// 追加アクティブ要素
		if (activeStateElm.length > 0) {
			activeStateElm.forEach(target => {
				target.classList.add(stateActiveElm);
			});
		}
	}
	// class除去
	function removeClass() {
		drawerContainer.classList.remove(stateClassDrawer);
		drawerScreen.classList.remove(stateClassDrawer);
		rootElm.classList.remove(stateClassRoot);

		// 開閉トグルボタン
		if (drawerTogglButton.length > 0) {
			drawerTogglButton.forEach(target => {
				target.classList.remove(stateClassTogglButton);
			});
		}
		// 追加アクティブ要素
		if (activeStateElm.length > 0) {
			activeStateElm.forEach(target => {
				target.classList.remove(stateActiveElm);
			});
		}
	}

	// ▼ デバウンス処理
	// ----------------------------------------
	// ウィンドウリサイズ時に利用
	function debounce(func, wait) {
		let timeout;
		return function (...args) {
			const later = () => {
				clearTimeout(timeout);
				func.apply(this, args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}


	// ◆ 3・ ドロワー メイン処理
	// --------------------------------------------------

	// ▼ 開閉ボタン（トグル）クリック時
	// ------------------------------
	if (drawerTogglButton.length > 0) {
		let isToggling = false; // 連打防止用フラグ
		drawerTogglButton.forEach(target => {
			target.addEventListener('click', function () {
				if (isToggling) return; // 連打を防ぐ
				isToggling = true;

				if (rootElm.classList.contains(stateClassRoot)) {
					bodyScroll(); // 画面固定解除
					removeClass(); // 各部品のclassを除去
				} else {
					bodyFix(); // 画面固定処理
					addClass(); // 各部品のclassを付与
				}

				// 開閉が完了したら再度クリック可能に
				setTimeout(function () {
					isToggling = false;
				}, 300); // 0.3秒間連打を防止
			});
		});
	}

	// ▼ 閉じるボタンクリック時
	// ------------------------------
	if (drawerCloseButton.length > 0) {
		drawerCloseButton.forEach(trigger => {
			trigger.addEventListener('click', function () {
				bodyScroll(); // 画面固定解除
				removeClass(); // 各部品のclassを除去
			});
		});
	}


	// ◆ 4・ その他挙動制御
	// --------------------------------------------------
	// ドロワー本体のクリック・タップイベントをスクリーンに伝播させない
	drawerContainer.addEventListener('click', function (event) {
		event.stopPropagation();
	});

	// 背景スクリーンクリック時
	drawerScreen.addEventListener('click', function () {
		bodyScroll(); // 画面固定解除
		removeClass(); // 各部品のclassを除去
	});

	// ドロワー内部のアンカークリック時
	const drawerLinks = drawerContainer.querySelectorAll('a[href^="#"], a[href="#"]');
	drawerLinks.forEach(link => {
		link.addEventListener('click', function () {
			bodyScroll(); // 画面固定解除
			removeClass(); // 各部品のclassを除去
		});
	});

	// リサイズ時
	function isPC() {
		const userAgent = navigator.userAgent;
		return !/Android|iPhone|iPad|iPod|Windows Phone|webOS/i.test(userAgent);
	}
	const handleResize = debounce(function () {
		if (rootElm.classList.contains(stateClassRoot) && isPC()) {
			bodyScroll(); // 画面固定解除
			removeClass(); // 各部品のclassを除去
		}
	}, 50);
	// リサイズで実行
	window.addEventListener('resize', handleResize);




}); // document.addEventListener

