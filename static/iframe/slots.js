document.addEventListener('DOMContentLoaded', init);
let resetUrl = () => "/iframe/reset?skip_redirect&account_key=" + window.account_system.account_key;

function init() {
	set_new_pull();
	$("#control_playforreal").click(handle_playforreal);
	$("#playforreal_no").click(() => $(".dialog").trigger("close"));
	$("#control_pull").click(handle_pull);
	fetch(resetUrl()).then(() => {
		window.account_system.update_balance()
	});
}

function handle_pull() {
	let bet_size = window.game_system.credit_btc_value * window.game_system.num_lines;
	let credits = account_system.get_active_btc_int_balance();
	if (bet_size > credits) {
		handle_playforreal();
	}
	wait_for_result();
}

function wait_for_result() {
	let previous_pull = window.game_system.pull_result;
	let loop = setInterval(() => {
		let pull_result = window.game_system.pull_result;
		if(previous_pull != null && pull_result != null && previous_pull.game_id == pull_result.game_id) return;
		let bet_size = window.game_system.credit_btc_value * window.game_system.num_lines;
		let credits = window.account_system.get_active_btc_int_balance();
		if (credits == bet_size && pull_result.prize == 0){
			handle_playforreal()
		};
		clearInterval(loop);
	}, 10);
}

function handle_playforreal() {
	$("#playforreal_dialog").lightbox_me({
		centered: true,
		onLoad: () => {
		},
		onClose: () => {
			if(window.game_system.num_credits <= 0) {
				fetch(resetUrl()).then(() => {
					window.account_system.update_balance()
				});
			}
		}
	});
}

function set_new_pull() {
	window.game_system.include_account_key = true;
}
