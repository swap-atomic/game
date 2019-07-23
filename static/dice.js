var DiceSystem = GameSystem.extend({
    init: function (starting_server_seed_hash, ruleset, credit_btc_value, last_numbers) {
        this._super('dice', starting_server_seed_hash, credit_btc_value, null);

        this.GAME_STATE_PRE_PULL = 0;
        this.GAME_STATE_PULLING = 1;
        this.game_state = this.GAME_STATE_PRE_PULL;
        this.default_num_credit_decimals = 1;

        this.AUTOPLAY_STRATEGY_MARTINGALE = 0;
        this.AUTOPLAY_STRATEGY_REPEAT = 1;

        this.THROW_HINT_NONE = 0;
        this.THROW_HINT_HIGH = 1;
        this.THROW_HINT_LOW = 2;
        this.NUM_DECIMALS = 6; // xx.yyyy

        this.input_bet_payout = 2;
        this.input_bet_chance = 49.5;
        this.input_bet_amount = 1;
        this.input_bet_profit = 1;


        this.RULESET = ruleset;
        // Calculate some helpful extra values
        this.RULESET['maximum_chance'] = Bitcoin.string_amount_to_int("" + (Math.floor((this.RULESET['player_return'] / this.RULESET['minimum_payout']) * 100000)/1000) );
        this.RULESET['minimum_chance'] = Bitcoin.string_amount_to_int("" + (Math.floor((this.RULESET['player_return'] / this.RULESET['maximum_payout']) * 100000)/1000) );

        this.init_handlers();

        this.progressive_jackpot = 0;
        this.progressive_jackpot_timeout_id = null;

        this.TIME_UPDATE_DELAY = 50;
        this.pull_result = null;
        this.time_since_blink = 0;

        this.autoplay_strategy = this.AUTOPLAY_STRATEGY_MARTINGALE;
        this.autoplay_martingale_table_limit = 0;
        this.autoplay_target = 0;

        this.is_user_input_error = false;
        this.is_counting_up = false;
        this.time_update();
        this.update_controls();

        this.last_numbers = last_numbers;
        this.fill_last_numbers( this.last_numbers, false );
    },

    can_pull: function() {
        if( this.game_state != this.GAME_STATE_PRE_PULL ) {
            return false;
        }

        if( this.is_user_input_error ) {
            return false;
        }

        return true;
    },

    time_update: function () {
        var that = this;

        this.time_since_blink += this.TIME_UPDATE_DELAY;

        if( this.time_since_blink >= this.BLINK_DELAY ) {
            this.blink_on = !this.blink_on;
            this.time_since_blink = 0;

            if (this.blink_on) {
                $("#control_pull").addClass("bright");
            }
            else {
                $("#control_pull").removeClass("bright");
            }

        }

        window.setTimeout(function () {
            that.time_update();
        }, this.TIME_UPDATE_DELAY);
    },

    call_update_service: function () {
        var that = this;
        if (this.user_is_active) {
            var timestamp = (new Date()).getTime();
            $.ajax({
                url: "/dice/update?last=" + leaderboard_system.last_leaderboard_time + "&chatlast=" + chat_system.last_chatlog_index + "&credit_btc_value=" + this.credit_btc_value + "&_=" + timestamp
            }).done(function (update_result) {
                wowbar_system.handle_update(update_result);
                leaderboard_system.process_leaderboard_data(update_result.leaderboard, false);
                chat_system.process_chatlog(update_result.chatlog, false);
                that.set_progressive_jackpots(update_result.progressive_jackpots);
            });
        }

        window.setTimeout(function () {
            that.call_update_service();
        }, 2000);
    },

    package_pregame_info: function () {
        var inttotalbet = this.input_bet_amount * this.credit_btc_value;

        var p = {
            server_seed_hash           : this.next_server_seed_hash,
            client_seed                : this.client_seed,
            credit_btc_value           : this.credit_btc_value,
            inttotalbet                : inttotalbet,
            payout                     : Math.floor((this.input_bet_payout * 100000000) + 0.5),
            bet_high                   : this.bet_high
        };

        return p;
    },

    package_game_info: function (finish_result) {
        var p = {
            pregame_info               : this.last_pregame_info_package,
            game_id                    : finish_result.game_id,
            unique_id                  : finish_result.unique_id,
            game_seed                  : finish_result.game_seed,
            intwinnings                : finish_result.intwinnings,
            inttotalbet                : finish_result.inttotalbet, // The server will tell us if this is a 'free' game by setting the totalbet to zero
            payout                     : finish_result.payout,
            chance                     : finish_result.chance,
            lucky_number               : finish_result.lucky_number,
            progressive_win            : finish_result.progressive_win,
            bet_high                   : finish_result.target == "high"
        };

        if( account_system.use_fake_credits ) {
            p['unique_id'] = this.games_played;
        }
        return p;
    },

    check_game: function (show_dialog, game_info_package) {
        var proof_error = null;
    
        var proves_server_seed  = false;
        var proves_lucky_number = false;
        var proves_prize        = false;
        var game_is_legit       = false;
    
        // first make sure that our client seed was used in the game seed
        if( game_info_package.game_seed.indexOf(game_info_package.pregame_info.client_seed) != -1 ) {
            // Next, extract the server's seed from the game_seed and SHA-256 it, and make sure the hash matches the hash provided
            // before the hand is dealt.
            var li = game_info_package.game_seed.lastIndexOf(game_info_package.pregame_info.client_seed);
            var server_seed = game_info_package.game_seed.substr(0, li) + game_info_package.game_seed.substr(li + game_info_package.pregame_info.client_seed.length);
            if( SHA256(server_seed) == game_info_package.pregame_info.server_seed_hash ) {
                proves_server_seed = true;
    
                // Next, produce a mersenne twister and pick random numbers for the reel positions and verify them against the numbers from the server
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
            
                // At this point we need to sample 1 number in 0..1000000
                var lucky_number = randrange(twister, 0, 1000000);

                var chance = Math.floor((Bitcoin.string_amount_to_int("100") / Math.floor((game_info_package.pregame_info.payout * 100000000) / this.RULESET['player_return'])) * 10000);

                if( lucky_number == game_info_package.lucky_number && chance == game_info_package.chance && game_info_package.pregame_info.payout == game_info_package.payout ) {
                    proves_lucky_number = true;

                    var prize_if_win = Math.floor((game_info_package.payout * game_info_package.pregame_info.inttotalbet) / Bitcoin.string_amount_to_int("1"));

                    // Because the jackpots are always changing, we can't guarantee them..
                    var intwinnings = game_info_package.intwinnings - game_info_package.progressive_win;

                    var valid_prize = false;
                    if( (!game_info_package.pregame_info.bet_high && lucky_number < chance) || (game_info_package.pregame_info.bet_high && lucky_number >= (1000000 - chance)) ) {
                        valid_prize = (intwinnings == prize_if_win);
                    } else {
                        valid_prize = (intwinnings == 0);
                    }

                    if( valid_prize ) {
                        proves_prize  = true;
                        game_is_legit = true;
                    } else {
                        proof_error = "prize";
                    }
                } else {
                    proof_error = "lucky_number";
                }
            } else {
                proof_error = "server_seed";
            }
        } else {
            proof_error = "client_seed";
        }
    
        if( show_dialog ) {
            this.show_provably_fair_dialog(game_info_package, proves_server_seed, proves_lucky_number, proves_prize);
        }

        return game_is_legit ? true : proof_error;
    },

    show_provably_fair_dialog: function (game_info_package, proves_server_seed, proves_lucky_number, proves_prize) {
        var server_seed = game_info_package.game_seed.replace(game_info_package.pregame_info.client_seed,'');

        // Main game stuff
        $("#provably_fair_gameid").html(game_info_package.game_id);
        $("#provably_fair_server_seed").html(server_seed);
        $("#provably_fair_client_seed").html(game_info_package.pregame_info.client_seed);
        $("#provably_fair_game_seed").html(game_info_package.game_seed);
        $("#provably_fair_chance").html('' + (game_info_package.chance / 10000.0) + '%');
        $("#provably_fair_target").html((game_info_package.pregame_info.bet_high) ? 'Higher than ' + ((1000000 - game_info_package.chance - 1) / 10000.0) : 'Less than ' + (game_info_package.chance / 10000.0));
        $("#provably_fair_payout").html('' + (game_info_package.payout / 100000000.0) + 'x');

        $("#provably_fair_lucky_number").html(game_info_package.lucky_number / 10000.0);

        $("#provably_fair_total_bet").html(Bitcoin.int_amount_to_string(game_info_package.pregame_info.inttotalbet));

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
            $("#provably_fair_proves_lucky_number").css('visibility', 'visible');
            $("#provably_fair_proves_lucky_number").addClass( proves_lucky_number ? "pass" : "fail" );
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

    add_game_to_leaderboard: function (game_info_package) {
        var that = this;
        var timestamp = (new Date()).getTime() / 1000;
        var intwinnings = game_info_package.intwinnings; 
        var inttotalbet = game_info_package.pregame_info.inttotalbet;

        //if( !account_system.use_fake_credits ) {
            var lb = {
                player_ident: account_system.player_ident,
                public_id: account_system.public_id,
                timestamp: timestamp,
                game: "dice",
                gamedata: {
                    "unique_id": game_info_package.unique_id,
                    "intwinnings": game_info_package.intwinnings,
                    "inttotalbet": inttotalbet,
                    "prize": game_info_package.intwinnings,
                    "payout": game_info_package.payout,
                    "chance": game_info_package.chance,
                    "lucky_number": game_info_package.lucky_number,
                    "bet_high": game_info_package.bet_high
                }
            };
            var new_row = leaderboard_system.process_row("mygames", lb, false, false);
            if( game_info_package.intwinnings > 0 ) {
                leaderboard_system.process_row("recent", lb, false, false);
            }

            new_row.find("div.verify_button").on('click', function() {
                that.check_game(true, game_info_package);
            });
        //}

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
    },

    get_pretty_lucky_number: function( num, known_digits ) {
        //  - Note: known_digits also includes the decimal place as a digit
        var num_str = Dice.get_lucky_number_str(num);
        s = "";
        for( var c = 0; c < 7; c++ ) {
            s += "<div class='digit ";
            if( c >= known_digits ) {
                s += "unknown";
            }
            else if( num_str[c] == '7' && c < known_digits ) {
                s += "prog_hit";
            }
            s += "'>";

            if( c == 2 ) {
                s += ".";
            }
            else if( c < known_digits ) {
                s += num_str[c];
            }
            else {
                s += "x";
            }
            s += "</div>";
        }
        return s; 
    },

    animate_lucky_number_reveal: function( finish_result, callback ) {
        var ANIMATE_DELAY = 50;
        that = this;
        function reveal(col) {

            $("#result_lucky_number").html( that.get_pretty_lucky_number( finish_result['lucky_number'], col+1 ) );

            // Don't waste time showing the decimal, just go straight to the next number
            if( col == 1 ) {
                col += 1;
            }

            if( col == that.NUM_DECIMALS ) {
                callback()
            }
            else {
                window.setTimeout( function() {
                    reveal(col+1);
                }, ANIMATE_DELAY);
                
            }
        }    
        if( autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED ) {
            // Skip the reveal stuff in autoplay
            reveal(this.NUM_DECIMALS);
        }
        else { 
            reveal(0);
        }
    },

    finish_game: function (finish_result) {
        var that = this;

        var game_info_package = this.package_game_info(finish_result);

        // must come after package_game_info
        this.set_next_server_seed_hash(finish_result.server_seed_hash);

        // $("#result_lucky_number").html( finish_result['lucky_number'] / 10000 );
        this.animate_lucky_number_reveal( finish_result, function() {
            that.last_numbers = finish_result.last_numbers;
            that.fill_last_numbers( that.last_numbers, autoplay_system.autoplay_phase != autoplay_system.AUTOPLAY_PHASE_STARTED );

            that.add_game_to_leaderboard(game_info_package); 
            that.game_state = that.GAME_STATE_PRE_PULL;
            if(finish_result.intbalance != undefined) {
                account_system.set_btc_balance(finish_result['intbalance'], finish_result['fake_intbalance']);
            }

            if( finish_result.intwinnings > 0 ) {
                window.setTimeout( function() {
                    sound_system.play_sound( "win1" ); 
                }, that.WIN_SOUND_DELAY);
            }

            var credits_won = finish_result.intwinnings / that.credit_btc_value;
            that.is_counting_up = true;

            // Skip the count up if you're in autoplay (since otherwise you won't see the final number)
            var start = 0;
            if( autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED ) {
                start = credits_won;
            } 

            var show_fireworks = Dice.is_rare(finish_result['chance'], finish_result['intwinnings']);
            that.counter_wins_timer_id = that.countup_wins(start, credits_won, show_fireworks, that.WIN_TEXT_WIN, function() {
                that.is_counting_up = false;
                that.calculate_credits();
            });
            
            that.update_controls();
        }); 

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

        var delay = 25;
        var delta = Math.floor(goal / 40);
        if( delta <= 0 ) {
            delta = 1;
        }

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
            url: "/dice/reseed"
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
        if (!this.is_counting_up && (this.game_state == this.GAME_STATE_PRE_PULL)) {
            this.calculate_credits();
        }
    },

    fill_last_numbers: function( last_numbers, slide ) { 
        s = "";
        //last_numbers = last_numbers.slice(0,10);
        // Most recent number is on top, so go backwards in list
        for( var i = last_numbers.length-1; (i >= 0 && i >= last_numbers.length-12); i-- ) {
            extra = "";
            if( slide && i == last_numbers.length-1 ) {
                extra = " id='top_last_number' style='margin-top:-15px;' ";     
            }

            //s += "<div class='last_number " + ( last_numbers[i][1] ? "win" : "lose" ) + "'" + extra + ">";
            //s += num;

            // Show progressive 7 hits instead of win/lose?
            s += "<div class='last_number'" + extra + ">";
            var num_str = Dice.get_lucky_number_str(last_numbers[i][0]);
            for( var c = 0; c < num_str.length; c++ ) {
                s += "<div class='digit ";
                if( num_str[c] == "7" ) {
                    s += "prog_hit";
                }
                s += "'>";
                s += num_str[c];
                s += "</div>";
            }
            s += "<div style='clear:both'></div>";

            s += "</div>";
        }
        $("#last_numbers").html(s);
        
        // Slide in the top number from above the display to its top position
        if( slide ) {
            $("#top_last_number").animate({ 'margin-top': '0px' }, 1000, function() {}); 
        }
    },

    update_controls: function () {

        switch (this.game_state) {
        case this.GAME_STATE_PRE_PULL:
            //$("#control_btc").addClass("clickable");
            $(".throw_button").addClass("on");
            break;
        case this.GAME_STATE_PULLING:
            //$("#control_btc").removeClass("clickable");
            $(".throw_button").removeClass("on");
            break;
        }

        if( !$("#input_bet_payout").is(":focus")) {
            $("#input_bet_payout").val( this.input_bet_payout );
        }
        if( !$("#input_bet_chance").is(":focus")) {
            $("#input_bet_chance").val( this.input_bet_chance );
        }
        if( !$("#input_bet_amount").is(":focus")) {
            $("#input_bet_amount").val( this.input_bet_amount );
        }
        if( !$("#input_bet_profit").is(":focus")) {
            $("#input_bet_profit").val( this.input_bet_profit );
        }



        $("#result_greater_or_less").removeClass("win");
        if( this.pull_result ) {
            if( this.pull_result["target"] == "high" ) {
                $("#result_greater_or_less").html("&gt;");
            }
            else {
                $("#result_greater_or_less").html("&lt;");
            }
            $("#result_cutoff").html( Dice.get_lucky_number_str(Dice.get_win_cutoff( this.pull_result["target"] == "high", this.pull_result["chance"] )));

            if( this.pull_result["intwinnings"] > 0 ) {
                if( this.game_state == this.GAME_STATE_PRE_PULL && this.show_throw_hint == this.THROW_HINT_NONE ) {
                    $("#result_greater_or_less").addClass("win");
                }
                //$("#result_win").html("WIN");
            }
            else {
                //$("#result_win").html("&nbsp;"); 
            }

            if( this.game_state == this.GAME_STATE_PRE_PULL ) {
                //  - +1 to include the decimal place :P
                $("#result_lucky_number").html(this.get_pretty_lucky_number( this.pull_result["lucky_number"], this.NUM_DECIMALS+1)); 
            }
        }

        var int_input_bet_chance = Bitcoin.string_amount_to_int("" + this.input_bet_chance) / 10000;
        if( this.show_throw_hint != this.THROW_HINT_NONE ) {
            $("#result_lucky_number").html(this.get_pretty_lucky_number(0,0)); 
        }
        if( this.show_throw_hint == this.THROW_HINT_HIGH ) {
            $("#result_greater_or_less").html("&gt;");
            $("#result_cutoff").html( Dice.get_lucky_number_str(Dice.get_win_cutoff( true, int_input_bet_chance )));
        }
        else if( this.show_throw_hint == this.THROW_HINT_LOW ) {
            $("#result_greater_or_less").html("&lt;");
            $("#result_cutoff").html( Dice.get_lucky_number_str(Dice.get_win_cutoff( false, int_input_bet_chance )));
        }

        $("#error_box").removeClass("on");
        $("#input_bet_payout").removeClass("error_range");    
        $("#input_bet_chance").removeClass("error_range");    
        $("#input_bet_amount").removeClass("error_range");    
        $("#input_bet_profit").removeClass("error_range");    
        this.is_user_input_error = false;

        var int_input_bet_payout = Bitcoin.string_amount_to_int("" + this.input_bet_payout);
        if( int_input_bet_payout < this.RULESET["minimum_payout"] ) {
            $("#input_bet_payout").addClass("error_range");    
            this.is_user_input_error = true;
        }
        else if( int_input_bet_payout > this.RULESET["maximum_payout"] ) {
            $("#input_bet_payout").addClass("error_range");    
            this.is_user_input_error = true;
        }

        var int_input_bet_chance = Bitcoin.string_amount_to_int("" + this.input_bet_chance);
        if( int_input_bet_chance < this.RULESET["minimum_chance"] ) {
            $("#input_bet_chance").addClass("error_range");    
            this.is_user_input_error = true;
            $("#error_box").addClass("on");
            $("#error_box").html("Chance can not be smaller than " + Bitcoin.int_amount_to_string(this.RULESET["minimum_chance"]) + "%");
        }
        else if( int_input_bet_chance > this.RULESET["maximum_chance"] ) {
            $("#input_bet_chance").addClass("error_range");    
            this.is_user_input_error = true;
            $("#error_box").addClass("on");
            $("#error_box").html("Chance can not be greater than " + Bitcoin.int_amount_to_string(this.RULESET["maximum_chance"]) + "%");
        }

        if( this.input_bet_amount < 1 ) {
            $("#input_bet_amount").addClass("error_range");    
            this.is_user_input_error = true;
            $("#error_box").addClass("on");
            $("#error_box").html("Bet amount must be greater than 0");
        }
        
        if( Math.floor(this.input_bet_amount) != this.input_bet_amount ) {
            $("#input_bet_amount").addClass("error_range");    
            this.is_user_input_error = true;
            $("#error_box").addClass("on");
            $("#error_box").html("Bet amount must be a whole number");
        }

        if( this.input_bet_profit * this.credit_btc_value > this.RULESET["maximum_profit"] ) {
            $("#input_bet_profit").addClass("error_range");    
            this.is_user_input_error = true;
            $("#error_box").addClass("on");
            $("#error_box").html("Profit can not be bigger than " + this.RULESET["maximum_profit"]/this.credit_btc_value + " credits");
        }


        //  DICE - Bet high says >50.5 but it should say >50.4999!!!
        // Dividing by 100 to normalize the percentage
        //  - Hmmm no I'm dividing by 100X that... why do I need to do that...?
        var intchance = Bitcoin.string_amount_to_int(""+ this.input_bet_chance) / 10000;
        $("#throw_button_high .hint").html("> " +  Dice.get_lucky_number_str(Dice.get_win_cutoff(true, intchance)));
        $("#throw_button_low .hint").html("< " + Dice.get_lucky_number_str(Dice.get_win_cutoff(false, intchance)));

        $("#bet_text").html("BET " + this.input_bet_amount);

        $(".throw_button").removeClass("clickable");
        if( this.can_pull() ) {
            $(".throw_button").addClass("clickable");
        }

        // In autoplay, just disable all the buttons.
        if (autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED || autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING) {
            //$("#control_btc").removeClass("clickable"); 
            $(".throw_button").removeClass("on");
            $(".throw_button").removeClass("clickable");
        }
        else {

        }
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
        $("#autoplay_mode_martingale_speed option:selected").removeAttr("selected");
        $("#autoplay_mode_repeat_speed option:selected").removeAttr("selected");

        $($("#autoplay_mode_martingale_speed option")[autoplay_system.autoplay_speed]).prop('selected', true);
        $($("#autoplay_mode_repeat_speed option")[autoplay_system.autoplay_speed]).prop('selected', true);

        $("#autoplay_mode_martingale_target option:selected").removeAttr("selected");
        $("#autoplay_mode_repeat_target option:selected").removeAttr("selected");

        $($("#autoplay_mode_martingale_target option")[this.autoplay_target]).prop('selected', true);
        $($("#autoplay_mode_repeat_target option")[this.autoplay_target]).prop('selected', true);

        $("#autoplay_dialog .options_container").hide();
        $(".autoplay_mode_item.selected .options_container").show();
    },

    handle_autoplay_start: function () {
        this.last_progressive_jackpot = null; 
        //  - Remember the original bet amount so we can return to it when we stop
        this.autoplay_input_bet_amount = this.input_bet_amount;
        this.autoplay_starting_credits = this.num_credits;

        var p = $("#autoplay_dialog .autoplay_mode_item.selected").attr('id');
        if( p == 'autoplay_mode_martingale' ) {
            this.autoplay_strategy = this.AUTOPLAY_STRATEGY_MARTINGALE;
        } else if( p == 'autoplay_mode_repeat' ) {
            this.autoplay_strategy = this.AUTOPLAY_STRATEGY_REPEAT;
        }

        if( this.autoplay_strategy == this.AUTOPLAY_STRATEGY_MARTINGALE ) {
            var trimmed = $.trim($("#autoplay_mode_martingale_bet_multiplier").val());
            var bet_multiplier = parseInt(trimmed);
            if( isNaN(bet_multiplier) || bet_multiplier < 1 ) {
                alert("The loss multiplier is invalid. It must be at least 1.");
                return;
            }
            var bet_multiplier_float = parseFloat(trimmed);
            if( Math.floor(bet_multiplier_float) != bet_multiplier_float ) {
                alert("The loss multiplier is invalid. It must be a whole number.");
                return;
            }

            var max_win_str = $.trim($("#autoplay_mode_martingale_max_win").val());
            var max_win = 0;
            if( max_win_str.length  > 0 ) {
                max_win = parseInt(max_win_str);
                if( isNaN(max_win) || max_win < 0 ) {
                    alert("Max Win is invalid. It must be blank or at least 1.");
                    return;
                }
            }

            var max_loss_str = $.trim($("#autoplay_mode_martingale_max_loss").val());
            var max_loss = 0;
            if( max_loss_str.length  > 0 ) {
                max_loss = parseInt(max_loss_str);
                if( isNaN(max_loss) || max_loss < 0 ) {
                    alert("Max Loss is invalid. It must be blank or at least 1.");
                    return;
                }
            }


            // We also check to see if the value is somewhat sane
            //if( (bet_multiplier * 2) > table_limit || (bet_multiplier * 4) > table_limit ) {
            //    if( !confirm("The starting bet you specified cannot be doubled too many times before hitting the table limit. Are you sure you want to use this bet size?") ) {
            //        return;
            //    }
            //}

            this.autoplay_martingale_bet_multiplier = bet_multiplier;
            this.autoplay_martingale_max_win = max_win;
            this.autoplay_martingale_max_loss = max_loss;
            this.autoplay_martingale_starting_bet = this.credit_btc_value * this.input_bet_amount;
        }

        if( this.autoplay_strategy == this.AUTOPLAY_STRATEGY_REPEAT ) {
            // nothing to do?
        }

        this.autoplay_martingale_bet = null;

        autoplay_system.autoplay_start(false);
        $("#autoplay_dialog").trigger("close");
        this.update_controls();
    },

    handle_pull: function (e, highlow) {

        var that = this;
        if( !this.can_pull() ) {
            return;
        }

        //  - What was the point of this code??? (taken from craps)
        if (e != undefined) e.preventDefault();

        // this.client_seed = get_client_seed(); 
        if( !this.check_client_seed() ) {
            return;
        }

        var bet_size = this.credit_btc_value * this.input_bet_amount;
        var bet_string = "bet=" + bet_size;
        // Use the bitcoin function to avoid floating point rounding errors.
        var payout_string = "payout=" + Bitcoin.string_amount_to_int("" + this.input_bet_payout);
        var target_string = "target=" + highlow;
        this.bet_high = (highlow == "high");
        use_fake_credits_string = "use_fake_credits=" + account_system.use_fake_credits;

        // Check balance
        if( bet_size > account_system.get_active_btc_int_balance()) {
            account_system.show_no_credits_dialog();
            return;
        }

        this.num_credits -= this.input_bet_amount;

        this.update_credits(); 
        this.game_state = this.GAME_STATE_PULLING;
        this.stop_countup_wins();

        sound_system.play_sound("pay_coins");
        // Forcing hint mode will show the current proposed bet with the xx.xxxx stuff. Then just clear it when we get a result.
        this.show_throw_hint = highlow == "high" ? this.THROW_HINT_HIGH : this.THROW_HINT_LOW;
        this.update_controls();

        this.client_seed = $("#next_client_seed").val();
        $("#next_client_seed").prop('disabled', true);

        this.last_pregame_info_package = this.package_pregame_info();
        $.ajax({
            url: "/dice/throw?server_seed_hash=" + this.next_server_seed_hash + "&client_seed=" + this.client_seed + "&" + bet_string + "&" + payout_string + "&" + target_string + "&" + use_fake_credits_string
        }).done(function (pull_result) {
            that.show_throw_hint = that.THROW_HINT_NONE;
            if (pull_result['error'] != null) {
                that.game_state = that.GAME_STATE_PRE_PULL;
                if (pull_result['error'] == "insufficient_funds") {
                    account_system.show_no_credits_dialog();
                } else if (pull_result['error'] == 'shutting_down') {
                    account_system.show_shutting_down_dialog();
                } else if (pull_result['error'] == 'need_seed') {
                    that.num_credits += this.credit_btc_value;
                    that.update_credits();
                    that.reseed(function () {
                        that.handle_pull(e, highlow);
                    });
                }
                else {
                    alert("Internal server error. Please try again later. (" + pull_result['error'] + ")");
                }
                return;
            }
            that.pull_result = pull_result;
            that.finish_game(pull_result);
            that.last_progressive_jackpot = pull_result.progressive_win; 
            that.set_progressive_jackpots( pull_result.progressive_jackpots );

            account_system.shutting_down(pull_result['shutdown_time'], false);
            if (pull_result.shutdown_time != undefined && pull_result.shutdown_time != 0) {
                account_system.shutting_down(pull_result.shutting_down);
            }

        }).fail(function () {
            that.game_state = that.GAME_STATE_PRE_PULL;
            that.show_throw_hint = that.THROW_HINT_NONE;
            that.update_controls();
            that.num_credits += that.input_bet_amount;
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
                if( $(".input_bet").is(":focus")) {
                    return false;
                }

                //  - Disable backspace mapping to back button, so that users in incognito aren't screwed and lose their account_key.
                return true;
            case 9: //tab
                return true;
            //  - We can't just check for enter since we need to specify high/low
            //  - We just need to check for the ascii low-value upper case letters since shift is interpreted separately.
            //  - Adding "h" will cause this code to fire if num_pad-8 is pressed!

            // Payout
            case "Q".charCodeAt(0):
                this.handle_input_bet_payout_button( parseFloat(Bitcoin.int_amount_to_string(this.RULESET['minimum_payout'])) );
                return true;
            case "W".charCodeAt(0):
                this.handle_input_bet_payout_button(this.input_bet_payout-1);
                return true;
            case "E".charCodeAt(0):
                this.handle_input_bet_payout_button(this.input_bet_payout+1);
                return true;
            case "R".charCodeAt(0):
                this.handle_input_bet_payout_button( parseFloat(Bitcoin.int_amount_to_string(this.RULESET['maximum_payout'])) );
                return true;

            // Chance
            case "A".charCodeAt(0):
                this.handle_input_bet_chance_button( parseFloat(Bitcoin.int_amount_to_string(this.RULESET['minimum_chance'])) );
                return true;
            case "S".charCodeAt(0):
                this.handle_input_bet_chance_button(this.input_bet_chance-1);
                return true;
            case "D".charCodeAt(0):
                this.handle_input_bet_chance_button(this.input_bet_chance+1);
                return true;
            case "F".charCodeAt(0):
                this.handle_input_bet_chance_button( parseFloat(Bitcoin.int_amount_to_string(this.RULESET['maximum_chance'])) );
                return true;

            // Bet
            case "Z".charCodeAt(0):
                this.handle_input_bet_amount_button( Math.floor(this.input_bet_amount/2) );
                return true;
            case "X".charCodeAt(0):
                this.handle_input_bet_amount_button(this.input_bet_amount-1);
                return true;
            case "C".charCodeAt(0):
                this.handle_input_bet_amount_button(this.input_bet_amount+1);
                return true;
            case "V".charCodeAt(0):
                this.handle_input_bet_amount_button(this.input_bet_amount*2);
                return true;

            case "H".charCodeAt(0):
                this.handle_pull(ev, "high");
                return true;
            case "L".charCodeAt(0):
                this.handle_pull(ev, "low");
                return true;
        }
        return false;
    },

    get_input_value: function( id ) {
        var str = $(id).val();
        for( var i = 0; i < str.length; i++ ) {
            if( (str[i] < '0' || str[i] > '9') && str[i] != "." ) {
                $(id).addClass("error");
                return -1;
            }
        }

        var new_value = parseFloat(str);

        $(id).removeClass("error"); 
        if( isNaN(new_value) ) {
            if( str != '' ) $(id).addClass("error");
            return -1;
        } 
        
        return new_value; 
    },

    pretty_float_4: function(val) {
        return Math.floor(val * 10000) / 10000;
    },
    pretty_float_8: function(val) {
        return Math.floor(val * 100000000) / 100000000;
    },

    // PAYOUT
    recalc_input_bet_payout: function() {
        this.input_bet_chance = this.pretty_float_4( (this.RULESET['player_return'] / 1000000) / this.input_bet_payout );

        this.input_bet_profit = this.pretty_float_8( this.input_bet_payout * this.input_bet_amount - this.input_bet_amount );
        this.update_controls();
    },
    handle_input_bet_payout_button: function( new_value ) {
        //  DICE - Get the payout range from RULESET!

        var int_new_value = Bitcoin.string_amount_to_int("" + new_value);
        if( int_new_value > this.RULESET['maximum_payout'] ) {
            new_value = Bitcoin.int_amount_to_string(this.RULESET['maximum_payout']);
            new_value = parseFloat(new_value);
        } 
        else if( int_new_value < this.RULESET['minimum_payout'] ) {
            new_value = Bitcoin.int_amount_to_string(this.RULESET['minimum_payout']);
            new_value = parseFloat(new_value);
        }

        this.input_bet_payout = new_value;
        //  DICE - check ranges
        this.recalc_input_bet_payout();
    },
    handle_input_bet_payout: function() {
        var new_value = this.get_input_value( "#input_bet_payout" );
        if( new_value == -1 ) {
            return;
        }

        this.input_bet_payout = new_value;
        this.recalc_input_bet_payout();
    },

    // CHANCE
    recalc_input_bet_chance: function() {

        //  - Show the full 8 decimal places for autogenerated numbers
        this.input_bet_payout = this.pretty_float_8((this.RULESET['player_return'] / 1000000) / this.input_bet_chance);

        this.input_bet_profit = this.pretty_float_8( this.input_bet_payout * this.input_bet_amount - this.input_bet_amount);
        this.update_controls();
    },

    handle_input_bet_chance_button: function(new_value) {
        var int_new_value = Bitcoin.string_amount_to_int("" + new_value);
        if( int_new_value > this.RULESET['maximum_chance'] ) {
            new_value = Bitcoin.int_amount_to_string(this.RULESET['maximum_chance']);
            new_value = parseFloat(new_value);
        } 
        else if( int_new_value < this.RULESET['minimum_chance'] ) {
            new_value = Bitcoin.int_amount_to_string(this.RULESET['minimum_chance']);
            new_value = parseFloat(new_value);
        }

        this.input_bet_chance = new_value;
        this.recalc_input_bet_chance();
    },

    handle_input_bet_chance: function() {
        var new_value = this.get_input_value( "#input_bet_chance" );
        if( new_value == -1 ) {
            return;
        }

        this.input_bet_chance = new_value;
        this.recalc_input_bet_chance();
    },


    
    // AMOUNT
    recalc_input_bet_amount: function() {
        this.input_bet_profit = this.pretty_float_8( this.input_bet_payout * this.input_bet_amount - this.input_bet_amount ); 
        this.update_controls();
    },
    handle_input_bet_amount_button: function(new_value) {
        if( new_value <= 1 ) {
            new_value = 1;
        }
        else if( new_value > this.num_credits ) {
            new_value = this.num_credits;
        }
        if(new_value % 1 != 0) {
            new_value = Math.trunc(new_value);
        }
        this.input_bet_amount = new_value;
        this.recalc_input_bet_amount();
    }, 
    handle_input_bet_amount: function() {
        var new_value = this.get_input_value( "#input_bet_amount" );
        if( new_value == -1 ) {
            return;
        }

        this.input_bet_amount = new_value;
        this.recalc_input_bet_amount();
    },



    // PROFIT
    handle_input_bet_profit: function() {
        var new_value = this.get_input_value( "#input_bet_profit" );
        if( new_value == -1 ) {
            return;
        }

        this.input_bet_profit = new_value;
        this.input_bet_amount = this.pretty_float_4( (this.input_bet_profit / (this.input_bet_payout - 1.0) ));

        this.update_controls();
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

        $("#throw_button_high").click(function (e) {
            that.handle_pull(e, "high");
        });
        $("#throw_button_low").click(function (e) {
            that.handle_pull(e, "low");
        });

        $("#control_autoplay").click(function () {
            that.handle_auto();
        });

        $("#autoplay_dialog .autoplay_start_image").click(function () {
            that.handle_autoplay_start();
        });

        $(window).on('beforeunload', function () {
            if (that.game_state != that.GAME_STATE_PRE_PULL ||
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED ||
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING) {
                return 'You are in the middle of a game.  If you leave, you will be forfeiting your bet.'
            }
        });

        $("#autoplay_mode_martingale_table_limit").change(function() {
            that.autoplay_martingale_table_limit = parseInt($(this).children(":selected").val());
        });

        $("#autoplay_mode_martingale_target").change(function() {
            that.autoplay_target = parseInt($(this).children(":selected").val());
        });

        $("#autoplay_mode_repeat_target").change(function() {
            that.autoplay_target = parseInt($(this).children(":selected").val());
        });

        var autoplay_speed_changed = function (option) {
            autoplay_system.autoplay_speed = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_martingale_speed").change(function () { autoplay_speed_changed($(this)); });
        $("#autoplay_mode_repeat_speed").change(function () { autoplay_speed_changed($(this)); });

        $(".autoplay_mode_item").click( function() {
            $("#autoplay_dialog .autoplay_mode_item").removeClass("selected");
            $(this).addClass("selected");
            that.set_autoplay_options();
        });

        $(document).keydown(function (ev) {
            if (!$("input").is(":focus") && that.handle_keypress(ev)) {
                ev.preventDefault();
            }
        });
        
        // PAYOUT
        $("#input_button_payout_min").click( function(ev) {
            that.handle_input_bet_payout_button( parseFloat(Bitcoin.int_amount_to_string(that.RULESET['minimum_payout'])) );
        });
        $("#input_button_payout_max").click( function(ev) {
            that.handle_input_bet_payout_button( parseFloat(Bitcoin.int_amount_to_string(that.RULESET['maximum_payout'])) );
        });
        $("#input_button_payout_minus1").click( function(ev) {
            that.handle_input_bet_payout_button(that.input_bet_payout-1);
        });
        $("#input_button_payout_plus1").click( function(ev) {
            that.handle_input_bet_payout_button(that.input_bet_payout+1);
        });
        $("#input_bet_payout").keyup( function(ev) {
            that.handle_input_bet_payout();
        });

        // CHANCE
        $("#input_button_chance_min").click( function(ev) {
            that.handle_input_bet_chance_button( parseFloat(Bitcoin.int_amount_to_string(that.RULESET['minimum_chance'])) );
        });
        $("#input_button_chance_max").click( function(ev) {
            that.handle_input_bet_chance_button( parseFloat(Bitcoin.int_amount_to_string(that.RULESET['maximum_chance'])) );
        });
        $("#input_button_chance_minus1").click( function(ev) {
            that.handle_input_bet_chance_button(that.input_bet_chance-1);
        });
        $("#input_button_chance_plus1").click( function(ev) {
            that.handle_input_bet_chance_button(that.input_bet_chance+1);
        });
        $("#input_bet_chance").keyup( function(ev) {
            that.handle_input_bet_chance();
        });

        // AMOUNT 
        $("#input_button_amount_div2").click( function(ev) {
            that.handle_input_bet_amount_button( Math.floor(that.input_bet_amount/2) );
        });
        $("#input_button_amount_plus1").click( function(ev) {
            that.handle_input_bet_amount_button(that.input_bet_amount+1);
        });
        $("#input_button_amount_minus1").click( function(ev) {
            that.handle_input_bet_amount_button(that.input_bet_amount-1);
        });
        $("#input_button_amount_mul2").click( function(ev) {
            that.handle_input_bet_amount_button(that.input_bet_amount*2);
        });
        $("#input_button_amount_max").click( function(ev) {
            var maxBet = that.RULESET["maximum_profit"]/that.credit_btc_value;
            that.handle_input_bet_amount_button( maxBet );
        });
        $("#input_bet_amount").keyup( function(ev) {
            that.handle_input_bet_amount();
        });

        $("#throw_button_high").mouseenter( function(e) {
            if( !that.can_pull() ) {
                return;
            }
            that.show_throw_hint = that.THROW_HINT_HIGH;
            that.update_controls();
        });
        $("#throw_button_low").mouseenter( function(e) {
            if( !that.can_pull() ) {
                return;
            }
            that.show_throw_hint = that.THROW_HINT_LOW;
            that.update_controls();
        });
        $(".throw_button").mouseleave( function(e) {
            that.show_throw_hint = that.THROW_HINT_NONE;
            that.update_controls();
        });


        $("#input_bet_profit").keyup( function(ev) {
            that.handle_input_bet_profit();
        });

        /*
        $("#control_btc").click( function() {
        	if( that.game_phase != that.GAME_PHASE_PRE_PULL ) {
                return; 
            }
            
            $('#btc_credit_dialog').lightbox_me({
                centered: true,
                onLoad: function() { 
                
                }
            }); 
            
        });

        $("#btc_credit_dialog .btc_item").click( function() {
            $(".btc_item").removeClass("selected");
            $(this).addClass("selected");
            
    		window.setTimeout(function() { 
                $("#btc_credit_dialog").trigger("close");
            }, 250);

            $("#control_btc").removeClass();
            $("#control_btc").addClass("btc_token");
            //$("#control_btc").addClass("clickable");
            id = $(this).attr("id");
            if( id == "btc_item_0001" ) {
                $("#control_btc").addClass("btc_token_0001");
                that.credit_btc_value = 10000; // "0.0001" BTC
            }
            else if( id == "btc_item_001" ) {
                $("#control_btc").addClass("btc_token_001");
                that.credit_btc_value =  100000; // "0.001" BTC
            }
            else if( id == "btc_item_005" ) {
                $("#control_btc").addClass("btc_token_005");
                that.credit_btc_value =  500000; // "0.005" BTC
            }
            else if( id == "btc_item_01" ) {
                $("#control_btc").addClass("btc_token_01");
                that.credit_btc_value =  1000000; // "0.01" BTC
            }
            else {
                alert("Unknown BTC/credit value.");
                return false;
            }
            that.calculate_credits();

            // Tell server!
        	$.ajax({
        		url: "account/set_credit_btc_value?credit_btc_value=" + that.credit_btc_value + "&game=dice"
        	}).done(function(withdrawal_result) { 
        	    // Do nothing
        	});
            
            return false;

        });
        */

    },

    set_progressive_jackpots: function(jackpots) {

        // We can just check if 6 hits jackpot has changed, since if one of them has changed, they all have.
        var new6 = jackpots[this.NUM_DECIMALS];
        if( this.progressive_jackpot == new6 ) {
            return;
        }

        if(this.progressive_jackpot_timeout_id == undefined || this.progressive_jackpot_timeout_id == null) {
            var delay = 250 + Math.random() * 500;
            if( this.progressive_jackpot == null ) {
                delay = 0;
            }

            var that = this;
            this.progressive_jackpot_timeout_id = window.setTimeout( function() { 
                for( var hits = 5; hits <= that.NUM_DECIMALS; hits++ ) {
                    var new_value = jackpots[hits];
                    var credits_for_jackpot = 5;

                    var frac = Math.floor((new_value % 10000) / 100.0);
                    var dec  = Math.floor(new_value / 10000.0);

                    if( frac < 10 ) {
                        frac = '0' + frac;
                    }

                    $("#progressive_jackpot" + hits).css({ opacity: 0.2 });
                    $("#progressive_jackpot" + hits).html( '' + dec + '.' + frac );
                    $("#progressive_jackpot" + hits).animate({ opacity: 1.0 }, 500, function() {
                        that.progressive_jackpot_timeout_id = null;
                    }); 
	                var m = 0;
					if (that.credit_btc_value == 10000) {
		                m = 0.0001;
		            }
		            else if (that.credit_btc_value == 100000) {
		                m = 0.001;
		            }
		            else if (that.credit_btc_value == 500000) {
		                m = 0.005;
		            }
		            else if (that.credit_btc_value == 1000000) {
		                m = 0.01;
		            }
					var jackpot_total = m * parseFloat(dec + '.' + frac);
                    that.display_jackpot(jackpot_total, parseFloat(dec + '.' + frac));
	                }
                that.progressive_jackpot = new6;
            }, delay );
        }

    },

});

function init_dice(key, my_player_ident, my_public_id, starting_server_seed_hash, initial_leaderboards, initial_mygames, chatlog, ruleset, credit_btc_value, sound_volume, last_numbers ) {
    //  - Only load the sounds that we actually end up using!
    var sound_list = [ 
        ['boop', 'boop.wav', true, 1],
        ['win_scatter', 'slot_machine_win_22.wav', false, 1],
        ['win1', 'win1.wav', false, 1],
        ['pay_coins', 'coinpay.wav', false, 1],
        ['play_free_game', 'slot_machine_bet_10.wav', false, 1],
    ];
    common_init( 'Dice', key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, chatlog, sound_list, sound_volume );
    
    game_system = new DiceSystem( starting_server_seed_hash, ruleset, credit_btc_value, last_numbers );
    game_system.call_update_service();

    dialog_system.init_help( ["/static/images/dice_htp.png" ] ); 

    //we need to resize chat again, since blackjack does some progressive table size changing..
    chat_system.adjust_height(false);
}



