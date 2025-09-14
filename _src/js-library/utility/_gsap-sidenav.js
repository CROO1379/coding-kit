
// ==================================================
// MARK: スクロール連動 ナビゲーションアクティブ化
// ==================================================

// 【Gsap依存】
// スクロールによって、ナビゲーションに特定のClassを付与する処理
// 主にアクティブ表現に利用する

// gsap.registerPlugin(ScrollTrigger);


// 初期設定
// --------------------------------------------------

// 対象となるナビゲーションの `li` 要素
let layout_side_item = document.querySelectorAll('');

// アクティブ判定に使用するclass
let active_class = '-is-active';


// メイン処理
// --------------------------------------------------

// 先頭の要素
// --------------------------------------------------
ScrollTrigger.create({
		trigger: '.site-frame', // 監視対象のセレクタ（`#product` `.mv` など）
		start: 'top 80%', // targetの上端がビューポートの80%に達した時にトリガー
		end: '+=100%',
		markers: false,
		// 順行スクロール時のアクティブ処理
		onEnter: () => {
			layout_side_item.forEach(item => item.classList.remove(active_class));
			layout_side_item[0].classList.add(active_class);
		},
		// 逆行スクロール時にアクティブ処理
		onEnterBack: () => {
			layout_side_item.forEach(item => item.classList.remove(active_class));
				layout_side_item[0].classList.add(active_class);
		},
});


// 先頭以降の要素
// --------------------------------------------------
// 2つ目以降は、以下のコードをtriggerごとに追加して設定を変更する
// `trigger` の他、 `[0]` の値も書き換えること
// 

ScrollTrigger.create({
	trigger: '#', // 監視対象のセレクタ
	start: 'top 50%',
	end: 'bottom center',
	markers: false,
	// 順行スクロール時／アクティブ処理
	onEnter: () => {
		layout_side_item.forEach(item => item.classList.remove(active_class));
		layout_side_item[1].classList.add(active_class);
	},
	// 逆行スクロール時／アクティブ処理
	onEnterBack: () => {
		layout_side_item.forEach(item => item.classList.remove(active_class));
			layout_side_item[1].classList.add(active_class);
	},
	// 大きく逆行スクロールした時／非アクティブ処理と、前アイテムへのアクティブ付与の同時処理
	onLeaveBack: () => {
		layout_side_item.forEach(item => item.classList.remove(active_class));
			layout_side_item[1].classList.remove(active_class);
			layout_side_item[0].classList.add(active_class);
			// console.log('onleaveback');
	},
});

window.addEventListener('load', function() {
	ScrollTrigger.refresh();
});

