var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

var GameSystem = Class.extend({
    init: function (gamename, starting_server_seed_hash, credit_btc_value_in, casino_game_links) {
        // Constants
        this.CARD_DELAY = 100;
        this.BLINK_DELAY = 500;
        this.WIN_SOUND_DELAY = 150;
        this.STANDARD_CARDS = ['2h', '3h', '4h', '5h', '6h', '7h', '8h', '9h', 'th', 'jh', 'qh', 'kh', 'ah',
                              '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', 'ts', 'js', 'qs', 'ks', 'as',
                              '2c', '3c', '4c', '5c', '6c', '7c', '8c', '9c', 'tc', 'jc', 'qc', 'kc', 'ac',
                              '2d', '3d', '4d', '5d', '6d', '7d', '8d', '9d', 'td', 'jd', 'qd', 'kd', 'ad'];

        this.game_id = null;
        this.game_unique_id = null;
        this.game_name = gamename;

        this.prize = 0;
        this.btc_prize = 0;
        this.btc_bet = 0;
        this.original_prize = 0;
        this.progressive_win = 0;

        // Idle user checking!
        this.user_is_active = true;
        this.report_user_action();

        this.set_next_server_seed_hash(starting_server_seed_hash);
        this.deal_hash = null;
        this.client_seed = null;
        // If the user types in his own client seed, then just stick with that forever, instead of overwriting it with a new random seed.
        this.client_seed_is_modified = false;

        this.num_credits = -1;
        this.default_num_credit_decimals = 0;
        this.credit_btc_value = credit_btc_value_in;

        this.games_played = 0;

        this.blink_on = false;
        this.show_half_credits = false;

        this.WIN_TEXT_WIN = 0;
        this.WIN_TEXT_DOUBLE = 1;
        this.WIN_TEXT_TRIPLE = 2;

        this.include_account_key = window.location.href.match(/iframe/);

        this.update_credits();
        this.draw_win_amount(0, this.WIN_TEXT_WIN);

        //  - Something like this really could just be hard coded in the html?
        //  - I don't think this is used anymore?
        if (casino_game_links != null) {
            for (var i = 0; i < casino_game_links.length; i++) {
                $("#casino_game" + i).attr("href", ('' + window.location).replace('/' + this.game_name, '/' + casino_game_links[i]));
            }
        }

        var that = this;
        $(document).keydown(function (ev) {
            that.report_user_action();
        });
        $(document).click(function (ev) {
            that.report_user_action();
        });
        $("#next_client_seed").keydown(function (ev) {
            that.client_seed_is_modified = true;
        });

        if (!window.location.href.match(/[?|&]deposit/)) {
			this.check_first_visit();
        }
        this.check_marketing_messages();

        setTimeout(this.resizeHandler.bind(this), 2000);
		let mobile = isMobile.any();
		if(mobile) {
			if(mobile[0] == "iPhone") {
                window.addEventListener('orientationchange', setTimeout.bind(window, this.resizeHandler.bind(this), 1000));
			}else {
				window.screen.orientation.onchange = this.rotateHandler.bind(this);
			}
        }else {
            window.addEventListener('resize', this.resizeHandler.bind(this));
        }

    },

    check_client_seed: function () {
        var client_seed = $("#next_client_seed").val();
        if( !client_seed.match( /^[0-9a-z]+$/ ) ) {
            alert("Client seed is not valid. Please only use numbers and letters.");
            return false;
        }
        return true;
    },

    check_for_active_user: function () {
        var now = (new Date()).getTime();
        // One hour
        var NO_ACTION_TIME_TO_STOP_UPDATES = 1000 * 60 * 60;

        if (autoplay_system != null && autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED) {
            this.report_user_action();
        }

        var delta = now - this.last_user_action_time;
        if( account_system != null && account_system.player_ident.indexOf("(A)") == 0 ) {
            // Admins don't become inactive.
            delta = 0;
        }
        if (delta > NO_ACTION_TIME_TO_STOP_UPDATES) {
            if (this.user_is_active) {
                $("#inactive_dialog").lightbox_me({
                    centered: true
                });
            }
            this.user_is_active = false;
        }
        else {
            this.user_is_active = true;
        }
    },

    report_user_action: function () {
        var now = (new Date()).getTime();
        this.user_is_active = true;
        this.last_user_action_time = now;
    },


    set_next_server_seed_hash: function (sssh) {
        this.next_server_seed_hash = sssh;
        if (this.next_server_seed_hash == null) {
            $("#next_server_hash_row").hide();
        } else {
            $("#next_server_hash_row").show();
            $("#next_server_hash").html(sssh);
        }

        if (!this.client_seed_is_modified) {
            // Don't reset the client seed if the user has typed in his own.
            this.client_seed = get_client_seed();
            $("#next_client_seed").val(this.client_seed);
        }
        $("#next_client_seed").prop('disabled', false);

    },

    draw_credit_digits: function (num_decimals, value) {
        var c = "" + value;
        $("#credit_digits").empty();
        var i = c.indexOf('.');
        // should just show '0' if you have 0 credits
        if (i > 0) {
            var count = c.length - i - 1;
            if (count > num_decimals) {
                while (c[i + num_decimals] == '0') num_decimals--;
                if (c[i + num_decimals] == '.') {
                    c = c.slice(0, i);
                } else {
                    c = c.slice(0, i + num_decimals + 1);
                }
            }
        }

        for (i = 0; i < c.length; i++) {
            var name = c[i];
            if (name == ".") {
                name = "period";
            }
            $("#credit_digits").append("<div class='credit_digit credit_digit_" + name + "'></div>");
        }
    },

    update_credits: function (num_decimals) {
        //  - Initial state of game is -1 credits, until we get a response from the server.
        // So just don't draw anything until then.
        if (this.num_credits < 0) {
            return;
        }

        num_decimals = num_decimals || this.default_num_credit_decimals;
        this.draw_credit_digits(num_decimals, this.num_credits);

        //  - Shift the centered bet text to the left if the credits text is too long
        var credits_width = $("#credits_holder").width();
        //var bet_width = $("#bet_text").width();
        bet_width = 45;
        var remaining_space = 320 - credits_width - bet_width;
        if (remaining_space > 0) {
            remaining_space = 0;
        }
        $("#bet_text").css("left", "" + remaining_space + "px");

    },

    get_rounded_credits: function (accurate_credits) {
        var actual_credits = Math.floor(accurate_credits);

        if (this.show_half_credits) {
            if (accurate_credits - actual_credits >= 0.5) {
                actual_credits += 0.5;
            }
        }
        else if (this.default_num_credit_decimals == 1) {
            actual_credits = Math.floor(accurate_credits * 10) / 10;
        }
        return actual_credits;
    },

    maybe_create_firework: function () {
        var now = (new Date()).getTime() / 1000.0;
        var gap = now - this.last_firework_time;

        if (gap < 0.5) gap = 0;
        if (gap > 5) gap = 5;

        var chance = gap / 5.0;
        if (Math.random() > gap) return;

        switch (Math.floor(Math.random() * 5)) {
            case 0: //standard circle
                createFirework(11, 30, 3, 4, null, null, null, null, false, false);
                break;
            case 1: //concentric circles
                createFirework(25, 187, 5, 1, null, null, null, null, false, false);
                break;
            case 3: //3 ring circle
                createFirework(19, 178, 3, 1, null, null, null, null, false, false);
                break;
            case 4: //neat two ring staggered explosion
                createFirework(34, 53, 2, 6, null, null, null, null, true, false);
        }
        this.last_firework_time = now;
    },


    calculate_credits: function () {
        actual_credits = this.get_rounded_credits(account_system.get_active_btc_int_balance() / this.credit_btc_value);

        if (actual_credits != this.num_credits) {
            this.num_credits = actual_credits;

            this.update_credits();
        }
    },

    show_server_lied_dialog: function (error, double_down_game, game_id) {
        var html = "<p><i>game_id</i> <b>" + game_id + "</b><br>";

        if (double_down_game != null) {
            html = html + "<i>double_down_level</i> <b>" + double_down_game.level + "</b><br>";
        }

        if (error == 'prize') {
            html = html + "<i>error</i> The prize reported by the server doesn't match what the client thinks it should be.";
        } else if (error == 'prizes') {
            html = html + "<i>error</i> Not all prizes were reported correctly by the server.";
        } else if (error == 'hand_eval') {
            html = html + "<i>error</i> The evaluation of the hand doesn't match what the server said.";
        } else if (error == 'hold') {
            html = html + "<i>error</i> The cards returned from hold are different than expected.";
        } else if (error == 'game_eval') {
            html = html + "<i>error</i> The server evaluated the game differently than expected.";
        } else if (error == 'deal') {
            html = html + "<i>error</i> The cards returned from deal are different than expected.";
        } else if (error == 'actions') {
            html = html + "<i>error</i> The server reported actions that are different than what actually occurred.";
        } else if (error == 'game_hash') {
            html = html + "<i>error</i> The game hash string doesn't match the game string.";
        } else if (error == 'deck') {
            html = html + "<i>error</i> The deck used in the hash string doesn't match clients generated deck.";
        } else if (error == 'ball') {
            html = html + "<i>error</i> The ball landed in a number different than what the server reported.";
        } else if (error == 'dice') {
            html = html + "<i>error</i> The dice rolled in a manner different than what the server reported.";
        } else if (error == 'server_seed') {
            html = html + "<i>error</i> The hash of the server's seed didn't match the pre-announced hash.";
        } else if (error == 'client_seed') {
            html = html + "<i>error</i> The server didn't use our client seed in generating the game seed.";
        } else if (error == 'progressive') {
            html = html + "<i>error</i> The server said we didn't win any progressive prize, but we should have.";
        } else if (error == 'blessed') {
            html = html + "<i>error</i> The server reported an incorrect set of numbers.";
        } else if (error == 'reels') {
            html = html + "<i>error</i> The server reported an incorrect set of reel positions.";
        } else if (error == 'scatters') {
            html = html + "<i>error</i> The server reported an incorrect number of scatters.";
        } else if (error == 'lucky_number') {
            html = html + "<i>error</i> The server reported an incorrect throw of the dice.";
        }

        html = html + "</p>";
        $("#server_lied_content").html(html);

        $("#server_lied_dialog").lightbox_me({
            centered: true
        });
    },

    draw_win_amount: function (num, win_text, num_decimals) {
        num_decimals = num_decimals || 3;

        if (num == 0) {
            $("#win_holder").css('visibility', 'hidden')
            return;
        }

        $("#win_holder").css('visibility', 'visible')
        $("#win_digits").empty();

        var c = "" + num;

        var i = c.indexOf('.');
        //probably show weird numbers if you win <1 credits
        if (i > 0) {
            var count = c.length - i - 1;
            if (count > num_decimals) {
                while (c[i + num_decimals] == '0') num_decimals--;
                if (c[i + num_decimals] == '.') {
                    c = c.slice(0, i);
                } else {
                    c = c.slice(0, i + num_decimals + 1);
                }
            }
        }

        for (i = 0; i < c.length; i++) {
            var name = c[i];
            if (name == ".") {
                name = "period";
            }
            $("#win_digits").append("<div class='credit_digit credit_digit_" + name + "'></div>");
        }

        $("#win").removeClass("double");
        $("#win").removeClass("triple");
        switch (win_text) {
            case this.WIN_TEXT_WIN:
                break;
            case this.WIN_TEXT_DOUBLE:
                $("#win").addClass("double");
                break;
            case this.WIN_TEXT_TRIPLE:
                $("#win").addClass("triple");
                break;
            default:
                console.log("ERROR: Bad win_text passed to draw_win_amount()");
                break;
        }

    },

    show_expected_return_dialog: function () {
        $('.dialog').trigger('close');
        $('#expected_return_dialog').lightbox_me({
            centered: true
        });
    },

    get_cookie: function(name) {
        name = name + '=';
        var ca = document.cookie.split(';');
        for( var i = 0; i < ca.length; i++) { 
            var c = ca[i].trim();
            if( c.indexOf(name) == 0 ) {
                return c.substring(name.length, c.length);
            }
        }
        return undefined;
    },

    __prepareDialogBox: function ($dialog, handler) {
        handler = handler || function () { };

        if (isMobile.any()) {
            $dialog.css('width', (window.innerWidth - 100) + 'px');
            let container = addLightBox(dialog);
            $.merge([ $(container) ], $dialog.children('.close_button, .confirm_button')).click(() => {
                container.remove();
                handler();
            });
        } else {
            $dialog.lightbox_me({
                centered: true,
                onClose: () => handler()
            });
        }
    },

    check_marketing_messages: function () {
		let that = this;
        $.ajax({
            url: '/account/marketing_messages' + that.use_account_key(true),
            success: function (result) {
                if (result.length > 0) {
                    const prepareMarketingDialog = index => {
                        if (index < result.length) {
                            const message = result[index];

                            const $dialog = $('<div>', { class: 'dialog dialog-one-time' })
                                .append($('<div>', { class: 'close close_button' })
                                    .append($('<span>', { class: 'icon-circle-cross' })));

                            if (message.title) {
                                $dialog.append($('<div>', { class: 'modal-header' })
                                    .append($('<div>', { class: 'title' })
                                        .append($('<h2>').text(message.title)))
                                    .append($('<div>', { style: 'clear:both;' })));
                            }
                            if (message.body) {
                                $dialog.append($('<div>', { style: 'text-align:center;' }).append($('<p>').html(message.body)));
                            }

                            that.__prepareDialogBox($dialog, () => prepareMarketingDialog(index + 1));
                        } else {
                            $.ajax({
                                url: '/account/marketing_messages_done' + that.use_account_key(true)
                            });
                        }
                    };

                    prepareMarketingDialog(0);
                }
            }
        });
    },

    check_first_visit: function() {
        let that = this;
        var c = parseInt(this.get_cookie('first_visit'));

        if( c == 1 ) {
            that.__prepareDialogBox($('#first_visit_dialog'), () => {
                $.ajax({
                    url: "/account/first_visit_complete"
                }).done(() => {
                    document.cookie = "first_visit=deleted; expires=" + new Date(0).toUTCString() + "; Path=/";
                });
            });
            // New accounts shouldn't show this message once they visit a new page
            //  - It's been long enough to not need to show this anymore
            // document.cookie = "address_reset=1; Path=/";
        }
        else {
            //  - It's been long enough to not need to show this anymore
            // if( this.get_cookie("address_reset") != "1" ) {
            //    alert("All account deposit addresses were recently reset. Please be sure to check the deposit address located on the bottom of your screen before sending coins.\n\nThank you, and good luck!");
            //    document.cookie = "address_reset=1; Path=/";
            // }
        }

    },

    display_jackpot: function(jackpot_total, credit_progressive_jackpot) {
        var total_jackpot = jackpot_total.toFixed(2);
        if(isNaN(total_jackpot) === false) {
            $("#jackpot-value").html('' + jackpot_total.toFixed(2) + ' BTC <span id="jackpot-credits">' + credit_progressive_jackpot + ' Credits</span>');
            $('.jackpot').show();
        }
    },

 	use_account_key: function(use_question = false) {
		return (this.include_account_key ? ( use_question ? "?" : "&") + "skip_redirect&account_key=" + window.account_system.account_key : "");
	},

 	resizeHandler: function() { return;
        let el = document.querySelector("#overlay_container");
        if(!el) return;
        let header = document.querySelector("header");
        let footer = document.querySelector("footer");
        let gamearea = document.querySelector("#gamearea");
        el.removeAttribute('style');
        if(isMobile.any()) {
            const viewportmeta = document.querySelector('meta[name=viewport]');
            viewportmeta.setAttribute('content', "width=device-width");
            window.scrollTo(0, window.scrollY);
            let fCont = document.querySelector("#footer_container");
            if(fCont) fCont.remove();
        }
        setTimeout(this.resizeHandlerHelper.bind(this, el, header, footer, gamearea));
    },

    resizeHandlerHelper: function(el, header, footer, gamearea) {
        let w = el.clientWidth;
        let h = el.clientHeight;
        let elOffsetTop = Number($("#main_centering_div").css('padding-top').slice(0,-2));
        let headerH = header ? header.clientHeight : 0;
        let footerH = footer ? footer.clientHeight : 0;
        let wOffset = window.innerWidth - w;
        let hOffset = window.innerHeight - elOffsetTop - headerH - footerH - h;
        if(wOffset >= 0 && hOffset >= 0) return;
        let scale;
        //wOffset and hOffset will be negative so the number on the left is actually smaller despite a + being used
        if(wOffset < hOffset) {
            scale = (w + wOffset) / w;
            console.log("too wide");
        }else {
            scale = (h + hOffset) / h;
            console.log("too tall");
        }
        el.style.transform = "scale(" + scale + ")";
        gamearea.style.setProperty("width", (w + wOffset) + "px", "important");
        gamearea.style.setProperty("height", (h + hOffset + elOffsetTop) + "px", "important");
    },

 	rotateHandler: function() {
		let game = document.querySelector("#main_game_center");
		if(!game || !isMobile.any()) return;
		let orientation = screen.orientation.type;
		if(orientation == "landscape-primary" || orientation == "landscape-secondary") {
            document.querySelector("#main_centering_div").requestFullscreen();
            document.querySelector("#main_centering_div").mozRequestFullScreen();
            document.querySelector("#main_centering_div").webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
		}else if(orientation == "portrait-primary" || orientation == "portrait-secondary") {
            document.exitFullscreen();
            document.cancelFullScreen();
            document.mozCancelFullScreen();
            document.webkitCancelFullScreen();
		}
		this.resizeHandler();
	}
});
