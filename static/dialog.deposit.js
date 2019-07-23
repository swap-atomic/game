document.addEventListener("DOMContentLoaded", () => {    
	let el = document.querySelector("#header-control-deposit");
	el && el.addEventListener("click", () => {
		$("#pre_deposit_dialog").lightbox_me({
			centered: true,
		});
    });
});