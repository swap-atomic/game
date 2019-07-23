var HomeSystem = GameSystem.extend({
    init: function () {
        this._super('home', null, 0, null);

        this.stat_values = {};
        this.stat_timeout_ids = {};

        this.init_handlers();
        this.update_stat_label_widths();

        $("#game_videopoker > a").attr('href', ('' + window.location).replace('/home', '/videopoker'));
        $("#game_blackjack > a").attr('href', ('' + window.location).replace('/home', '/blackjack'));
        $("#game_roulette > a").attr('href', ('' + window.location).replace('/home', '/roulette'));
        $("#game_craps > a").attr('href', ('' + window.location).replace('/home', '/craps'));
        $("#game_keno > a").attr('href', ('' + window.location).replace('/home', '/keno'));
        $("#game_slots > a").attr('href', ('' + window.location).replace('/home', '/slots'));
        $("#game_dice > a").attr('href', ('' + window.location).replace('/home', '/dice'));
    },

    call_update_service: function () {
        if (this.user_is_active) {
            var that = this;
            var timestamp = (new Date()).getTime();
            $.ajax({
                url: "/home/update?last=" + leaderboard_system.last_leaderboard_time + "&_=" + timestamp
            }).done(function (update_result) {
                wowbar_system.handle_update(update_result);
				console.log(update_result);
                //that.update_progressive_jackpot( $('#payout_column5 div:first'), update_result.progressive_jackpot );
                that.update_stat(1, '#videopoker_stat_value1', that.format_stat('' + update_result.videopoker_games_played));
                that.update_stat(2, '#videopoker_stat_value2', that.format_stat(Bitcoin.int_amount_to_string(update_result.videopoker_progressive_jackpots['5000000'])) + " BTC");
                that.update_stat(1, '#blackjack_stat_value1', that.format_stat('' + update_result.blackjack_games_played));
                that.update_stat(2, '#blackjack_stat_value2', that.format_stat(Bitcoin.int_amount_to_string(update_result.blackjack_progressive_jackpot)) + " BTC");
                that.update_stat(1, '#roulette_stat_value1', that.format_stat('' + update_result.roulette_games_played));
                that.update_stat(2, '#roulette_stat_value2', that.format_stat(Bitcoin.int_amount_to_string(update_result.roulette_progressive_jackpot)) + " BTC");
                that.update_stat(1, '#craps_stat_value1', that.format_stat('' + update_result.craps_games_played));
                that.update_stat(2, '#craps_stat_value2', that.format_stat(Bitcoin.int_amount_to_string(update_result.craps_progressive_jackpot)) + " BTC");
                that.update_stat(1, '#keno_stat_value1', that.format_stat('' + update_result.keno_games_played));
                that.update_stat(2, '#keno_stat_value2', that.format_stat(Bitcoin.int_amount_to_string(update_result.keno_progressive_jackpots['500000'])) + " BTC");
                that.update_stat(1, '#slots_stat_value1', that.format_stat('' + update_result.slots_games_played));
                that.update_stat(2, '#slots_stat_value2', that.format_stat(Bitcoin.int_amount_to_string(update_result.slots_progressive_jackpots['1000000'])) + " BTC");
                that.update_stat(1, '#dice_stat_value1', that.format_stat('' + update_result.dice_games_played));
                that.update_stat(2, '#dice_stat_value2', that.format_stat(Bitcoin.int_amount_to_string(update_result.dice_progressive_jackpot)) + " BTC");

                leaderboard_system.process_leaderboard_data(update_result.leaderboard, false);
            });
        }

        window.setTimeout(function () {
            that.call_update_service();
        }, 2000);
    },

    handle_keypress: function (ev) {
        //the cashout dialog needs to be able to get all keyboard input.
        if (dialog_system.dialog_with_input_is_open) return false;

        //chat system needs to catch enter
        if (chat_system != null && chat_system.focused) return false;

        switch (ev.keyCode) {
            case 8: //backspace
                //  - Disable backspace mapping to back button, so that users in incognito aren't screwed and lose their account_key.
                return true;
        }
        return false;
    },

    init_handlers: function () {
        var that = this;

        $(".show_provably_fair_explain_link").click(function () {
            dialog_system.show_provably_fair_explain_dialog("");
            return false;
        });

        $(".dialog .confirm_button").click(function () {
            $('.dialog').trigger('close');
        });

        $(document).keydown(function (ev) {
            if (!$("input").is(":focus") && that.handle_keypress(ev)) {
                ev.preventDefault();
            }
        });
    },

    handle_balance_update: function (intbalance) {
    },

    update_stat_label_widths: function (only) {
        // these must match css
        var block_width = 240;
        var padding = 4;

        for (var i = 1; i <= 2; i++) {
            if (only != undefined && i != only) continue;
            $("#videopoker_stat_label" + i).css("width", (block_width - $("#videopoker_stat_value" + i).outerWidth() - padding) + "px");
            $("#blackjack_stat_label" + i).css("width", (block_width - $("#blackjack_stat_value" + i).outerWidth() - padding) + "px");
            $("#roulette_stat_label" + i).css("width", (block_width - $("#roulette_stat_value" + i).outerWidth() - padding) + "px");
            $("#craps_stat_label" + i).css("width", (block_width - $("#craps_stat_value" + i).outerWidth() - padding) + "px");
            $("#keno_stat_label" + i).css("width", (block_width - $("#keno_stat_value" + i).outerWidth() - padding) + "px");
            $("#slots_stat_label" + i).css("width", (block_width - $("#slots_stat_value" + i).outerWidth() - padding) + "px");
            $("#dice_stat_label" + i).css("width", (block_width - $("#dice_stat_value" + i).outerWidth() - padding) + "px");
        }
    },

    update_stat: function (i, selector, new_value) {
        if (this.stat_values[selector] == new_value) {
            return;
        }

        var delay = 250 + Math.random() * 2000;
        if (this.stat_values[selector] == undefined) {
            delay = 0;
        }

        this.stat_values[selector] = new_value;

        if (this.stat_timeout_ids[selector] == undefined || this.stat_timeout_ids[selector] == null) {
            var that = this;
            this.stat_timeout_ids[selector] = window.setTimeout(function () {
                $(selector).css({ opacity: 0.0 });
                $(selector).animate({ opacity: 1.0 }, 1000, function () { });
                $(selector).html(that.stat_values[selector]);
                that.update_stat_label_widths(i);
                that.stat_timeout_ids[selector] = null;
            }, delay);
        }
    },

    format_stat: function (value) {
        var p = value.indexOf('.');
        if (typeof (value) === "string" && p >= 0) {
            var before_number = value.slice(0, p);
            before_number = before_number.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
            after_number = value.slice(p, p + 4);
            return before_number + after_number;
        }
        return ('' + value).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
    }
});

function init_home(key, my_player_ident, my_public_id, initial_leaderboards, initial_mygames ) {

    sound_list = [];
    common_init( null, key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, null, sound_list );

    dialog_system.init_help( [] );

    game_system = new HomeSystem();
    game_system.call_update_service();

    $('#homeBanners').prependTo($('#homeBanners').closest('.container').parent()).removeClass('invisible');

    $('#btnSubscribeVIP').click(e => {
        const $input = $(e.currentTarget).siblings('input[type=email]');

        $.ajax({
            url: "/account/registeremail?email=" + $input.val(),
            type: "GET",
            cache: false
        }).done(response => {
            if (response.result != "success") {
                showMessage('warningSubscribeVIP');
            } else {
                showMessage('successSubscribeVIP');
                $input.val('');
            }
        }).fail(() => showMessage('warningSubscribeVIP'));

        function showMessage(id) {
            $('#' + id).show();
            setTimeout(() => $('#' + id).fadeOut('slow'), 3000);
        }
    });
}
