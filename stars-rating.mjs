const starsRatingTemplate = document.createElement("template");
starsRatingTemplate.innerHTML = `
<style>
  :host {
		display: inline-block;
		cursor: default;

		/* global vars (with defaults) to enable users to style the component */
		--rating-text-font: inherit;
		--rating-stars-font: 1.75em/.8 sans-serif;
		--rating-stars-color: black;
		--rating-btn-bg-color: #0000FF33;
		--rating-btn-color: currentcolor;
		--rating-btn-shadow: 0 0 4px var(--rating-btn-color);
		--rating-tip-color: #ffa;
		--rating-tip-width: 4em;
		--rating-tip-border: 1px solid #cc9;
		--rating-tip-shadow: 0 0 6px #999;
	
		/* local var */
		--trangle-size: 10px;
	}
  #container {
		position: relative;
		outline: none;
		font: var(--rating-text-font);
	}

  #stars-group {
		display: flex;
	}
  .star {
		flex-grow: 1;
		text-align: center;
		color: var(--rating-stars-color);
		font: var(--rating-stars-font);
		outline: none;
	}
  .star {
		text-decoration-style: dotted;
		text-decoration-thickness: 1px;
	}

  #rating-group {
    display: flex;
		justify-content: space-between;
		align-items: center;
	}
	[part="rateBtn"] {
		font: var(--rating-text-font);
		border: none;
		border-radius: 5px;
		background-color: var(--rating-btn-bg-color);
		color: var(--rating-btn-color);
		outline: none;
	}
	[part="rateBtn"]:hover:enabled, [part="rateBtn"]:focus:enabled {
		box-shadow: var(--rating-btn-shadow);
	}
	[part="rateBtn"]:disabled {
		filter: opacity(60%);
	}

	[part="tip"] {
		visibility: hidden;
		position: absolute;
		inset-inline-start: 0;
		inset-block-end: calc(100% + var(--trangle-size) / 2);
		inline-size: var(--rating-tip-width);
		border: var(--rating-tip-border);
		border-radius: 4px;
		background-color: var(--rating-tip-color);
		box-shadow: var(--rating-tip-shadow);
	}
	[part="tip-text"] {
		margin: 0;
		padding: 2px;
		padding-block-end: calc(var(--trangle-size) / 2 );
		text-align: center;
	}
	#triangle {
		position: absolute;
		border-inline-end: inherit;
		border-block-end: inherit;
		inline-size: var(--trangle-size);
		block-size: var(--trangle-size);
		background-color: inherit;
		margin-inline: auto;
		inset-inline: 0;
		inset-block-end: 0;
		transform: translate(0, 50%) rotate(45deg);
	}
</style>

<div id="container" tabindex="-1">
	<div id="stars-group" role="group" aria-label="5 stars">
		<span class="star" part="stars" aria-label="star 1" data-n="1">&#9733;</span>
		<span class="star" part="stars" aria-label="star 2" data-n="2">&#9733;</span>
		<span class="star" part="stars" aria-label="star 3" data-n="3">&#9733;</span>
		<span class="star" part="stars" aria-label="star 4" data-n="4">&#9733;</span>
		<span class="star" part="stars" aria-label="star 5" data-n="5">&#9733;</span>
	</div>
	<div id="rating-group">
		<button part="rateBtn" aria-label="rate" aria-describedby="elem-desc"></button>
		<span part="rating"></span>
		<span part="count"></span>
		<span hidden id="elem-desc">click this button to start the rating process, choose a star out of 5, finally click this button to send your rating</span>
	</div>
	<div part="tip" role="tooltip">
		<p part="tip-text"></p>
		<div id="triangle"></div>
	</div>
</div>
`;

class StarsRating extends HTMLElement {
	static ratingLabels = ["Terrible", "Poor", "Fair", "Good", "Great"];
	static ratingBtnLabels = ["Rate", "Send"];
	static KEYS = {
		ESC: 27,
		RIGHT_ARROW: 39,
		LEFT_ARROW: 37,
		TAB: 9,
		ENTER: 13,
		SPACE: 32,
	};

	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.appendChild(starsRatingTemplate.content.cloneNode(true));
		this.stars = this.shadowRoot.querySelectorAll(".star");
		this.rateBtn = this.shadowRoot.querySelector("[part='rateBtn']");
		this.tip = this.shadowRoot.querySelector("[part='tip']");
		this.hasFocus = false;

