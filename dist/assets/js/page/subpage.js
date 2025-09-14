//
// MARK: 下層用（サンプル）
// ==================================================
//


// `details` を利用したアコーディオン
// ==================================================
// detailsタグを起点にアニメーション開閉する

// クリックした瞬間に `details` に付与されるclass
// 初期状態で `open` 属性が指定されているものにも付与される
const active_class = '_is_active';

/**
* @typedef {Object} AccordionOptions
* @property {number} [duration]
* @property {string} [easing]
* @property {boolean} [printAll]
*/

/** @type {AccordionOptions} */
const defaultOptions = {
	duration: 200,
	easing: "ease-out",
	// linear , ease-in , ease-out , ease-in-out , cubic-bezier()
	printAll: false
};

/**
* @param {HTMLDetailsElement} details
* @param {AccordionOptions} [options]
*/
const initializeDetailsAccordion = (details, options = {}) => {
	if (!details) {
		console.error("initializeDetailsAccordion: Details element is not found.");
		return;
	}

	const summary = details.querySelector("summary");
	const panel = details.querySelector("summary + *");

	if (!summary || !panel) {
		console.error(
			"initializeDetailsAccordion: Elements required for initializeDetailsAccordion are not found."
		);
		return;
	}

	const mergedOptions = Object.assign({}, defaultOptions, options);
	const detailsName = details.getAttribute("name") || null;

	// 初期状態で details が開いている場合に active_class を付与
	if (details.hasAttribute('open')) {
		details.classList.add(active_class);
	}

	summary.addEventListener(
		"click",
		(event) => handleClick(event, details, panel, mergedOptions, detailsName),
		false
	);

	if (mergedOptions.printAll) {
		window.addEventListener("beforeprint", () =>
			handleBeforePrint(details, detailsName)
		);
		window.addEventListener("afterprint", () =>
			handleAfterPrint(details, detailsName)
		);
	}
};

let isAnimating = false;

/**
* @param {HTMLDetailsElement} details
* @param {HTMLElement} panel
* @param {AccordionOptions} options
* @param {string | null} detailsName
* @param {boolean} show
*/
const toggleAccordion = (details, panel, options, detailsName, show) => {
	if (details.open === show) return;

	isAnimating = true;
	if (detailsName) details.removeAttribute("name");
	if (show) details.open = true;
	panel.style.overflow = "clip";

	const { blockSize } = window.getComputedStyle(panel);
	const keyframes = show
		? [{ maxBlockSize: "0" }, { maxBlockSize: blockSize }]
		: [{ maxBlockSize: blockSize }, { maxBlockSize: "0" }];

	const isPrefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const animationOptions = {
		duration: isPrefersReduced ? 0 : Math.max(0, options.duration || 0),
		easing: options.easing
	};

	const onAnimationEnd = () => {
		requestAnimationFrame(() => {
			panel.style.overflow = "";
			if (!show) details.open = false;
			if (detailsName) details.setAttribute("name", detailsName);
			isAnimating = false;
		});
	};

	requestAnimationFrame(() => {
		const animation = panel.animate(keyframes, animationOptions);

		animation.addEventListener("finish", onAnimationEnd);
	});
};

/**
* @param {HTMLDetailsElement} details
* @param {AccordionOptions} options
* @param {string | null} detailsName
*/
const hideOtherAccordions = (details, options, detailsName) => {
	if (!detailsName) return;

	const otherDetails = document.querySelector(
		`details[name="${detailsName}"][open]`
	);
	if (!otherDetails || otherDetails === details) return;

	const otherPanel = otherDetails.querySelector("summary + *");
	if (!otherPanel) return;

	// 他の details から _is_active クラスを削除
	otherDetails.classList.remove(active_class);
	toggleAccordion(otherDetails, otherPanel, options, detailsName, false);
};

/**
* @param {MouseEvent} event
* @param {HTMLDetailsElement} details
* @param {HTMLElement} panel
* @param {AccordionOptions} options
* @param {string | null} detailsName
*/
const handleClick = (event, details, panel, options, detailsName) => {
	event.preventDefault();

	if (isAnimating) return;

	toggleAccordion(details, panel, options, detailsName, !details.open);

	// details 要素に active_class クラスをトグル
	details.classList.toggle(active_class);

	if (details.open) hideOtherAccordions(details, options, detailsName);
};

const openStatusAttribute = "data-open-status";

/**
* @param {HTMLDetailsElement} details
* @param {string | null} detailsName
*/
const handleBeforePrint = (details, detailsName) => {
	if (!details) return;
	details.setAttribute(openStatusAttribute, String(details.open));
	if (detailsName) details.removeAttribute("name");
	details.open = true;
};

/**
* @param {HTMLDetailsElement} details
* @param {string | null} detailsName
*/
const handleAfterPrint = (details, detailsName) => {
	if (!details) return;
	if (detailsName) details.setAttribute("name", detailsName);
	details.open = details.getAttribute(openStatusAttribute) === "true";
	details.removeAttribute(openStatusAttribute);
};

// 実行処理
// --------------------------------------------------
// createDocumentFragment を利用したインジェクションを利用するときは動かなくなるため、
// `document.addEventListener` を解除する。
// もしくは、 `setTimeout(() => {}, 500);` を使って保険として遅延させる

document.addEventListener('DOMContentLoaded', function() {
	
	const accordions = document.querySelectorAll("details");

	if (accordions.length === 0) return;

	accordions.forEach((accordion) => {
		initializeDetailsAccordion(accordion, {
			printAll: true
		});
	});

});