import { StarsRating } from "./stars-rating.mjs";

document.body.querySelector("p > stars-rating").addEventListener("rating", (e) => {
	console.log(e.detail);
});

const star2 = document.createElement("stars-rating");
star2.addEventListener("rating", (ev) => console.log(ev.detail));
star2.id = "star2";
star2.rating = 2.61754;
star2.count = 12853;
document.body.appendChild(star2);