		this.draw = this.draw.bind(this);
		this.beginRating = this.beginRating.bind(this);
		this.starEnter = this.starEnter.bind(this);
		this.chooseStar = this.chooseStar.bind(this);
		this.raiseRatingEvent = this.raiseRatingEvent.bind(this);
		this.starKeyReaction = this.starKeyReaction.bind(this);
		this.rateBtnKeyReaction = this.rateBtnKeyReaction.bind(this);

		this.rateBtn.addEventListener("click", this.beginRating);
	}

	get rating() {
		return parseFloat(this.getAttribute("rating"));
	}
	set rating(val) {
		val = parseFloat(val);
		if (Number.isNaN(val) || val < Number.EPSILON) {
			this.setAttribute("rating", "");
		} else {
			this.setAttribute("rating", val);
		}
	}

	get count() {
		return parseInt(this.getAttribute("count"));
	}
	set count(val) {
		val = parseInt(val);
		if (Number.isNaN(val) || val < Number.EPSILON) {
			this.setAttribute("count", "");
		} else {
			this.setAttribute("count", val);
		}
	}

	static get observedAttributes() {
		return ["rating", "count"];
	}
	attributeChangedCallback(attr, oldVal, newVal) {
		this.draw(this.rating);
	}

	connectedCallback() {
		this.rateBtn.innerText = StarsRating.ratingBtnLabels[0];
		if (window.getComputedStyle(this).direction === "rtl")
			this.shadowRoot.querySelector("#triangle").style.transform = "translate(0, 50%) rotate(-45deg)";
		this.draw(this.rating);
	}

	// helper functions
	draw(aRating) {
		const ratingElm = this.shadowRoot.querySelector("[part='rating']");
		let ratingVal;

		if (Number.isNaN(aRating)) {
			ratingElm.textContent = "";
			ratingVal = -1;
		} else if (aRating < Number.EPSILON) {
			ratingElm.textContent = "0";
			ratingVal = 0;
		} else if (aRating > 5) {
			ratingElm.textContent = "5";
			ratingVal = 5;
		} else {
			ratingVal = Math.round(10 * aRating) / 10;
			ratingElm.textContent = ratingVal;
		}

		this.stars.forEach((star) => {
			if (star.getAttribute("data-n") > Math.round(ratingVal)) {
				star.style.opacity = "0.3";
			} else {
				star.style.opacity = "1";
			}
		});

		this.shadowRoot.querySelector("[part='count']").textContent = this.formatCount(this.count);
	}

	formatCount(count) {
		// returns a string to set the attribute
		count = parseInt(count);
		if (count <= 0 || Number.isNaN(count)) {
			return "";
		}
		let val;
		if (count <= 999) {
			return `(${count})`;
		} else if ((val = count / 1000) < 999.5) {
			return `(${Math.round(val)}k)`;
		} else if ((val = count / 1000000) < 999.5) {
			return `(${Math.round(val)}M)`;
		} else {
			return "too high num";
		}
	}

	beginRating(ev) {
		this.rateBtn.disabled = true;
		this.rateBtn.removeEventListener("click", this.beginRating);
		this.rateBtn.innerText = StarsRating.ratingBtnLabels[1];
		this.inRatingProcess = true;
		this.stars.forEach((star) => {
			star.addEventListener("mouseenter", this.starEnter);
			star.addEventListener("mouseleave", this.starLeave);
			star.addEventListener("click", this.chooseStar);
			// make stars focusable & set focus on the middle one
			star.addEventListener("focus", this.starEnter);
			star.addEventListener("keydown", this.starKeyReaction);
			star.setAttribute("tabindex", "0");
		});
		this.stars[2].focus();
	}

	starEnter(ev) {
		let starN = parseInt(ev.target.getAttribute("data-n")),
			starWidth = parseFloat(window.getComputedStyle(ev.target).inlineSize),
			tipText = StarsRating.ratingLabels[starN - 1];
		this.tip.querySelector("[part='tip-text']").innerText = tipText;

		this.tip.style.insetInlineStart = `${
			starWidth * (starN - 0.5) - parseFloat(window.getComputedStyle(this.tip).inlineSize) / 2
		}px`;
		this.tip.style.visibility = "visible";
		this.stars.forEach((star) => (star.style.textDecorationLine = "none"));
		ev.target.style.textDecorationLine = "underline";
		this.draw(starN);
	}

	chooseStar(ev) {
		ev.target.dispatchEvent(new KeyboardEvent("keydown", { keyCode: StarsRating.KEYS.ENTER }));
	}

	raiseRatingEvent(ev) {
		this.rateBtn.disabled = true;
		this.dispatchEvent(new CustomEvent("rating", { bubbles: true, composed: true, detail: this.selectedStar }));
	}

	rateBtnKeyReaction(ev) {
		if (ev.keyCode == StarsRating.KEYS.ESC && this.inRatingProcess) {
			this.inRatingProcess = false;
			this.rateBtn.disabled = false;
			this.rateBtn.innerText = StarsRating.ratingBtnLabels[0];
			this.selectedStar = null;
			this.tip.style.visibility = "hidden";
			this.stars.forEach((star) => (star.style.textDecorationLine = "none"));
			this.rateBtn.removeEventListener("click", this.raiseRatingEvent);
			this.rateBtn.addEventListener("click", this.beginRating);
			this.rateBtn.focus();
			this.draw(this.rating);
		}
	}
	starKeyReaction(ev) {
		if (!this.inRatingProcess) return;

		const starN = ev.target.getAttribute("data-n");
		if (ev.keyCode === StarsRating.KEYS.RIGHT_ARROW && starN < 5) {
			this.stars[starN].focus();
		} else if (ev.keyCode === StarsRating.KEYS.LEFT_ARROW && starN > 1) {
			this.stars[starN - 2].focus();
		} else if (ev.keyCode === StarsRating.KEYS.tab) {
			if ((ev.shiftKey && starN == 1) || (!ev.shiftKey && starN == 5)) {
				ev.target.dispatchEvent(new KeyboardEvent("keydown", { keyCode: StarsRating.KEYS.ESC }));
			}
		} else if (ev.keyCode === StarsRating.KEYS.ESC) {
			this.inRatingProcess = false;
			this.rateBtn.disabled = false;
			this.rateBtn.innerText = StarsRating.ratingBtnLabels[0];
			this.selectedStar = null;
			this.tip.style.visibility = "hidden";
			ev.target.style.textDecorationLine = "none";
			this.stars.forEach((star) => {
				star.removeEventListener("mouseenter", this.starEnter);
				star.removeEventListener("mouseleave", this.starLeave);
				star.removeEventListener("click", this.chooseStar);
				star.removeEventListener("focus", this.starEnter);
				star.removeEventListener("keydown", this.starKeyReaction);
				star.setAttribute("tabindex", "-1");
			});
			this.rateBtn.removeEventListener("click", this.raiseRatingEvent);
			this.rateBtn.addEventListener("click", this.beginRating);
			this.rateBtn.focus();
			this.draw(this.rating);
		} else if (ev.keyCode === StarsRating.KEYS.ENTER || ev.keyCode === StarsRating.KEYS.SPACE) {
			this.stars.forEach((star) => {
				this.tip.style.visibility = "hidden";
				star.removeEventListener("mouseenter", this.starEnter);
				star.removeEventListener("mouseleave", this.starLeave);
				star.removeEventListener("click", this.chooseStar);
				star.removeEventListener("focus", this.starEnter);
				star.removeEventListener("keydown", this.starKeyReaction);
				star.setAttribute("tabindex", "-1");
			});
			this.selectedStar = starN;
			this.rateBtn.addEventListener("click", this.raiseRatingEvent);
			this.rateBtn.addEventListener("keydown", this.rateBtnKeyReaction);
			this.rateBtn.disabled = false;
			this.rateBtn.focus();
			ev.preventDefault();
		}
	}
}

customElements.define("stars-rating", StarsRating);
export { StarsRating };
