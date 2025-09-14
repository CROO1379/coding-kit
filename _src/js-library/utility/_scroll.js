
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
		document.querySelectorAll(selector).forEach(function(anchor) {
			anchor.addEventListener('click', function(e) {
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
