document.addEventListener("DOMContentLoaded", () => {
	let el = document.querySelector("#become-vip-widget");
	el && el.addEventListener("click", () => {
		$("#vip-widget-dialog").lightbox_me({
			centered: true,
		});
	});
	$('.vw-submit-btn').click(e => {
		const $input = $(".vw-email-input")
		if (!$input.val()) return

		$.ajax({
			url: "/account/registeremail?email=" + $input.val(),
			type: "GET",
			cache: false
		}).done(response => {
			if (response.result == "success") {
				$input.attr('placeholder', 'Thank you for providing your email!')
				$input.addClass('vw-success')
				$input.removeClass('vw-failed')
				$input.val('');
			} else {
				$input.attr('placeholder', 'This email could not be added.')
				$input.addClass('vw-failed')
				$input.removeClass('vw-success')
				$input.val('');
			}
		}).fail(() => {
                        $input.attr('placeholder', 'This email could not be added.')
                        $input.addClass('vw-failed')
                        $input.removeClass('vw-success')
                        $input.val('');
		});
	});
});

