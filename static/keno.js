var KenoSystem = GameSystem.extend({
    init: function (starting_server_seed_hash, ruleset, credit_btc_value) {
        //  - Why is the order of the games list not consistent?
        // TODO - Why is the game list needed at all?
        this._super('keno', starting_server_seed_hash, credit_btc_value, ['blackjack', 'videopoker', 'roulette', 'craps', 'slots', 'keno']);

        this.GAME_STATE_PRE_BLESS = 0;
        this.GAME_STATE_BLESSING = 1;
        this.game_state = this.GAME_STATE_PRE_BLESS;

        this.AUTOPLAY_PICK_SELECTION_RANDOM = 0;
        this.AUTOPLAY_PICK_SELECTION_LUCKY_CARD = 1;

        this.NUM_NUMBERS = 80;
        this.NUM_REQUIRED_PICKS = 10;
        this.NUM_BLESSED_NUMBERS = 20;
        //this.NUM_BLESSED_NUMBERS_ON_SCARAB = 23;
        this.bet_size = 1;

        this.RULESET = ruleset;
        this.MAX_BET_SIZE = this.RULESET['available_bet_sizes'][ this.RULESET['available_bet_sizes'].length-1 ];

        this.init_handlers();
        $("#game_corner_title").css("height", $("#prize_col_0").height());

        this.progressive_jackpot = 0;
        this.progressive_jackpot_timeout_id = null;

        this.clear_picks();
        this.bless_result = null;
        this.first_pick = true;
        this.blessing_visible = false;
        this.autoplay_mode_basic_pick_selection = this.AUTOPLAY_PICK_SELECTION_RANDOM;

        this.is_counting_up = false;
        this.time_update();
        this.update_controls();
    },

    time_update: function () {
        var that = this;
        this.blink_on = !this.blink_on;

        if (this.blink_on) {
            if( this.can_bless() ) {
                $("#control_bless").addClass("bright");
            }
            if( this.num_picks == 0 ) {
                $("#control_quickpick").addClass("bright");
            }
            else {
                $("#control_quickpick").removeClass("bright");
            }

            if( this.bless_result != null ) {
                $(".prize_item_" + this.bless_result.hit_numbers.length ).addClass("win blink");
            }
        }
        else {
            $("#control_bless").removeClass("bright");
            $("#control_quickpick").removeClass("bright");

            if( this.bless_result != null ) {
                $(".prize_item_" + this.bless_result.hit_numbers.length ).removeClass("blink");
            }
        }

        window.setTimeout(function () {
            that.time_update();
        }, this.BLINK_DELAY);
    },

    call_update_service: function () {
        var that = this;
        if (this.user_is_active) {
            var timestamp = (new Date()).getTime();
            $.ajax({
                url: "/keno/update?last=" + leaderboard_system.last_leaderboard_time + "&chatlast=" + chat_system.last_chatlog_index + "&credit_btc_value=" + this.credit_btc_value + "&_=" + timestamp
            }).done(function (update_result) {
                wowbar_system.handle_update(update_result);
                leaderboard_system.process_leaderboard_data(update_result.leaderboard, false);
                chat_system.process_chatlog(update_result.chatlog, false);
                that.set_progressive_jackpots(update_result.progressive_jackpots );
            });
        }

        window.setTimeout(function () {
            that.call_update_service();
        }, 2000);
    },

    package_pregame_info: function () {
        var p = {
            server_seed_hash           : this.next_server_seed_hash,
            client_seed                : this.client_seed,
            bet_size                   : this.bet_size,
            credit_btc_value           : this.credit_btc_value,
            picks                      : this.picks.slice(0)
        };
        return p;
    },

    package_game_info: function (finish_result) {
        var p = {
            pregame_info               : this.last_pregame_info_package,
            game_id                    : finish_result.game_id,
            unique_id                  : finish_result.unique_id,
            blessed_numbers            : finish_result.blessed_numbers,
            hit_numbers                : finish_result.hit_numbers,
            game_seed                  : finish_result.game_seed,
            prize                      : finish_result.prize,
            intwinnings                : finish_result.intwinnings,
            intgameearnings            : finish_result.intgameearnings,
            progressive_win            : finish_result.progressive_win
        };
        if( account_system.use_fake_credits ) {
            p['unique_id'] = this.games_played;
        }
        return p;
    },

    check_game: function (show_dialog, game_info_package) {
        var proof_error = null;
    
        var proves_server_seed = false;
        var proves_blessed     = false;
        var proves_prizes      = false;
        var game_is_legit      = false;
    
        // first make sure that our client seed was used in the game seed
        if( game_info_package.game_seed.indexOf(game_info_package.pregame_info.client_seed) != -1 ) {
            // Next, extract the server's seed from the game_seed and SHA-256 it, and make sure the hash matches the hash provided
            // before the hand is dealt.
            var li = game_info_package.game_seed.lastIndexOf(game_info_package.pregame_info.client_seed);
            var server_seed = game_info_package.game_seed.substr(0, li) + game_info_package.game_seed.substr(li + game_info_package.pregame_info.client_seed.length);
            if( SHA256(server_seed) == game_info_package.pregame_info.server_seed_hash ) {
                proves_server_seed = true;
    
                // Next, perform the "sample" on a set of 80 keno numbers and verify the given numbers are exactly the ones that we got.
                // 1. Python's random module first hashes the game seed using SHA256
                // 2. The hash is turned into a sequence of bytes
                // 3. The bytes are appended to the seed
                // 4. The result is used to seed a Mersenne Twister
 
                // Concat the original seed with the hash of the seed
                var hash_bytes = new Array()
                for( var i = 0; i < game_info_package.game_seed.length; i++ ) {
                    hash_bytes.push(game_info_package.game_seed.charCodeAt(i));
                }
                
                var hashed_game_seed = (new jsSHA(game_info_package.game_seed, "ASCII")).getHash("SHA-512", "HEX");
                for( var i = 0; i < 128; i += 2 ) {
                    hash_bytes.push(parseInt(hashed_game_seed.substring(i, i+2), 16));
                }
            
                // Convert the hash_bytes into an array of 32-bit words starting from the right
                var word_array = byte_array_to_words(hash_bytes);
            
                // Create a MT rng
                var twister = new MersenneTwister();
                twister.init_by_array(word_array, word_array.length);
            
                // At this point we need to sample this.NUM_BLESSED_NUMBERS + this.RULESET['hit_scarab_extra_blessings'] numbers
                var numbers = new Array();
                for( var i = 1; i <= this.NUM_NUMBERS; i++ ) numbers.push(i)

                var blessed_numbers = sample(twister, numbers, this.NUM_BLESSED_NUMBERS + this.RULESET['hit_scarab_extra_blessings']);

                var valid_blessed = true;

                // First check first 20 numbers, then if we hit the scarab, check the next 3
                for( var i = 0; valid_blessed && i < this.NUM_BLESSED_NUMBERS; i++ ) {
                    if( blessed_numbers[i] != game_info_package.blessed_numbers[i] ) {
                        valid_blessed = false;
                    }
                }

                var hit_scarab = false;

                if( game_info_package.pregame_info.picks[blessed_numbers[this.NUM_BLESSED_NUMBERS-1]] ) {
                    hit_scarab = true;

                    for( var i = 0; valid_blessed && i < this.RULESET['hit_scarab_extra_blessings']; i++ ) {
                        if( blessed_numbers[this.NUM_BLESSED_NUMBERS+i] != game_info_package.blessed_numbers[this.NUM_BLESSED_NUMBERS+i] ) {
                            valid_blessed = false;
                            break;
                        }
                    }
                } else {
                    // We didn't hit scarab but server says we did?!
                    if( game_info_package.blessed_numbers.length != this.NUM_BLESSED_NUMBERS ) valid_blessed = false;
                }

                var num_hits = 0;
                for( var i = 0; i < game_info_package.blessed_numbers.length; i++ ) {
                    if( game_info_package.pregame_info.picks[game_info_package.blessed_numbers[i]] ) {
                        num_hits++;
                    }
                }
            
                // This verifies the dice provided by the server are correct.
                if( valid_blessed ) {
                    proves_blessed = true;

                    var intwinnings = this.RULESET['paytable'][num_hits] * game_info_package.pregame_info.bet_size * game_info_package.pregame_info.credit_btc_value;

                    // Hitting the scarab gives 3x payout
                    if( hit_scarab ) intwinnings *= 3;

                    if( game_info_package.progressive_win >= 0 && (game_info_package.intwinnings - game_info_package.progressive_win) == intwinnings ) {
                        proves_prize = true;

                        // Because the jackpots are always changing, we can't guarantee them..
                        game_is_legit = true;
                    } else {
                        proof_error = "prize";
                    }
                } else {
                    proof_error = "blessed";
                }
            } else {
                proof_error = "server_seed";
            }
        } else {
            proof_error = "client_seed";
        }
    
        if( show_dialog ) {
            this.show_provably_fair_dialog(game_info_package, proves_server_seed, proves_blessed, proves_prizes);
        }

        return game_is_legit ? true : proof_error;
    },

    show_provably_fair_dialog: function (game_info_package, proves_server_seed, proves_blessed, proves_prizes) {
        var server_seed = game_info_package.game_seed.replace(game_info_package.pregame_info.client_seed,'');

        // Main game stuff
        $("#provably_fair_gameid").html(game_info_package.game_id);
        $("#provably_fair_server_seed").html(server_seed);
        $("#provably_fair_client_seed").html(game_info_package.pregame_info.client_seed);
        $("#provably_fair_game_seed").html(game_info_package.game_seed);
        $("#provably_fair_blessed").html(game_info_package.blessed_numbers.join(", "));

        var picks = [];
        for( var k in game_info_package.pregame_info.picks ) {
            if( game_info_package.pregame_info.picks[k] ) picks.push(k);
        }

        $("#provably_fair_picks").html(picks.join(", "));
        $("#provably_fair_extra_three").html((game_info_package.blessed_numbers.length > this.NUM_BLESSED_NUMBERS) ? "Yes" : "No");

        if( game_info_package.hit_numbers.length > 0 ) {
            $("#provably_fair_hits").html(game_info_package.hit_numbers.join(", "));
        } else {
            $("#provably_fair_hits").html("None");
        }

        var inttotalbet = game_info_package.pregame_info.bet_size * game_info_package.pregame_info.credit_btc_value;
        $("#provably_fair_total_bet").html(Bitcoin.int_amount_to_string(inttotalbet));

        $("#provably_fair_progressive_win").html(Bitcoin.int_amount_to_string(game_info_package.progressive_win));

        var intwinnings = game_info_package.intwinnings;
        $("#provably_fair_prize").html(Bitcoin.int_amount_to_string(intwinnings));

        //  - Use sprite sheet, added some display delays.
        $("#provably_fair_dialog .result_image").removeClass("pass");
        $("#provably_fair_dialog .result_image").removeClass("fail");
        $("#provably_fair_dialog .result_image").css('visibility', 'hidden');
 
        window.setTimeout(function() { 
            $("#provably_fair_proves_server_seed").css('visibility', 'visible');
            $("#provably_fair_proves_server_seed").addClass( proves_server_seed ? "pass" : "fail" );
        }, 500);

        window.setTimeout(function() { 
            $("#provably_fair_proves_blessed").css('visibility', 'visible');
            $("#provably_fair_proves_blessed").addClass( proves_blessed ? "pass" : "fail" );
        }, 1000);

        window.setTimeout(function() { 
            $("#provably_fair_proves_prize").css('visibility', 'visible');
            $("#provably_fair_proves_prize").addClass( proves_prize ? "pass" : "fail" );
        }, 1500);

        ////////////////////////////////////////////////////////////////////////////////
        // show the dialog
        $("#pf_tab_main").click( function() {
            $("#pf_tabs li a").removeClass("selected");
            $(this).addClass("selected");
            $(".pf_page").removeClass("selected");
            $(".pfdd_page").removeClass("selected");
            $("#pf_page_main").addClass("selected");
            return false;
        });

        // we don't need tabs for this game
        $("#provably_fair_dialog #pf_tabs_container").hide();

        $('#provably_fair_dialog').lightbox_me({
            centered: true,
            onLoad: function() {
                $('#pf_tab_main').click();
                $('#provably_fair_dialog').trigger('reposition');
            }
        }); 
    },

    add_game_to_leaderboard: function (finish_result, game_info_package) {
        var that = this;
        var timestamp = (new Date()).getTime() / 1000;
        var intwinnings = game_info_package.intwinnings;
        var inttotalbet = game_info_package.pregame_info.bet_size * game_info_package.pregame_info.credit_btc_value;
        var intgameearnings = intwinnings - inttotalbet;

        var lb = {
            player_ident: account_system.player_ident,
            public_id: account_system.public_id,
            timestamp: timestamp,
            game: "keno",
            gamedata: {
                "prize": game_info_package.prize,
                "progressive_win": game_info_package.progressive_win,
                "unique_id": game_info_package.unique_id,
                "inttotalbet": inttotalbet,
                "intprogressivebet": game_info_package.progressive_bet,
                "intwinnings": intwinnings,
                "intgameearnings": intgameearnings,
                "hit_numbers_count": finish_result.hit_numbers.length,
            }
        };
        var new_row = leaderboard_system.process_row("mygames", lb, false, false);
        if( intwinnings > 0 ) {
            leaderboard_system.process_row("recent", lb, false, false);
        }

        // Display mygames page if it's the first game played
        if( this.games_played == 0 ) {
            $("#tab4").trigger("click");
        }
        this.games_played++;
        
        // and check it right now!
        var game_check = this.check_game(false, game_info_package);
        if( game_check != true ) {
            this.show_server_lied_dialog(game_check, null, game_info_package.unique_id);
        }

        new_row.find("div.verify_button").on('click', function() {
            that.check_game(true, game_info_package);
        });
    },

    finish_game: function (finish_result) {
        var that = this;
        
        var game_info_package = this.package_game_info(finish_result);
        this.add_game_to_leaderboard(finish_result, game_info_package); 

        // must come after package_game_info
        this.set_next_server_seed_hash(finish_result.server_seed_hash);
        this.game_state = this.GAME_STATE_PRE_BLESS;

        //  - Play happy sounds!
        //  - Show on the prize table which item you won! And blink it!
        var scarab_num = finish_result.blessed_numbers[this.NUM_BLESSED_NUMBERS-1];
        var hit_scarab = this.picks[scarab_num];
        $("#num_hits_value").html( finish_result.hit_numbers.length );
        if( finish_result.hit_numbers.length >= 4 ) {
            $("#num_hits").removeClass("bad");
        }
        else {
            $("#num_hits").addClass("bad");
        }
        var win_text;
        if( hit_scarab ) {
            $("#num_hits_scarab_icon").addClass("on");
            win_text = this.WIN_TEXT_TRIPLE;
        }
        else {
            $("#num_hits_scarab_icon").removeClass("on");
            win_text = this.WIN_TEXT_WIN;
        }

        this.first_pick = true;

        if(finish_result.intbalance != undefined) {
            account_system.set_btc_balance(finish_result['intbalance'], finish_result['fake_intbalance']);
        }
        
        if( finish_result.intwinnings > 0 ) {
            window.setTimeout( function() {
                if( hit_scarab ) {
                    sound_system.play_sound( "win_scarab" );
                }
                else {
                    sound_system.play_sound( "win1" ); 
                }
            }, this.WIN_SOUND_DELAY);
        }
        
        // Can now show the updated credits value since the game is done.
        var credits_won = finish_result.intwinnings / this.credit_btc_value;
        this.is_counting_up = true;

        // Skip the count up if you're in autoplay (since otherwise you won't see the final number)
        var start = 0;
        if( autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED ) {
            start = credits_won;
        } 

        // Determine when to show fireworks!
        var show_fireworks = credits_won > 0 && (this.last_progressive_jackpot != null && this.last_progressive_jackpot >= 6);
        this.counter_wins_timer_id = this.countup_wins(start, credits_won, show_fireworks, win_text, function() {
            that.is_counting_up = false;
            that.calculate_credits();
        });
        
        this.update_controls();
    },

    countup_wins: function (current, goal, show_fireworks, win_text, done) {
        var that = this;

        if (show_fireworks && !isMobile.any()) {
            this.maybe_create_firework();
        }

        this.countup_wins_done = done;
        if (current >= goal) {

            this.draw_win_amount(goal, win_text, 1);
            done();
            return;
        }

        this.draw_win_amount(current, win_text, 1);

        var delta = 1;
        var delay = 50;

        if (current + delta >= goal) {
            this.num_credits += goal - current;
        }
        else {
            this.num_credits += delta;
        }
        this.update_credits();

        return window.setTimeout(function () {
            that.counter_wins_timer_id = that.countup_wins(current + delta, goal, show_fireworks, win_text, done);
        }, delay);
    },

    stop_countup_wins: function () {
        if (this.counter_wins_timer_id != null) {
            window.clearTimeout(this.counter_wins_timer_id);
            this.counter_wins_timer_id = null;
            this.countup_wins_done();
        }
    },

    //  - This could be in common code, considering the only difference is the name of the game...
    reseed: function (cb) {
        var that = this;
        $.ajax({
            url: "/keno/reseed"
        }).done(function (reseed_request) {
            if (reseed_request.result == true) {
                that.set_next_server_seed_hash(reseed_request.server_seed_hash);
                cb();
            }
        });
    },

    // Called by AccountSystem
    //  - This could potentially be handled in common game code?
    handle_balance_update: function (intbalance) {
        if (!this.is_counting_up && (this.game_state == this.GAME_STATE_PRE_BLESS)) {
            this.calculate_credits();
        }
    },

    can_bless: function() {
        if (this.game_state != this.GAME_STATE_PRE_BLESS) {
            return false;
        }
    
        if( this.num_picks != this.NUM_REQUIRED_PICKS ) {
            return false;
        }
        return true;
    },

    clear_ball_row: function() {
        $("#ball_row").empty();
    },
    add_ball: function(num, is_bonus) {
        var s = "<div class='ball ";
        if( is_bonus ) {
            s += "scarab_bonus ";
        }
        if( this.picks[num] ) {
            s+= "hit ";
        }
        s += "'><div class='ballnum'>" + num + "</div></div>";
        if( i == 19 ) {
            s += "<div class='ball_scarab_bonus_divider'></div>";
        }
        $("#ball_row").append(s);
    },
    animate_blessing: function( blessed_numbers, callback ) {
        //  TEST - Try instant!
        var that = this;
        this.clear_blessing(); 
        var scarab_num = blessed_numbers[this.NUM_BLESSED_NUMBERS-1];
        this.blessing_visible = true;

        this.clear_ball_row();
        for( var i = 0; i < this.NUM_BLESSED_NUMBERS; i++ ) {
            this.bless_number( blessed_numbers[i], true );
            this.add_ball( blessed_numbers[i], false );
        }

        // Set up the hit/miss box
        $("#last_number_hit_num").html( scarab_num ).removeClass("hit").removeClass("miss").addClass( this.picks[scarab_num] ? "hit" : "miss" );
        $("#last_number_hit_result").removeClass("hit").removeClass("miss").addClass( this.picks[scarab_num] ? "hit" : "miss" );

        $("#num_container_" + scarab_num + " .scarab_icon").addClass("on");
        if( this.picks[scarab_num] ) {
            sound_system.play_sound( "hit_scarab" ); 

            $("#ball_row").append( "<div class='ball_scarab_bonus_divider'></div>" );
            for( var i = that.NUM_BLESSED_NUMBERS; i < that.NUM_BLESSED_NUMBERS + that.RULESET['hit_scarab_extra_blessings']; i++ ) {
                that.add_ball( blessed_numbers[i], true );
            }

            var blink_scarab = function( on, count, callback ) {
                on = !on;

                //  - This will cause the hit_scarab sound to potentially play at the same time as the win sound effect...?
                if( autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED ||
                    autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING) {
                    on = true;
                    count = 0;
                } 

                num_div = $("#num_container_" + scarab_num + " .scarab_icon");
                if( on ) {
                    num_div.addClass("on");
                    $(".ball.scarab_bonus").show();
                }
                else {
                    num_div.removeClass("on");
                    $(".ball.scarab_bonus").hide();
                }
                for( var i = that.NUM_BLESSED_NUMBERS; i < that.NUM_BLESSED_NUMBERS + that.RULESET['hit_scarab_extra_blessings']; i++ ) {
                    that.bless_number( blessed_numbers[i], on );
                }
                if( count == 0 ) {
                    callback();
                }
                else {
                    window.setTimeout(function () {
                        blink_scarab(on, count-1, callback);
                    }, 200);
                }
            }

            blink_scarab( false, 6, function() {
                $("#ball_row").append("<div style='clear:both'></div>");
                callback();
            });

        }
        else {
            callback();
        }

    },

    update_controls: function () {

        switch (this.game_state) {
            case this.GAME_STATE_PRE_BLESS:
                var s = "";
                if( this.blessing_visible && this.num_picks == this.NUM_REQUIRED_PICKS ) {
                    var scarab_num = this.bless_result.blessed_numbers[this.NUM_BLESSED_NUMBERS-1];
                    var hit_scarab = this.picks[scarab_num];
                    if( hit_scarab ) {
                        s = "TRIPLE BONUS -- "; 
                    }
                    s += "HIT " + this.bless_result.hit_numbers.length;
                }
                else if( this.num_picks == this.NUM_REQUIRED_PICKS ) {
                    s = "CHANGE BET OR PRESS DRAW";
                }
                else if( this.num_picks == 0 ) {
                    s = "SELECT NUMBERS OR PRESS QUICK PICK";
                }
                else {
                    s = "PICKED: " + this.num_picks;
                }
                $("#num_row_intermission").html(s);

                if( this.can_bless() ) {
                    $("#control_bless").removeClass("disabled");
                    //$("#num_row_intermission").html("HIT: 3");
                    //$("#num_row_intermission").html("CHANGE BET OR PRESS DRAW");
                }
                else {
                    $("#control_bless").addClass("disabled");
                    //$("#num_row_intermission").html("PICKED: 7");
                    //$("#num_row_intermission").html("SELECT NUMBERS OR PRESS QUICK PICK");
                }

                if( this.num_picks > 0 ) {
                    $("#control_clear").removeClass("disabled");
                }
                else {
                    $("#control_clear").addClass("disabled");
                }
                $("#control_quickpick").removeClass("disabled");
                $("#control_betone").addClass("clickable");
                $("#control_betmax").addClass("clickable");
                break;
            case this.GAME_STATE_BLESSING:
                $("#control_bless").addClass("disabled");
                $("#control_quickpick").addClass("disabled");
                $("#control_clear").addClass("disabled");
                $("#control_betone").removeClass("clickable");
                $("#control_betmax").removeClass("clickable");
                $("#num_row_intermission").html("");
                break;
        }

        // In autoplay, just disable all the buttons.
        if (autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED || autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING) {
            $("#control_bless").addClass("disabled");
            $("#control_quickpick").addClass("disabled");
            $("#control_clear").addClass("disabled");
        }
        else {

        }

        /*
        $("#num_picks").html( this.num_picks );
        if( this.num_picks == this.NUM_REQUIRED_PICKS ) {
            $("#num_picks").removeClass("bad");
        }
        else {
            $("#num_picks").addClass("bad");
        }
        */

    },

    handle_auto: function () {
        if (autoplay_system.autoplay_phase != autoplay_system.AUTOPLAY_PHASE_STOPPED) {
            autoplay_system.autoplay_stopnow();
            return;
        }
        $("#autoplay_dialog").css('width', '500px');
        this.set_autoplay_options();

        let autoplay_dialog = document.querySelector("#autoplay_dialog");
        let options = autoplay_dialog && isMobile.any() ? mobileLightboxOptions(autoplay_dialog) : {};
        $("#autoplay_dialog").lightbox_me({
            centered: true,
            ...options,
            onClose: function() {
                dialog_system.dialog_with_input_is_open = false;
                options.onClose && options.onClose();
            }
        });

        dialog_system.dialog_with_input_is_open = true;
    },

    set_autoplay_options: function () {
        $("#autoplay_mode_basic_speed option:selected").removeAttr("selected");

        $($("#autoplay_mode_basic_speed option")[autoplay_system.autoplay_speed]).prop('selected', true);

        $("#autoplay_dialog .options_container").hide();
        $(".autoplay_mode_item.selected .options_container").show();

        $("#autoplay_mode_basic_pick_selection option:selected").removeAttr("selected");
        $($("#autoplay_mode_basic_pick_selection option")[this.autoplay_mode_basic_pick_selection]).prop("selected", true);
    },

    handle_autoplay_start: function () {
        if( (this.autoplay_mode_basic_pick_selection == this.AUTOPLAY_PICK_SELECTION_LUCKY_CARD) && (this.num_picks != this.NUM_REQUIRED_PICKS) ) {
            alert("You must first set your Keno picks before starting Lucky Card auto-play.");
            return;
        }
        this.last_progressive_jackpot = null; // TODO update this in _bless to the number of hits

        autoplay_system.autoplay_start(false);
        $("#autoplay_dialog").trigger("close");
        this.update_controls();
    },

    bless_number: function(id, on) {
        var div = $("#num_container_" + id);
        if( on ) {
            div.addClass("blessed");
        }
        else {
            div.removeClass("blessed");
        }

        // Maybe can just check picked + blessed in the css.
        /*
        if( this.picks[id] == true ) {
            div.addClass("hit");
        }
        */
    },
    pick_number: function(id) {
        // If we just played a game and have a full board, and then pick a number we should clear the entire board.
        // This way you can keep playing the same numbers by pressing bless, but as soon as you pick one new number, everything resets.
        if( this.first_pick ) {
            this.clear_picks();
            this.first_pick = false;
        }

        var div = $("#num_container_" + id);
        if( this.picks[id] == true ) {
            this.num_picks--;
            div.removeClass("picked");
            this.picks[id] = false;
        }
        else {
            if( this.num_picks >= this.NUM_REQUIRED_PICKS ) {
                return;
            }
            this.num_picks++;
            div.addClass("picked");
            this.picks[id] = true;
        }
        this.update_controls();

    },

    clear_blessing: function() {
        this.blessing_visible = false;
        $(".num_container").removeClass("blessed");
        $(".scarab_icon").removeClass("on");
        $(".prize_item").removeClass("win blink");
        //$("#ball_row").empty();
        //this.build_ball_row( ["","",""], 3 );
    },
    clear_picks: function(play_sound) {
        // TODO use play_sound
        this.clear_blessing();
        this.picks = new Array();
        for( var i = 0; i < this.NUM_NUMBERS+1; i++ ) {
            this.picks[i] = false;
        }
        $(".num_container").removeClass("picked");
        this.num_picks = 0;
        this.update_controls();
    },

    handle_clear: function (e) {
        sound_system.play_sound( 'boop' );
        this.clear_picks(true);
    },

    do_quickpick: function(play_sound) {
        this.clear_picks();
        this.clear_blessing();

        // Screw shuffling a list. Just keep trying to pick nums until we have enough.
        while( this.num_picks != this.NUM_REQUIRED_PICKS ) {
            this.pick_number( parseInt(Math.random() * this.NUM_NUMBERS) + 1 );
        }
    },

    handle_quickpick: function (e) {
        sound_system.play_sound( 'boop' );
        this.do_quickpick(true);
    },

    handle_bless: function (e) {

        var that = this;
        if( !this.can_bless() ) {
            return;
        }

        //  - What was the point of this code??? (taken from craps)
        if (e != undefined) e.preventDefault();

        //this.client_seed = get_client_seed(); 
        if( !this.check_client_seed() ) {
            return;
        }

        credit_string = "credit_btc_value=" + this.credit_btc_value;
        bet_size_string = "bet_size=" + this.bet_size;
        use_fake_credits_string = "use_fake_credits=" + account_system.use_fake_credits;

        var first = true;
        var bet_string = "numbers=";
        for( var i = 0; i < this.NUM_NUMBERS + 1; i++ ) {
            if( this.picks[i] == true) {
                if( !first ) {
                    bet_string += ",";
                }
                bet_string += i;
                first = false;
            }
        }

        // Check balance
        if( this.credit_btc_value > account_system.get_active_btc_int_balance() ) {
            account_system.show_no_credits_dialog();
            return;
        }

        this.num_credits -= this.bet_size;
        this.update_credits();

        this.game_state = this.GAME_STATE_BLESSING;
        this.stop_countup_wins();

        sound_system.play_sound("pay_coins");
        this.update_controls();

        this.client_seed = $("#next_client_seed").val();
        $("#next_client_seed").prop('disabled', true);

        this.last_pregame_info_package = this.package_pregame_info();
        $.ajax({
            url: "/keno/bless?server_seed_hash=" + this.next_server_seed_hash + "&client_seed=" + this.client_seed + "&" + bet_string + "&" + credit_string + "&" + bet_size_string + "&" + use_fake_credits_string
        }).done(function (bless_result) {
            if (bless_result['error'] != null) {
                that.game_state = that.GAME_STATE_PRE_BLESS;
                if (bless_result['error'] == "insufficient_funds") {
                    account_system.show_no_credits_dialog();
                } else if (bless_result['error'] == 'shutting_down') {
                    account_system.show_shutting_down_dialog();
                } else if (bless_result['error'] == 'need_seed') {
                    that.num_credits += this.credit_btc_value;
                    that.update_credits();
                    that.reseed(function () {
                        that.handle_bless();
                    });
                }
                else {
                    alert("Internal server error. Please try again later. (" + bless_result['error'] + ")");
                }
                return;
            }
            that.bless_result = bless_result;
            
            // This value is only used by autoplay to stop playing when a jackpot is hit.
            if (indexOf(that.RULESET['progressive_jackpots'], bless_result.hit_numbers.length) >= 0) {
                that.last_progressive_jackpot = bless_result.hit_numbers.length;
            }

            that.set_progressive_jackpots( bless_result.progressive_jackpots );
            that.animate_blessing( bless_result.blessed_numbers, function() {
                that.finish_game(that.bless_result);
                that.game_state = that.GAME_STATE_PRE_BLESS; 
            } );

            account_system.shutting_down(bless_result['shutdown_time'], false);
            if (bless_result.shutdown_time != undefined && bless_result.shutdown_time != 0) {
                account_system.shutting_down(bless_result.shutting_down);
            }

        }).fail(function () {
            that.game_state = that.GAME_STATE_PRE_BLESS;
            that.update_controls();
            that.num_credits += this.credit_btc_value;
            that.update_credits();
            alert("Error connecting to server. Please check your internet connection, try again, or reload the page.");
        });
    },

    handle_keypress: function (ev) {
        //the cashout dialog needs to be able to get all keyboard input.
        if (dialog_system.dialog_with_input_is_open) return false;

        //chat system needs to catch enter
        if (chat_system != null && chat_system.focused) return false;

        if ($("#next_client_seed").is(":focus")) {
            return false;
        }

        switch (ev.keyCode) {
            case 8: //backspace
                // Need to handle backspace if inside the text edit box
                if ($("#input_bet_amount").is(":focus")) {
                    return false;
                }

                //  - Disable backspace mapping to back button, so that users in incognito aren't screwed and lose their account_key.
                return true;
            case 9: //tab
                this.handle_betone();
                return true;
            case 13: //enter
                this.handle_bless();
                return true;
            case 38:
                //  KENO
            case 40:
                //  KENO
        }
        return false;
    },

    init_handlers: function () {
        var that = this;

        $(".show_expected_return_link").on('click', function () {
            that.show_expected_return_dialog();
            return false;
        });
        $(".show_provably_fair_explain_link").on('click', function () {
            dialog_system.show_provably_fair_explain_dialog(that.game_name);
            return false;
        });

        $(".dialog .confirm_button").click(function () {
            $('.dialog').trigger('close');
        });

        $(".num_container").click( function() {
            if( this.game_state != this.GAME_STATE_PRE_BLESS ) {
                return;
            }
            // "num_container_" == 14 chars
            var id = $(this).attr("id").slice( 14 );
            if( id == "last_number" ) return;
            that.pick_number(id);
        });

        $("#control_bless").click(function (e) {
            that.handle_bless(e);
        });

        $("#control_clear").click(function (e) {
            that.handle_clear(e);
        });

        $("#control_quickpick").click(function (e) {
            that.handle_quickpick(e);
        }); 

        $("#control_autoplay").click(function () {
            that.handle_auto();
        });

        $("#control_btc").click( function() {
        	if( that.game_phase != this.GAME_STATE_PRE_BLESS ) {
                return; 
            }
            
            $('#btc_credit_dialog').lightbox_me({
                centered: true,
                onLoad: function() { 
                
                }
            }); 
            
        });
        
        $(document).on('click', '#credits_holder.clickable', function(){
            if (that.game_phase != that.GAME_PHASE_PRE_GAME && that.game_phase != that.GAME_PHASE_DOUBLE_DONE) {
                return;
            }

            $('#btc_credit_dialog').lightbox_me({
                centered: true,
                onLoad: function () {

                }
            });	        
        });
        
        $("#btc_credit_dialog .btc_item").click( function() {
            $(".btc_item").removeClass("selected");
            $(this).addClass("selected");
            
    		window.setTimeout(function() { 
                $("#btc_credit_dialog").trigger("close");
            }, 250);

            $("#control_btc, #credits_holder").removeClass();
            $("#control_btc").addClass("btc_token");
            $("#control_btc, #credits_holder").addClass("clickable");
            id = $(this).attr("id");
            if( id == "btc_item_001" ) {
                $("#control_btc").addClass("btc_token_001");
                that.credit_btc_value =  100000; // "0.001" BTC
            }
            else if( id == "btc_item_005" ) {
                $("#control_btc").addClass("btc_token_005");
                that.credit_btc_value =  500000; // "0.005" BTC
            } else if( id == "btc_item_0001" ) {
                $("#control_btc").addClass("btc_token_0001");
                that.credit_btc_value =  10000; // "0.0001" BTC
            }
            else {
                alert("Unknown BTC/credit value.");
                return false;
            }
            that.calculate_credits();
            
            // Tell server!
        	$.ajax({
        		url: "account/set_credit_btc_value?credit_btc_value=" + that.credit_btc_value + "&game=keno"
        	}).done(function(withdrawal_result) { 
        	    // Do nothing
        	});
            
            return false;
        });

        $("#autoplay_dialog .autoplay_start_image").click(function () {
            that.handle_autoplay_start();
        });

        $(".num_container").mouseenter( function(e) {
            $(this).addClass("hover");
            //var bet_id = $(this).attr("id").substring(7);
            //that.hilight_bet_numbers( bet_id );
            
            //  - Don't mess with the selected be on hover -- it's too distracting + confusing.
            // that.update_selected_bet(bet_id);
        });

        $(".num_container").mouseleave( function(e) {
            $(this).removeClass("hover");
            //$(this).find(".glow").removeClass("on");
            //that.hilight_clear();
            
            //  - Don't mess with the selected be on hover -- it's too distracting + confusing.
            // that.update_selected_bet(that.selected_bet);
        });

        $(window).on('beforeunload', function () {
            if (that.game_state != that.GAME_STATE_PRE_BLESS ||
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED ||
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING) {
                return 'You are in the middle of a game.  If you leave, you will be forfeiting your bet.'
            }
        });

        var autoplay_speed_changed = function (option) {
            autoplay_system.autoplay_speed = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_basic_speed").change(function () { autoplay_speed_changed($(this)); });

        var autoplay_mode_basic_pick_selection_changed = function (option) {
            that.autoplay_mode_basic_pick_selection = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_basic_pick_selection").change(function () { autoplay_mode_basic_pick_selection_changed($(this)); });

        $(document).keydown(function (ev) {
            if (!$("input").is(":focus") && that.handle_keypress(ev)) {
                ev.preventDefault();
            }
        });

        $("#control_betone").click( function() {
            that.handle_betone();
        });

        $("#control_betmax").click( function() {
            that.handle_betmax();
        });
        
        this.set_prize_column_click_handlers(); 
        $("#nums_holder").attr('unselectable','on').css('UserSelect','none').css('MozUserSelect','none'); 
    },

    update_bet_column: function() {
        $(".prize_col").removeClass("selected");
        $("#prize_col_" + this.bet_size).addClass("selected");
        $("#bet_text").html("BET " + this.bet_size);
    },

    handle_betone: function() {
        if( this.game_state != this.GAME_STATE_PRE_BLESS ) {
            return;
        }
        this.bet_size++;
        if( this.bet_size > this.MAX_BET_SIZE ) {
            this.bet_size = 1;
        }
        sound_system.play_sound( 'boop' );
        this.update_bet_column();
    },

    handle_betmax: function() {
        if( this.game_state != this.GAME_STATE_PRE_BLESS ) {
            return;
        }
        if( this.bet_size == this.MAX_BET_SIZE ) {
            return;
        }
        this.bet_size = this.MAX_BET_SIZE;
        sound_system.play_sound( 'boop' );
        this.update_bet_column();
    },

    set_prize_column_click_handlers: function() {
        var that = this;
        $(".prize_col").click( function() {
            if( that.game_state != that.GAME_STATE_PRE_BLESS ) {
                return;
            }
            id = $(this).attr('id')
            if( id == "prize_col_0" ) {
                return;
            }

            sound_system.play_sound( 'boop' );
            that.bet_size = id.charAt( id.length-1 );
            that.update_bet_column();
        });
    },

    set_progressive_jackpots: function (jackpots) {

        //  - We can just check if 10 hits jackpot has changed, since if one of them has changed, they all have.
        var new10 = jackpots[10];
        if( this.progressive_jackpot == new10 ) {
            return;
        }

        if(this.progressive_jackpot_timeout_id == undefined || this.progressive_jackpot_timeout_id == null) {
            var delay = 250 + Math.random() * 500;
            if( this.progressive_jackpot == null ) {
                delay = 0;
            }

            var that = this;
            this.progressive_jackpot_timeout_id = window.setTimeout( function() { 
                for( var hits = 8; hits < 11; hits++ ) {
                    var new_value = jackpots[hits];
                    var credits_for_jackpot = 5;

                    var frac = Math.floor((new_value % 10000) / 100.0);
                    var dec  = Math.floor(new_value / 10000.0);
                    dec += that.RULESET['paytable'][hits] * credits_for_jackpot;

                    if( frac < 10 ) {
                        frac = '0' + frac;
                    }

                    $("#prize_col_5 .prize_item_" + hits).css({ opacity: 0.2 });
                    $("#prize_col_5 .prize_item_" + hits).html( '' + dec + '.' + frac );
                    $("#prize_col_5 .prize_item_" + hits).animate({ opacity: 1.0 }, 500, function() {
                        that.progressive_jackpot_timeout_id = null;
                    }); 
                        var m = 0;
                        if(that.credit_btc_value && !isNaN(that.credit_btc_value)) {
                            m = that.credit_btc_value / 100000000;
                        }
                        var jackpot_total = m * parseFloat(dec + '.' + frac);
                    }
                    that.display_jackpot(jackpot_total, parseFloat(dec + '.' + frac));
                that.progressive_jackpot = new10;
            }, delay );
        }

    }

});

function init_keno(key, my_player_ident, my_public_id, starting_server_seed_hash, initial_leaderboards, initial_mygames, chatlog, ruleset, credit_btc_value, sound_volume ) {
    //  - Only load the sounds that we actually end up using!
    var sound_list = [ 
        ['boop', 'boop.wav', true, 1],
        ['hit_scarab', 'slot_machine_win_19.wav', false, 1],
        ['win_scarab', 'slot_machine_win_22.wav', false, 1],
        ['win1', 'win1.wav', false, 1],
        ['pay_coins', 'coinpay.wav', false, 1],
    ];
    common_init( 'Keno', key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, chatlog, sound_list, sound_volume );
    
    dialog_system.init_help( ["/static/images/kn-help-howtoplay.png" ] );
    
    game_system = new KenoSystem( starting_server_seed_hash, ruleset, credit_btc_value );
    game_system.call_update_service();

    //we need to resize chat again, since blackjack does some progressive table size changing..
    chat_system.adjust_height(false);
}
