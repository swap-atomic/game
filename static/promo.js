var PromoSystem = GameSystem.extend({
    init: function () {
        this._super('home', null, 0, null);

         this.stat_values = {};
        this.stat_timeout_ids = {};

         this.init_handlers();
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
	let that = this;
    }
});

 function init_promo(key, my_player_ident, my_public_id, initial_leaderboards, initial_mygames ) {
    sound_list = [];
    common_init( null, key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, null, sound_list );

     dialog_system.init_help( [] );

    $('#promoBanners').prependTo($('#promoBanners').closest('.container').parent()).removeClass('invisible');

     game_system = new PromoSystem();
}
