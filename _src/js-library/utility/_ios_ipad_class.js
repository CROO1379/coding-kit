
// ==================================================
// MARK: IOS判定
// =======================================================

// ユーザーがiOSデバイス（iPhone、iPod、iPad）または
// タッチ機能のあるSafariブラウザを使用している場合に、<body>要素にiosというクラスを追加する

if ( navigator.userAgent.indexOf('iPhone') > 0 || 
		navigator.userAgent.indexOf('iPod') > 0 || 
		navigator.userAgent.indexOf('iPad') > 0 || 
		(navigator.userAgent.indexOf('Safari') > 0 && typeof document.ontouchstart !== 'undefined'))
	{
		document.body.classList.add('ios');
	}
