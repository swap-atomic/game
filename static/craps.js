var CrapsSystem = GameSystem.extend( {
    init: function( starting_server_seed_hash, ruleset, default_progressive_bet, last_rolls ) {
        //  - Need a correct value for credits_btc_value_in!
        //  - Why is the order of the games list not consistent?
        this._super('craps', starting_server_seed_hash, 10000, ['blackjack', 'videopoker', 'roulette', 'craps']);

        this.default_num_credit_decimals = 1;
        
        this.GAME_STATE_PRE_ROLL = 0;
        this.GAME_STATE_ROLLING = 1;
        this.GAME_STATE_PICKUPING = 2;
        this.game_state = this.GAME_STATE_PRE_ROLL;

        this.AUTOPLAY_STRATEGY_BASIC = 0;
        
        this.RULESET = ruleset;

        this.init_handlers();

        for( var i = 3; i < this.RULESET.progressive_paytable.length-1; i++ ) {
            $("#progressive_value" + i).html(this.RULESET.progressive_paytable[i]);
        }

        this.progressive_jackpot = 0;
        this.progressive_jackpot_timeout_id = null;
        this.last_progressive_hand = null;
        this.roll_result = { 'current_bets':[] };

        this.bets = {};
        this.bet = 0;
        this.update_progressive_label_widths();
        this.last_bets = {};
        this.last_bet = 0;
        this.set_progressive_bet(default_progressive_bet);
        this.credit_btc_value = Bitcoin.string_amount_to_int("0.0001");
        this.bet_per_click = this.credit_btc_value;
        this.current_session_id = null;
        this.is_counting_up = false;
        this.selected_bet = null;
        this.set_point(null);
        this.set_dice([3,4]);

        this.reset_for_roll();
        this.time_update();
        this.update_controls();
        this.can_roll = false;
        this.format_payouts_table();
        
        this.AUTOPLAY_MODE_BASIC_PLAY_STYLE_PASS = 0;
        this.AUTOPLAY_MODE_BASIC_PLAY_STYLE_DONT_PASS = 1;
        this.autoplay_mode_basic_play_style = this.AUTOPLAY_MODE_BASIC_PLAY_STYLE_PASS;
        this.autoplay_mode_basic_numbers_to_cover = 3;

        this.AUTOPLAY_MODE_BASIC_TAKE_ODDS_NEVER = 0;
        this.AUTOPLAY_MODE_BASIC_TAKE_ODDS_PASS = 1;
        this.AUTOPLAY_MODE_BASIC_TAKE_ODDS_COME = 2;
        this.AUTOPLAY_MODE_BASIC_TAKE_ODDS_ALWAYS = 3;
        this.autoplay_mode_basic_take_odds = this.AUTOPLAY_MODE_BASIC_TAKE_ODDS_ALWAYS;
        
        //other variables
        //the_point : current point of the game aka the puck at top
        
        this.set_bet_per_click(1);
        this.flash_legal_bets();

        if (this.get_is_guide_on()) {
            $("#guidance_control").addClass("selected");
        } else {
            $("#guidance_control").removeClass("selected");
        }
    },
    
    time_update: function() {
        var that = this;
        this.blink_on = !this.blink_on;
        
        if( this.blink_on ) {
            if( this.can_roll ) {
                $("#control_roll").addClass("bright");
            }
            $(".sixes_name.win").addClass("blink");
            $(".sixes_value.win").addClass("blink");
            
            if( this.roll_result != null && this.roll_result.progressive_hand >= 3 ) {
                $(".big_die.progressive_six").addClass("blink");
            }
        }
        else {
            $("#control_roll").removeClass("bright");
            $(".sixes_name.win").removeClass("blink");
            $(".sixes_value.win").removeClass("blink");
            
            $(".big_die").removeClass("blink");
        } 
        
        window.setTimeout( function() {
            that.time_update();
        }, this.BLINK_DELAY );
    },

    call_update_service: function() {
        var that = this;
        if (this.user_is_active) {
            var timestamp = (new Date()).getTime();
            $.ajax({
            	url: "/craps/update?progressive_bet=" + this.progressive_bet + "&last=" + leaderboard_system.last_leaderboard_time + "&chatlast=" + chat_system.last_chatlog_index + "&_=" + timestamp
            }).done(function(update_result) { 
                wowbar_system.handle_update(update_result);

                leaderboard_system.process_leaderboard_data( update_result.leaderboard, false );
                chat_system.process_chatlog( update_result.chatlog, false );

                that.set_progressive_jackpot(update_result.progressive_jackpot);
            });
        }
        
        window.setTimeout( function() {
            that.call_update_service();
        }, 2000 );
    },
    
    reset_for_roll: function() {
        // TODO craps
        this.current_progressive_bet = this.progressive_bet;
        return;

        this.update_bet_text();
        this.update_controls();
        
        //  - Make these variable names compatible with videopoker
        this.current_game_id = null;
        this.current_unique_id = null;
        this.current_progressive_bet = this.progressive_bet;

        this.counter_wins_timer_id = null;
    },

    package_game_info: function(finish_result) {
        var p = {
            session_id                 : finish_result.session_id,
            unique_id                  : finish_result.unique_id,
            rolled_numbers             : finish_result.rolled_numbers,
            made_bets                  : clone(this.bets),
            current_bets               : clone(this.saved_bets),
            post_roll_bets             : clone(finish_result.current_bets),
            commission                 : this.saved_commission,
            server_seed_hash           : this.next_server_seed_hash,
            client_seed                : this.client_seed,
            game_seed                  : finish_result.game_seed,
            losing_bets                : finish_result.losing_bets,
            intlost                    : finish_result.intlost,
            total_bet                  : this.last_bet + this.current_progressive_bet,
            progressive_bet            : this.current_progressive_bet,
            intwinnings                : finish_result.intwinnings,
            server_reported_prizes     : clone(finish_result.prizes),
            progressive_win            : finish_result.progressive_win,
            progressive_hand           : finish_result.progressive_hand,
            last_rolls                 : finish_result.last_rolls,
            the_point                  : this.the_point,
            the_next_point             : finish_result.the_point
        };
        if( account_system.use_fake_credits ) {
            p['unique_id'] = this.games_played;
        }
        return p;
    },

    check_game: function(show_dialog, game_info_package) {
        var proof_error = null;
    
        var proves_server_seed = false;
        var proves_dice        = false;
        var proves_prizes      = false;
        var game_is_legit      = false;
    
        // first make sure that our client seed was used in the game seed
        if( game_info_package.game_seed.indexOf(game_info_package.client_seed) != -1 ) {
            // Next, extract the server's seed from the game_seed and SHA-256 it, and make sure the hash matches the hash provided
            // before the hand is dealt.
            var li = game_info_package.game_seed.lastIndexOf(game_info_package.client_seed);
            var server_seed = game_info_package.game_seed.substr(0, li) + game_info_package.game_seed.substr(li + game_info_package.client_seed.length);
            if( SHA256(server_seed) == game_info_package.server_seed_hash ) {
                proves_server_seed = true;
    
                // Next, produce a mersenne twister and pick a random number and verify the dice we got from the server
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
        
                // At this point all we need to do is draw 2 (or 6) dice
                var rolled_numbers = new Array();
                var valid_numbers  = true;
                var progressive_hand = 0;
                for( var i = 0; i < (game_info_package.progressive_bet != 0 ? 6 : 2); i++ ) {
                    rolled_numbers.push(randrange(twister, 1, 7));
                    if( rolled_numbers[i] != game_info_package.rolled_numbers[i] ) {
                        valid_numbers = false;
                    }
                    if( rolled_numbers[i] == 6 ) progressive_hand += 1;
                }
        
                // This verifies the dice provided by the server are correct.
                if( valid_numbers ) {
                    proves_dice = true;

                    var progressive_win_is_correct = true;
                    var progressive_win = this.RULESET['progressive_paytable'][progressive_hand] * game_info_package.progressive_bet;

                    // We can only validate the standard wins in the progressive; the jackpot is changing too frequently to prove anything.
                    if( progressive_win >= 0 && game_info_package.progressive_win != progressive_win ) {
                        progressive_win_is_correct = false;
                    } else if( progressive_win < 0 ) {
                        progressive_win = 0;
                    }

                    if( progressive_win_is_correct ) {
                        var rolled = rolled_numbers[0] + rolled_numbers[1];

                        // Now we need to get all the table changes based on this dice roll and apply them, then verify everything the server told us.
                        var result = Craps.get_winning_and_losing_bets_for_roll(game_info_package.the_point, rolled_numbers[0], rolled_numbers[1]);

                        var current_bets = clone(game_info_package.current_bets);
                        var prizes = {};
                        for( var winning_bet in result.winning_bets ) {
                            if( winning_bet in current_bets && current_bets[winning_bet] > 0 ) {
                                var odds = result.winning_bets[winning_bet];
                                var bet_amount = current_bets[winning_bet];
                                if(!(winning_bet in prizes)) prizes[winning_bet] = 0;
                                prizes[winning_bet] += Math.floor(odds[0] * (bet_amount / odds[1])) + bet_amount
                                delete current_bets[winning_bet];
                            }
                        }

                        var lost_bets = {};
                        var lost_amount = game_info_package.commission;
                        for( var losing_bet in result.losing_bets ) {
                            if( losing_bet in current_bets && current_bets[losing_bet] > 0 ) {
                                var bet_amount = current_bets[losing_bet];
                                lost_amount += bet_amount;
                                delete current_bets[losing_bet];
                                lost_bets[lost_bets] = bet_amount;
                            }
                        }

                        var pushed_bets = {};
                        var pushed_amount = 0;
                        for( var pushed_bet in result.pushed_bets ) {
                            if( pushed_bet in current_bets && current_bets[pushed_bet] > 0 ) {
                                var bet_amount = current_bets[pushed_bet];
                                if(!(pushed_bet in prizes)) prizes[pushed_bet] = 0;
                                prizes[pushed_bet] += bet_amount;
                                delete current_bets[pushed_bet];
                                pushed_bets[pushed_bet] = bet_amount;
                            }
                        }

                        var win_amount = 0;
                        for( var t in prizes ) {
                            win_amount += prizes[t];
                        }

                        var current_bets_are_good = true;

                        // Before checking current bets, we need to move any Come and Don't Come bets to a hit number.
                        var the_next_point = game_info_package.the_point;
                        if( rolled == 4 || rolled == 5 || rolled == 6 || rolled == 8 || rolled == 9 || rolled == 10 ) {
                            if( game_info_package.the_point != null ) {
                                if( game_info_package.the_point == rolled ) {
                                    the_next_point = null;
                                }

                                if( "C" in current_bets ) {
                                    var t = "C" + rolled;
                                    if( t in current_bets ) {
                                        current_bets[t] += current_bets["C"];
                                    } else {
                                        current_bets[t]  = current_bets["C"];
                                    }
                                    delete current_bets["C"];
                                }

                                if( "DC" in current_bets ) {
                                    var t = "DC" + rolled;
                                    if( t in current_bets ) {
                                        current_bets[t] += current_bets["DC"];
                                    } else {
                                        current_bets[t]  = current_bets["DC"];
                                    }
                                    delete current_bets["DC"];
                                }
                            } else if( game_info_package.the_point == null ) {
                                the_next_point = rolled;
                            }
                        } else if ( rolled == 7 ) {
                            the_next_point = null;
                        }

                        if(the_next_point != game_info_package.the_next_point) current_bets_are_good = false;

                        if(current_bets_are_good) {
                            for( var current_bet in current_bets ) {
                                if( !(current_bet in game_info_package.post_roll_bets) || (game_info_package.post_roll_bets[current_bet] != current_bets[current_bet]) ) {
                                    current_bets_are_good = false;
                                    break;
                                }
                            }
                        }

                        if(current_bets_are_good) {
                            for( var current_bet in game_info_package.post_roll_bets ) {
                                if( !(current_bet in current_bets) || (game_info_package.post_roll_bets[current_bet] != current_bets[current_bet])) {
                                    current_bets_are_good = false;
                                    break;
                                }
                            }
                        }

                        var prizes_are_good = true;
                        for( var bet_id in prizes ) {
                            if( !(bet_id in game_info_package.server_reported_prizes) || (game_info_package.server_reported_prizes[bet_id] != prizes[bet_id]) ) {
                                prizes_are_good = false;
                                break;
                            }
                        }

                        if(prizes_are_good) {
                            for( var bet_id in game_info_package.server_reported_prizes ) {
                                if( !(bet_id in prizes) || (game_info_package.server_reported_prizes[bet_id] != prizes[bet_id])) {
                                    prizes_are_good = false;
                                    break;
                                }
                            }
                        }

                        var lost_is_correct = (lost_amount == game_info_package.intlost);

                        // An intwinnings at least as big as win_amount and progressive_win is sufficient
                        var winnings_is_correct = (game_info_package.intwinnings >= (win_amount + progressive_win));

                        if( lost_is_correct && winnings_is_correct && prizes_are_good && current_bets_are_good ) {
                            proves_prizes = true;
                            game_is_legit = true;
                        } else {
                            proof_error = "prizes";
                        }
                    } else {
                        proof_error = "progressive";
                    }
                } else {
                    proof_error = "dice";
                }
            } else {
                proof_error = "server_seed";
            }
        } else {
            proof_error = "client_seed";
        }
    
        if( show_dialog ) {
            this.show_provably_fair_dialog(game_info_package, proves_server_seed, proves_dice, proves_prizes);
        }

        return game_is_legit ? true : proof_error;
    },

    show_provably_fair_dialog: function(game_info_package, proves_server_seed, proves_dice, proves_prizes) {
        var li = game_info_package.game_seed.lastIndexOf(game_info_package.client_seed);
        var server_seed = game_info_package.game_seed.replace(game_info_package.client_seed,'');

        // Main game stuff
        $("#provably_fair_sessionid").html(game_info_package.session_id + " @ " + game_info_package.unique_id);
        $("#provably_fair_server_seed").html(server_seed);
        $("#provably_fair_client_seed").html(game_info_package.client_seed);
        $("#provably_fair_game_seed").html(game_info_package.game_seed);
        $("#provably_fair_dice").html(game_info_package.rolled_numbers.join(", "));

        var pretty_bets = function(b) {
            var bets = [];
            for( var k in b ) {
                bets.push('' + Bitcoin.int_amount_to_string(b[k]) + ' BTC on ' + Craps.get_pretty_bet_name(k));
            }
            if( bets.length == 0 ) { 
                return "None";
            }
            return bets.join(', ');
        }

        $("#provably_fair_bets").html(pretty_bets(game_info_package.made_bets));
        $("#provably_fair_total_bet").html(Bitcoin.int_amount_to_string(game_info_package.total_bet - game_info_package.progressive_bet));
        if( game_info_package.progressive_bet > 0 ) {
            $("#provably_fair_progressive_bet").html(" + " + Bitcoin.int_amount_to_string(game_info_package.progressive_bet) + " BTC (progressive bet)");
        }

        $("#provably_fair_prizes").html(pretty_bets(game_info_package.server_reported_prizes));
        $("#provably_fair_remaining_bets").html(pretty_bets(game_info_package.post_roll_bets));

        $("#provably_fair_prize").html(Bitcoin.int_amount_to_string(game_info_package.intwinnings-game_info_package.progressive_win));
        $("#provably_fair_progressive_win").html(Bitcoin.int_amount_to_string(game_info_package.progressive_win));

        $("#pf_tab_main").click( function() {
            $("#pf_tabs li a").removeClass("selected");
            $(this).addClass("selected");
            $(".pf_page").removeClass("selected");
            $(".pfdd_page").removeClass("selected");
            $("#pf_page_main").addClass("selected");
            
            return false;
        });

        //  - Use sprite sheet, added some display delays.
        $("#provably_fair_dialog .result_image").removeClass("pass");
        $("#provably_fair_dialog .result_image").removeClass("fail");
        $("#provably_fair_dialog .result_image").css('visibility', 'hidden');
 
    	window.setTimeout(function() { 
            $("#provably_fair_proves_server_seed").css('visibility', 'visible');
            $("#provably_fair_proves_server_seed").addClass( proves_server_seed ? "pass" : "fail" );
        }, 500);
    	window.setTimeout(function() { 
            $("#provably_fair_proves_dice").css('visibility', 'visible');
            $("#provably_fair_proves_dice").addClass( proves_dice ? "pass" : "fail" );
        }, 1000);
    	window.setTimeout(function() { 
            $("#provably_fair_proves_prize").css('visibility', 'visible');
            $("#provably_fair_proves_prize").addClass( proves_prizes ? "pass" : "fail" );
        }, 1500);

        $('#provably_fair_dialog').lightbox_me({
            centered: true,
            onLoad: function() {
                $('#pf_tab_main').click();
                $('#provably_fair_dialog').trigger('reposition');
            }
        }); 
    },

    add_game_to_leaderboard: function( finish_result, game_info_package ) {
        var that = this;
        var timestamp = (new Date()).getTime() / 1000;
        var intwinnings = game_info_package.intwinnings;
        var inttotalbet = game_info_package.total_bet;
        var intgameearnings = intwinnings - inttotalbet;
        var rolled = game_info_package.rolled_numbers[0] + game_info_package.rolled_numbers[1];

        //var game_eval = Blackjack.get_game_eval( game_info_package.dealer_hand, game_info_package.player_hands, game_info_package.original_bet, game_info_package.bets, game_info_package.insurance_bet > 0 );
        var lb = {
            player_ident: account_system.player_ident,
            public_id: account_system.public_id,
            timestamp: timestamp,
            game: "craps",
            gamedata: {
                "prizes": game_info_package.server_reported_prizes,
                "progressive_win": game_info_package.progressive_win,
                "unique_id": game_info_package.unique_id,
                "inttotalbet": inttotalbet,
                "intprogressivebet": game_info_package.progressive_bet,
                "intwinnings": intwinnings,
                "intgameearnings": intgameearnings,
                "progressive_hand": game_info_package.progressive_hand,
                "rolled": rolled,
                "num_points_hit": finish_result.num_points_hit,
                "the_point": game_info_package.the_point,
            }
        };
        var new_row = leaderboard_system.process_row("mygames", lb, false, false);
        if( intgameearnings > 0 ) {
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
            this.show_server_lied_dialog(game_check, null, game_info_package.session_id + " @ " + game_info_package.unique_id);
        }

        new_row.find("div.verify_button").on('click', function() {
            that.check_game(true, game_info_package);
        });
    },
    
    set_point: function( p ) {
        //reset the puck
        $(".puck").removeClass("on");
        //if p == null put puck over don't come area
        if( p == null ) {
            $("#art_numby_dont_come .puck").addClass("on");
        }
        //move the puck over the correct number
        else {
            $("#art_numby_" + p + " .puck").addClass("on"); 
        }
        //actually set the puck
        this.the_point = p;
    },
    
    set_die_dots: function( die, dot_classes ) {
        for( var i = 0; i < dot_classes.length; i++ ) {
            die.find(".dot." + dot_classes[i]).addClass("on");
        }
    },
    
    set_dice: function( rolls ) { 
        $(".big_die .dot").removeClass("on");
        $(".big_die").removeClass("on regular progressive_six dim");
        for( var i = 0; i < 6; i++ ) {
            var die = $("#big_die_"+i);
            
            var r = 0;
            if( i >= rolls.length ) {
                // continue;
                // Show fake gray numbers if not play progressive bonus game
                if( rolls[0] != 0 ) {
                    r = 1 + Math.floor(Math.random()*6);
                }
            }
            else {
                var r = rolls[i]; 
            }
            
            if( r > 0 ) {
                die.addClass("on regular");
                
                if( i >= 2 && this.progressive_bet == 0 ) {
                    die.addClass("dim");
                }
                if( r == 6 && this.progressive_bet > 0 ) {
                    die.removeClass("regular").addClass("progressive_six");
                }
            }
            switch( r ) {
            case 1:
                this.set_die_dots( die, ["cc"] );
                break;
            case 2:
                this.set_die_dots( die, ["tl", "br"] );
                break;
            case 3:
                this.set_die_dots( die, ["tl", "br", "cc"] );
                break;
            case 4:
                this.set_die_dots( die, ["tl", "br", "tr", "bl"] );
                break;
            case 5:
                this.set_die_dots( die, ["tl", "br", "tr", "bl", "cc"] );
                break;
            case 6:
                this.set_die_dots( die, ["tl", "br", "tr", "bl", "cl", "cr"] );
                break;
            }
            
        } 
        if( rolls[0] == 0 ) {
            $("#dice_sum_cont").removeClass("on");
        }
        else {
            $("#dice_sum_cont").addClass("on");
            
            $("#dice_sum").html( rolls[0] + rolls[1] );
        }
    },

    finish_game: function(finish_result) {
        var that = this;
        
        var game_info_package = this.package_game_info(finish_result);
        this.add_game_to_leaderboard(finish_result, game_info_package); 
        this.last_progressive_hand = finish_result.progressive_hand;

        // must come after package_game_info
        this.set_next_server_seed_hash(finish_result.server_seed_hash);
        this.game_state = this.GAME_STATE_PRE_ROLL;

        if(finish_result.session_over) {
            this.current_session_id = null;
        } else {
            this.current_session_id = finish_result.session_id;
        }

        this.last_bets = clone(this.bets);
        this.bets = {};
        this.bet = 0;
        
        this.set_point( finish_result.the_point );
        this.set_dice( finish_result.rolled_numbers );

        if(finish_result.intbalance != undefined) {
            account_system.set_btc_balance(finish_result['intbalance'],finish_result['fake_intbalance']);
        }
        
        if( finish_result.intwinnings > 0 ) {
            window.setTimeout( function() {
                if( finish_result.progressive_win > 0 ) {
                    sound_system.play_sound( "win_progressive" );
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
        this.counter_wins_timer_id = this.countup_wins(start, credits_won, finish_result.progressive_win > 0, function() {
            that.is_counting_up = false;
            that.calculate_credits();
        });
        
        this.chips_show_prizes( finish_result );
        
        if( finish_result.progressive_hand >= 3 ) {
            $("#progressive_label" + finish_result.progressive_hand).addClass("win");
            $("#progressive_value" + finish_result.progressive_hand).addClass("win");
        }
        
        this.update_controls();
        this.update_selected_bet(false);
        this.update_bet_text();
    },
    
    countup_wins: function( current, goal, show_fireworks, done ) {
        var that = this;

        if( show_fireworks && !isMobile.any() ) {
            this.maybe_create_firework();
        }
         
        this.countup_wins_done = done;
        if( current >= goal ) {
            
            this.draw_win_amount( goal, this.WIN_TEXT_WIN, 1 );
            done();
            return;
        }

        this.draw_win_amount( current, this.WIN_TEXT_WIN, 1 );
        
        //  CRAPS - Get a good delta based on number of chips on table?
        /*
        delta = Math.floor(this.bet_in_credits / 5);
        if( delta < 1 ) {
            delta = 1;
        }
        */
        var delta = 1;
        var delay = 50;
       
    	if( current+delta >= goal ) {
    	    this.num_credits += goal - current;
    	}
    	else {
        	this.num_credits += delta;
    	}
        this.update_credits();
        
        return window.setTimeout( function() {
            that.counter_wins_timer_id = that.countup_wins(current+delta, goal, show_fireworks, done);
        }, delay );
    },

    stop_countup_wins: function() {
        if( this.counter_wins_timer_id != null ) {
            window.clearTimeout(this.counter_wins_timer_id);
            this.counter_wins_timer_id = null;
            this.countup_wins_done();
        }
    },
    
    //  - This could be in common code, considering the only difference is the name of the game...
    reseed: function(cb) {
        var that = this;
    	$.ajax({
    		url: "/craps/reseed"
    	}).done(function(reseed_request) { 
            if( reseed_request.result == true ) {
                that.set_next_server_seed_hash(reseed_request.server_seed_hash);
                that.update_controls();
                cb();
            }
        });
    },

    update_selected_bet: function(caused_by_direct_input) {
    
        this.glow_clear_selected();
        this.glow_update(this.selected_bet);
        var glow_div = $("#bet_id_" + this.selected_bet + " .glow");
        var chip_div = $("#bet_id_" + this.selected_bet + " .chips");
        $(".selected_bet").removeClass("selected_bet");
        glow_div.addClass("selected_bet");
        chip_div.addClass("selected_bet");
        
        var can_remove = Craps.is_legal_to_remove_with_current_bets(this.the_point, this.selected_bet, this.roll_result.current_bets )[0];
        var can_bet = Craps.is_legal_bet(this.the_point, this.roll_result.current_bets, this.selected_bet, this.bet_per_click);
        
        $("#selected_bet").removeClass("on");
        $("#intro_message").removeClass("on");
        $("#autoplay_details").removeClass("on");
        if( !can_remove && !can_bet ) {
            this.selected_bet = null;
        } 
        if( this.selected_bet == null ) {
            return;
        } else {
            $("#selected_bet").addClass("on");
        }
        
        var format_odds = function(o) {
            if( o.length == 2 ) return o[0] + " to " + o[1];
            return o;
        };

        $("#selected_bet #name").html(Craps.get_pretty_bet_name(this.selected_bet) + " (" + format_odds(Craps.get_odds_for_bet(this.selected_bet, this.the_point)) + ")");
       
       
       
        $("#selected_bet .pickup").removeClass("on");
        $("#selected_bet .change_bet").removeClass("on");
        if( can_remove ) {
            $("#selected_bet .pickup").addClass("on");
        }
        else {
            $("#selected_bet .change_bet").addClass("on");
            
            var amt = 0;
            if( this.selected_bet in this.bets ) {
                amt = Math.floor(this.bets[this.selected_bet] / 10000);
            }
            // if you are typing in the number, no need to mess with the value again, since it screws with your cursor position.
            // Without this, hitting left/right arrow keys + home always throw you to the end of the input control.
            if( !caused_by_direct_input ) {
                $("#input_bet_amount").val(amt);
            }
        }
    },

    update_bet_text: function(prize) {
        var pb = '';
        if( this.progressive_bet != 0 ) {
            pb = '+' + Math.floor(this.progressive_bet / this.credit_btc_value);
        }
        
        var bet_amount = this.bet;
        
        //  - Do we want to show the last bet amount? It could confuse you about whether you are currently betting anything.
        // In roulette it's more OK since we have the repeat bet functionality
        /*
        if( this.bet == 0 ) {
            var bet_amount = this.last_bet;
        }
        */
        var bet = 'BET ' + Math.floor(bet_amount / this.credit_btc_value) + pb;
        
        
        this.saved_commission = 0;
        for( var key in this.bets ) {
            if( Craps.does_bet_require_commission(key) ) {
                //this.saved_commission += Math.floor( ( this.RULESET['buy_commission'] * this.bets[key] ) / this.credit_btc_value );
                this.saved_commission += Math.floor( (this.RULESET['buy_commission'] * this.bets[key] ) / 100000000);
            }
        } 
        
        if( this.saved_commission > 0 ) {
            bet += '+' + Math.round(100 * this.saved_commission/this.credit_btc_value)/100;
        }

        $("#bet_text").html(bet);
    },

    // Called by AccountSystem
    //  - This could potentially be handled in common game code?
    handle_balance_update: function( intbalance )
    {
        if( !this.is_counting_up && (this.game_state == this.GAME_STATE_PRE_ROLL ) ) {
            this.calculate_credits();
        }
    },
    
    is_current_bets_empty: function()
    {
        if( this.roll_result == null ) {
            return true;
        }
        
        for( var foo in this.roll_result.current_bets ) {
            if( this.roll_result.current_bets.hasOwnProperty(foo) ) {
                return false;
            }
        }
        return true;
    },
    

    update_controls: function() {
        
        //var state_use = this.game_state;
        
        
        switch( this.game_state ) {
        case this.GAME_STATE_PRE_ROLL:
            //  Calculate this better!
            this.can_roll = false;
            if( this.bet > 0 ) {
                this.can_roll = true;
            }
            else if( !this.is_current_bets_empty() ) {
                this.can_roll = true;
            }
            if( this.can_roll ) {
                $("#control_roll").removeClass("disabled");
            }
            else {
                $("#control_roll").addClass("disabled");
            }
            
            //  CRAPS - What about removing chips from the table? When can you do that?
            if( this.bet > 0 ) {
                $("#control_clear").removeClass("disabled");
            }
            else {
                $("#control_clear").addClass("disabled");
            }
            break;
        case this.GAME_STATE_ROLLING:
        case this.GAME_STATE_PICKUPING:
            this.can_roll = false;
            $("#control_roll").addClass("disabled");
            $("#control_clear").addClass("disabled");
            break;
        }
        
        $("#selected_bet").removeClass("on");            
        $("#autoplay_details").removeClass("on");            
        
        // In autoplay, just disable all the buttons.
        if( autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED || autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING ) {
            $("#control_roll").addClass("disabled");
            $("#control_clear").addClass("disabled");
            $("#autoplay_details").addClass("on");            
            $(".bet").addClass("disabled");
        }
        else {
            if( this.selected_bet != null ) {
                $("#intro_message").removeClass("on");            
                $("#selected_bet").addClass("on");            
            }
            $(".bet").removeClass("disabled");
        }

    },

    set_progressive_bet: function(int_size) {
        if( int_size == null || int_size == 0 ) {
            $("#progressive_bet_0001").removeClass("selected");
            $("#progressive_bet_none").addClass("selected");
            this.progressive_bet = int_size;
        } else if( int_size === Bitcoin.string_amount_to_int("0.0001") ) {
            $("#progressive_bet_0001").addClass("selected");
            $("#progressive_bet_none").removeClass("selected");
            this.progressive_bet = int_size;
        }

        this.update_bet_text();
    },

    handle_change_progressive_bet: function(size, play_sound) {
        if( size == null ) {
            this.set_progressive_bet(0);
        } else {
            this.set_progressive_bet(Bitcoin.string_amount_to_int(size));
        }

        if( play_sound ) {
            sound_system.play_sound("boop"); 
        }

        $.ajax({
        	url: "/craps/set_progressive_bet?progressive_bet=" + this.progressive_bet + "&_=" + (new Date()).getTime()
        }).done(function(set_result) { 
            // don't care if this succeeds or not.
        });
    },

    handle_auto: function() {
        if( autoplay_system.autoplay_phase != autoplay_system.AUTOPLAY_PHASE_STOPPED ) {
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

    set_autoplay_options: function() {
        $("#autoplay_mode_basic_speed option:selected").removeAttr("selected");

        $($("#autoplay_mode_basic_speed option")[autoplay_system.autoplay_speed]).prop('selected', true);

        $("#autoplay_dialog .options_container").hide();
        $(".autoplay_mode_item.selected .options_container").show();

        $("#autoplay_mode_basic_play_style option:selected").removeAttr("selected");
        $($("#autoplay_mode_basic_play_style option")[this.autoplay_mode_basic_play_style]).prop("selected", true);

        $("#autoplay_mode_basic_numbers_to_cover option:selected").removeAttr("selected");
        $($("#autoplay_mode_basic_numbers_to_cover option")[this.autoplay_mode_basic_numbers_to_cover]).prop("selected", true);

        $("#autoplay_mode_basic_take_odds option:selected").removeAttr("selected");
        $($("#autoplay_mode_basic_take_odds option")[this.autoplay_mode_basic_take_odds]).prop("selected", true);
    },

    handle_autoplay_mode: function(div) {
        $("#autoplay_dialog .autoplay_mode_item").removeClass("selected");
        div.addClass("selected");
        this.set_autoplay_options();
    },
 
    handle_autoplay_start: function() {
        /*this.set_bet_per_click()

        if( this.bet_per_click != 10000 ) {
            alert("autoplay gonna break if bet_per_click is not 0.0001 btc");
            return;
        }*/

        var p = $("#autoplay_dialog .autoplay_mode_item.selected").attr('id');
        if( p == 'autoplay_mode_basic' ) {
            this.autoplay_strategy = this.AUTOPLAY_STRATEGY_BASIC;
        }

        this.last_progressive_hand = null;

        autoplay_system.autoplay_start(false);
        $("#autoplay_dialog").trigger("close");
        this.update_controls();
    },


    handle_clear: function(play_sound) {
        if( this.bet == 0 ) {
            return;
        } 
        
        if(play_sound) {
            sound_system.play_sound("boop"); 
        }
        this.bets = {};
        this.chips_show_current( this.roll_result );
        this.bet = 0;
        this.last_bet = 0;
        this.update_bet_text();
        this.update_controls();
        this.update_selected_bet(false);
    },
    
    set_win_text: function(text){
        if (text == null){
            $("#win").removeClass("remove_background_image").html('');
        } else {
            $("#win").addClass("remove_background_image").html(text);
        }
    },
            
    handle_pickup: function( bet_id ) {
        result = null;
        result = Craps.is_legal_to_remove_with_current_bets(this.the_point, bet_id, this.roll_result.current_bets );
        if( !result[0] ) {
            return;
        }
        
        var pickup_string = "&" + bet_id + "=1";
        var pickup_in_credits = this.roll_result.current_bets[bet_id];
        for( required_pickup in result[1] ) {
            if( required_pickup in this.roll_result.current_bets ) {
                pickup_string += "&" + required_pickup;
                pickup_in_credits += this.roll_result.current_bets[required_pickup];
            }
        }
        pickup_in_credits = this.get_rounded_credits(pickup_in_credits / this.credit_btc_value);
        
        that.glow_clear();
        this.num_credits += pickup_in_credits;
        this.update_credits();
        this.game_state = this.GAME_STATE_PICKUPING;
        this.stop_countup_wins();
        var session_str = "";
        if(this.current_session_id != null) {
            session_str = "&session_id=" + this.current_session_id;
        }
        this.update_controls();

        // Save old made bets before picking up anything
        var old_bets = clone(that.bets);
        
    	$.ajax({
    		url: "/craps/pickup?" + pickup_string + session_str
    	}).done(function(pickup_result) {
        
            //It's not a win when chips are returned
            that.set_win_text("RETURNED");
            
    	    if( pickup_result['error'] != null ) {
                that.game_state = that.GAME_STATE_PRE_ROLL;
	            alert("Internal server error. Please try again later. (" + pickup_result['error'] + ")" );
    	        return;
    	    }
    	    
            that.game_state = that.GAME_STATE_PRE_ROLL;
    	    
            if(pickup_result.intbalance != undefined) {
                account_system.set_btc_balance(pickup_result['intbalance']);
            }

            if( pickup_result.intremoved > 0 ) {
                window.setTimeout( function() {
                    if( pickup_result.progressive_win > 0 ) {
                        sound_system.play_sound( "win_progressive" );
                    }
                    else {
                        sound_system.play_sound( "win1" ); 
                    }
                }, that.WIN_SOUND_DELAY);
            }
            
            // Can now show the updated credits value since the game is done.
            var credits_won = pickup_result.intremoved / that.credit_btc_value;
            that.is_counting_up = true;
            that.counter_wins_timer_id = that.countup_wins(1, credits_won, pickup_result.progressive_win > 0, function() {
                that.is_counting_up = false;
                that.calculate_credits();

            });
            
            that.chips_show_prizes( pickup_result );
            sound_system.play_sound( "win1" ); 

            // Update the current bets (we need this first in order to properly re-play the old bets)
            that.roll_result.current_bets = pickup_result.current_bets;

            // Set the point before replaying bets
            if(pickup_result.session_over) {
                that.current_session_id = null;
                that.set_point(null);
            } else {
                that.current_session_id = pickup_result.session_id;
            }

            // Reapply the old bets
            that.bets = {};
            that.bet = 0;

            var saved_selected_bet = that.selected_bet;
            for( var bet_id in old_bets ) {
                that.selected_bet = bet_id;
                that.handle_bet_delta_plus(old_bets[bet_id], false);
            }
            that.selected_bet = saved_selected_bet;

            that.update_controls();
            that.update_selected_bet(false);

    	}).fail(function() { 
        	that.game_state = that.GAME_STATE_PRE_ROLL;
            that.update_controls();
        	that.num_credits -= pickup_in_credits;
        	that.update_credits();
    	    alert("Error connecting to server. Please check your internet connection, try again, or reload the page."); 
    	});
    },
    handle_bet: function( bet_id, play_sound, update_glow ) {
        
        var bet_amount_already = 0;
        if( bet_id in this.bets ) {
            bet_amount_already = this.bets[bet_id];
        }
        
        // Clear lingering green and grey chips
        if( this.bet == 0 ) {
            //this.chips_show_current(this.roll_result);
        }
        
        
        var change_selected_bet_only = (bet_id != this.selected_bet) && bet_id in this.bets && this.bets[bet_id] != 0;
        var can_bet = true;
        
        if( Craps.is_legal_to_remove_with_current_bets(this.the_point, bet_id, this.roll_result.current_bets )[0]) {
            change_selected_bet_only = true;
        }

        if( !change_selected_bet_only ) {
            if( (this.bet + this.bet_per_click + this.progressive_bet) > account_system.get_active_btc_int_balance() ) {
                account_system.show_no_credits_dialog();
                return;
            }

            //  - Is this handled in Craps.is_legal_bet already?
            /*
            if( (this.bet + this.bet_per_click) > this.RULESET['maximum_bet'] ) {
                //TODO play a different sound?
                can_bet = false;
            }
            */

            if( !Craps.is_odds_bet(bet_id) && ((this.get_total_bet_on_table_minus_odds() + this.bet_per_click) > this.RULESET['maximum_bet']) ) {
                return;
            }

            
            var current_bets = (this.roll_result != null) ? this.roll_result.current_bets : {};
            if( !Craps.is_legal_bet(this.the_point, current_bets, bet_id, bet_amount_already + this.bet_per_click)) {
                can_bet = false;
                
                //  - Play sad sound or something
                return;
            } 
        
        }
        
        if(can_bet && !change_selected_bet_only) {
            if(play_sound) {
                sound_system.play_sound("boop");
            }

            var current_amount = 0;
            if( bet_id in this.bets ) {
                current_amount = this.bets[bet_id];
            }
            var new_amount = current_amount + this.bet_per_click;

            this.bets[bet_id] = new_amount;
            //increment the bet counter
            this.bet += this.bet_per_click;
            
            this.chips_set( bet_id, new_amount, 'on', true );
            this.update_bet_text();
            this.update_controls();
        } else {
            //TODO play a different 'click' sound?
        }

        //this has to happen even if the user can't place bets due to not enough BTC or table limit
        this.selected_bet = bet_id;
        this.update_selected_bet(false);
        
        if( update_glow ) {
            this.glow_update( bet_id );
        }
        
    },

    get_total_bet_on_table_minus_odds: function() {
        // TODO maybe this should just be kept track of instead of computing it over and over..
        var total_bet = 0;
        for( var bet_id in this.bets ) {
            if( !Craps.is_odds_bet(bet_id) ) total_bet += this.bets[bet_id];
        }

        if( this.roll_result != null ) {
            for( var bet_id in this.roll_result.current_bets ) {
                if( !Craps.is_odds_bet(bet_id) ) total_bet += this.roll_result.current_bets[bet_id];
            }
        }
        return total_bet;
    },
            
    handle_bet_delta_clear: function() {
        if(this.selected_bet == null || !(this.selected_bet in this.bets)) return;
        this.bet -= this.bets[this.selected_bet];
        delete this.bets[this.selected_bet];
        sound_system.play_sound("boop");
        this.update_selected_bet(false);
        this.chips_set( this.selected_bet, 0, 'off', false );
        this.update_bet_text();
        this.update_controls();
    },

    handle_bet_delta_minus: function(how_much) {
        if(this.selected_bet == null || !(this.selected_bet in this.bets)) return;
        if(this.bets[this.selected_bet] == 0) {
            delete this.bets[this.selected_bet];
            return;
        }
        if(this.bets[this.selected_bet] < how_much) how_much = this.bets[this.selected_bet];
        this.bet -= how_much;
        this.bets[this.selected_bet] -= how_much;
        if(this.bets[this.selected_bet] == 0) {
            delete this.bets[this.selected_bet];
            this.chips_set( this.selected_bet, 0, 'off', false );
        } else {
            this.chips_set( this.selected_bet, this.bets[this.selected_bet], 'on', true );
        }
        sound_system.play_sound("boop");
        this.update_selected_bet(false);
        this.update_bet_text();
        this.update_controls();
    },

    handle_bet_delta_plus: function(how_much, play_sound) {
        if(this.selected_bet == null) return;
        var old_value = (this.selected_bet in this.bets) ? this.bets[this.selected_bet] : 0;
        var new_value = old_value + how_much;
        
        if (new_value < 0){
            return;
        }
        
        if( (this.bet + how_much + this.progressive_bet) > account_system.get_active_btc_int_balance() ) {
            //TODO play a different sound?
            new_value = account_system.get_active_btc_int_balance() - this.progressive_bet - this.bet + old_value;
            if( new_value < old_value ) return;
        }

        if( !Craps.is_odds_bet(this.selected_bet) && ((this.get_total_bet_on_table_minus_odds() + how_much) > this.RULESET['maximum_bet']) ) {
            //TODO play a different sound?
            new_value = this.RULESET['maximum_bet'] - this.get_total_bet_on_table_minus_odds() + old_value;
            if( new_value < old_value ) return;
        }

        // Just cannot happen
        if( Craps.is_odds_bet(this.selected_bet) && this.the_point == null ) return;

        // check max odds
        var current_bets = (this.roll_result != null) ? this.roll_result.current_bets : {};
        if( Craps.is_odds_bet(this.selected_bet) && this.the_point != null) {
            // Limit the sum to the max odds
            var max_bet = Craps.get_max_bet_for_odds_bet(this.selected_bet, current_bets, this.the_point);
            if(new_value > max_bet) new_value = max_bet;
            if(!Craps.is_legal_bet(this.the_point, current_bets, this.selected_bet, new_value)) {
                return;
            }
        } 
        
        // new_value cannot have any extra bet less than bet_resolution
        new_value -= (new_value % this.RULESET['bet_resolution']);

        this.bet += (new_value - old_value);
        this.bets[this.selected_bet] = new_value;
        if(play_sound) {
            sound_system.play_sound("boop");
        }
        this.update_selected_bet(false);
        this.chips_set( this.selected_bet, this.bets[this.selected_bet], this.bets[this.selected_bet] != 0 ? 'on' : 'off', true );
        this.update_bet_text();
        this.update_controls();
    },

    handle_bet_delta_times: function(how_many) {
        if(this.selected_bet == null) return;
        var old_value = (this.selected_bet in this.bets) ? this.bets[this.selected_bet] : 0;
        var new_value = old_value * how_many;
        
        if( (this.bet + (new_value - old_value) + this.progressive_bet) > account_system.get_active_btc_int_balance() ) {
            //TODO play a different sound?
            new_value = account_system.get_active_btc_int_balance() - this.progressive_bet - this.bet + old_value;
            if( new_value < old_value ) return;
        }

        if( !Craps.is_odds_bet(this.selected_bet) && ((this.get_total_bet_on_table_minus_odds() + (new_value - old_value)) > this.RULESET['maximum_bet']) ) {
            //TODO play a different sound?
            new_value = this.RULESET['maximum_bet'] - this.get_total_bet_on_table_minus_odds() + old_value;
            if( new_value < old_value ) return;
        }

        // Just cannot happen
        if( Craps.is_odds_bet(this.selected_bet) && this.the_point == null ) return;

        // check max odds
        var current_bets = (this.roll_result != null) ? this.roll_result.current_bets : {};
        if( Craps.is_odds_bet(this.selected_bet) && this.the_point != null) {
            // Limit the sum to the max odds
            var max_bet = Craps.get_max_bet_for_odds_bet(this.selected_bet, current_bets, this.the_point);
            if(new_value > max_bet) new_value = max_bet;
            if(!Craps.is_legal_bet(this.the_point, current_bets, this.selected_bet, new_value)) {
                return;
            }
        } 

        // new_value cannot have any extra bet less than bet_resolution
        new_value -= (new_value % this.RULESET['bet_resolution']);

        this.bet += (new_value - old_value);
        this.bets[this.selected_bet] = new_value;
        sound_system.play_sound("boop");
        this.update_selected_bet(false);
        this.chips_set( this.selected_bet, this.bets[this.selected_bet], this.bets[this.selected_bet] != 0 ? 'on' : 'off', true );
        this.update_bet_text();
        this.update_controls();
    },

    handle_roll: function(e) {
        that = this;

        if( !this.can_roll ) {
            return;
        }
        if(e != undefined) e.preventDefault();

        // Don't spin if a spin is in progress
        if( this.game_state != this.GAME_STATE_PRE_ROLL ) return;
        
        //this.client_seed = get_client_seed();
        if( !this.check_client_seed() ) {
            return;
        }

        this.reset_for_roll();

        var bet_string = "";
        var first = true;
        var total_bet = 0;
        //var commission = 0;
        this.saved_bets = {};
        for( var key in this.bets ) {
            if( first != true ) {
                bet_string += "&";
            } 
            bet_string += key + "=" + this.bets[key];
            first = false;
            total_bet += this.bets[key];
            this.saved_bets[key] = this.bets[key];
        }

        //this.saved_commission = commission;

        // add current bets into saved_bets for provably fair
        if(this.roll_result != null) {
            for( var key in this.roll_result.current_bets ) {
                if( key in this.saved_bets ) {
                    this.saved_bets[key] += this.roll_result.current_bets[key];
                } else{
                    this.saved_bets[key]  = this.roll_result.current_bets[key];
                }
            }
        }

        this.last_bet = total_bet;
        var bet_in_credits = this.get_rounded_credits((this.last_bet + this.current_progressive_bet) / this.credit_btc_value);

        // Check balance
        if( (this.last_bet + this.current_progressive_bet) > account_system.get_active_btc_int_balance() ) {
            account_system.show_no_credits_dialog();
            return;
        }

        // Subtract credits
        this.num_credits -= bet_in_credits;
        this.update_credits();

        this.game_state = this.GAME_STATE_ROLLING;
        this.stop_countup_wins();
        
        $(".sixes_name").removeClass("win blink");
        $(".sixes_value").removeClass("win blink");
        
        sound_system.play_sound( "pay_coins" );

        var session_str = "";
        if(this.current_session_id != null) {
            session_str = "&session_id=" + this.current_session_id;
        }
        use_fake_credits_string = "use_fake_credits=" + account_system.use_fake_credits;
        this.update_controls();
        if( this.current_progressive_bet > 0 ) {
            this.set_dice([0,0,0,0,0,0]);
        }
        else {
            this.set_dice([0,0]);
        }

        this.client_seed = $("#next_client_seed").val();
        $("#next_client_seed").prop('disabled', true);
        
    	$.ajax({
    		url: "/craps/roll?server_seed_hash=" + this.next_server_seed_hash + "&client_seed=" + this.client_seed + "&progressive_bet=" + this.current_progressive_bet + "&" + bet_string + "&commission=" + this.saved_commission + session_str + "&" + use_fake_credits_string
    	}).done(function(roll_result) {
        
            //This is a win
            that.set_win_text();
            //clear the current bet to avoid player confusion.
            that.selected_bet = null;
            that.update_selected_bet(false);
            
    	    if( roll_result['error'] != null ) {
                that.game_state = that.GAME_STATE_PRE_ROLL;
    	        if( roll_result['error'] == "insufficient_funds" ) {
    	            account_system.show_no_credits_dialog();
    	        } else if( roll_result['error'] == 'shutting_down' ) {
                    account_system.show_shutting_down_dialog();
                } else if( roll_result['error'] == 'need_seed' ) {
                    that.num_credits += bet_in_credits;
                    that.update_credits();
                    that.reseed(function() {
                        that.handle_roll();
                    });
                }
    	        else {
    	            alert("Internal server error. Please try again later. (" + roll_result['error'] + ")" );
    	        }
    	        return;
    	    }
    	    that.roll_result = roll_result;
            that.finish_game(that.roll_result);
            that.game_state = that.GAME_STATE_PRE_ROLL;
    	    
            account_system.shutting_down(roll_result['shutdown_time'], false);
            if(roll_result.shutdown_time != undefined && roll_result.shutdown_time != 0) {
                account_system.shutting_down(roll_result.shutting_down);
            }
            
            that.flash_legal_bets();

    	}).fail(function() { 
        	that.game_state = that.GAME_STATE_PRE_ROLL;
            that.update_controls();
        	that.num_credits += bet_in_credits;
        	that.update_credits();
    	    alert("Error connecting to server. Please check your internet connection, try again, or reload the page."); 
    	});
    },

    handle_keypress: function(ev) {
        //the cashout dialog needs to be able to get all keyboard input.
        if(dialog_system.dialog_with_input_is_open) return false;
        
        //chat system needs to catch enter
        if(chat_system != null && chat_system.focused) return false;

        if ($("#next_client_seed").is(":focus")) {
            return false;
        }
        
        switch(ev.keyCode) {
        case 8: //backspace
            // Need to handle backspace if inside the text edit box
            if( $("#input_bet_amount").is(":focus") ) {
                return false;
            }

            //  - Disable backspace mapping to back button, so that users in incognito aren't screwed and lose their account_key.
            return true;
        case 13: //enter, stand
            if( $("#input_bet_amount").is(":focus") ) {
                return false;
            }
            this.handle_roll();
            return true;
        case 38:
            // Up 
            if( $("#input_bet_amount").is(":focus") ) {
                this.handle_bet_delta_plus(1 * this.credit_btc_value, true);
            }
            return true;
        case 40:
            // down
            if( $("#input_bet_amount").is(":focus") ) {
                this.handle_bet_delta_minus(1 * this.credit_btc_value);
            }
            return true; 
        }
        return false;
    },
    
    chips_clear: function()
    {
        $(".chips").removeClass("on win lose");
    },
    chips_set: function( bet_id, amount, cls, with_plus )
    {
        //  - The C bet zone must be able to simultaneously show winning chips from a bet already on CO,
        // as well as new chips that have moved up from the come line.
        // DC must show losing (allow_lose) + moved chips (allow_other) simultaneously
        var spec = ".allow_other";
        if( cls == "win" ) {
            spec = ".allow_win";
        }
        else if( cls == "lose" ) {
            spec = ".allow_lose";
        }
        var chips = "#bet_id_" + bet_id + " .chips" + spec;
        //$(chips + " .value").html( Math.floor(amount/this.credit_btc_value) );
        $(chips + " .value").html( Math.round(10 * amount/this.credit_btc_value)/10 );
        
        $(chips).removeClass("on win lose");
        $(chips).addClass( cls );
        $(chips + " .plus_sign").removeClass("on");
        if( with_plus ) {
            $(chips + " .plus_sign").addClass("on");
        }
    },
    chips_show_prizes: function( finish_result ) {
        
        this.chips_show_current(finish_result);
        for( var k in finish_result.losing_bets ) {
            this.chips_set( k, finish_result.losing_bets[k], "lose", false ); 
        }
        
        for( var k in finish_result.prizes ) {
            this.chips_set( k, finish_result.prizes[k], "win", false );
        }
    },
    chips_show_current: function( finish_result ) {
        this.chips_clear();
        if( finish_result != null ) {
            for( var k in finish_result.current_bets ) {
                //  CRAPS - It's possible for winning chips and current bets to occupy the same bet zone!
                this.chips_set( k, finish_result.current_bets[k], "on", false );
            }
        }
    },
        
    glow_update: function( bet_id ) {
        // We only do hover overs if autoplay isn't running
        if( autoplay_system.autoplay_phase != autoplay_system.AUTOPLAY_PHASE_STOPPED ) return;

        var glow_div = $("#bet_id_" + bet_id + " .glow");
        var chip_div = $("#bet_id_" + bet_id + " .chips");
        glow_div.addClass("on");
        var bet_amount_already = 0;
        if( bet_id in this.bets ) {
            bet_amount_already = this.bets[bet_id];
        }
        
        //  - Need can pick up funtion
        if( Craps.is_legal_to_remove_with_current_bets(this.the_point, bet_id, this.roll_result.current_bets )[0]) {
            glow_div.addClass("pickup");
            chip_div.addClass("potential_pickup");
        } 
        else if( !Craps.is_legal_bet(this.the_point, this.roll_result.current_bets, bet_id, bet_amount_already + this.bet_per_click)) {
            glow_div.addClass("illegal");
        } 
    },
    glow_clear: function() {
        $(".glow:not(.selected_bet)").removeClass("on illegal pickup").removeClass("blink");
        $(".chips:not(.selected_bet)").removeClass("potential_pickup");
    },
    glow_clear_selected: function() {
        $(".glow").removeClass("on illegal pickup");
        $(".chips").removeClass("potential_pickup");
    },
    get_is_guide_on: function() {
        return localStorage.is_guide_on == 'true' ? true : false;
    },
    set_is_guide_on: function(value) {
        if (value){
                localStorage.is_guide_on = 'true';
            } else {
                localStorage.is_guide_on = 'false';
            }
    },
    flash_legal_bets: function(on) {
        if (on == false) {
            $(".glow").each(function() {
                $(this).removeClass("blink");
            });
            return;
        }
        if (!this.get_is_guide_on()) {
            return;
        }
        var that = this;
        
        //https://stackoverflow.com/questions/16050914/css-animation-doesnt-restart-when-resetting-class
        function resetAnimation(jqNode) {
            var clone = jqNode.clone();
            jqNode.after( clone );
            jqNode.remove();
            jqNode[0] = clone[0];
        }
        
        $(".bet").each(function() {
            var bet_id = that.get_bet_id(this);
            
            var bet_amount_already = 0;
            if( bet_id in that.bets ) {
                bet_amount_already = that.bets[bet_id];
            }
             var glow_div = $("#bet_id_" + bet_id + " .glow");
             glow_div.removeClass("blink");
             resetAnimation(glow_div);
             if( Craps.is_legal_bet(that.the_point, that.roll_result.current_bets, bet_id, bet_amount_already + that.bet_per_click)) {
                    
                    glow_div.addClass("blink");
             }
        });
    },
    get_bet_id: function(bet){
        return $(bet).attr("id").substring(7);
    },
    
    
    handle_input_bet_amount: function() {
        if(this.selected_bet == null) return;
        
        var str = $("#input_bet_amount").val();
        var bad_value = false;
        for( var i = 0; i < str.length; i++ ) {
            if( str[i] < '0' || str[i] > '9' ) {
                bad_value = true;
            }
        }
        
        var old_value = (this.selected_bet in this.bets) ? this.bets[this.selected_bet] : 0;
        var new_value = 0;
        if( str.length > 0 ) {
            new_value = parseInt(str, 10) * this.credit_btc_value;
        }
        var how_much = new_value - old_value;

        $("#input_bet_amount").removeClass("error"); 
        if( isNaN(new_value) ) {
            if( str != '' ) $("#input_bet_amount").addClass("error");
            return;
        } 
        
        if( (this.bet + how_much + this.progressive_bet) > account_system.get_active_btc_int_balance() ) {
            bad_value = true;
        }

        if( !Craps.is_odds_bet(this.selected_bet) && ((this.get_total_bet_on_table_minus_odds() + how_much) > this.RULESET['maximum_bet']) ) {
            bad_value = true;
        }

        // check max odds
        var current_bets = (this.roll_result != null) ? this.roll_result.current_bets : {};
        if( Craps.is_odds_bet(this.selected_bet) && this.the_point != null && !Craps.is_legal_bet(this.the_point, current_bets, this.selected_bet, new_value) ) {
            bad_value = true;
        } 
         
        if( bad_value ) {
            $("#input_bet_amount").addClass("error");
            return;
        } 
        
        this.bet += (new_value - old_value);
        this.bets[this.selected_bet] = new_value;
        this.update_selected_bet(true);
        this.chips_set( this.selected_bet, this.bets[this.selected_bet], this.bets[this.selected_bet] != 0 ? 'on' : 'off', true );
        this.update_bet_text();
        this.update_controls();
    },

    format_payouts_table: function() {
        var table_odds = Craps.get_table_odds();
        var cell_odds = {
            "Po"   : [ null, null, null, null, null, table_odds.pass_line, null, null, null, table_odds.pass_line, null ],
            "Ph"   : [ null, null, table_odds.pass_line, table_odds.pass_line, table_odds.pass_line, null, table_odds.pass_line, table_odds.pass_line, table_odds.pass_line, null, null ],
            "POh"  : [ null, null, table_odds.four_ten, table_odds.five_nine, table_odds.six_eight, null, table_odds.six_eight, table_odds.five_nine, table_odds.four_ten, null, null ],
            "DPo"  : [ table_odds.dont_pass_line, table_odds.dont_pass_line, null, null, null, null, null, null, null, null, "Push" ],
            "DPh"  : [ null, null, null, null, null, table_odds.dont_pass_line, null, null, null, null, null ],
            "DPOh" : [ null, null, table_odds.dont_four_ten, table_odds.dont_five_nine, table_odds.dont_six_eight, null, table_odds.dont_six_eight, table_odds.dont_five_nine, table_odds.dont_four_ten, null, null ],
            "C"    : [ null, null, null, null, null, table_odds.come_line, null, null, null, table_odds.come_line, null ],
            "CO"   : [ null, null, table_odds.four_ten, table_odds.five_nine, table_odds.six_eight, null, table_odds.six_eight, table_odds.five_nine, table_odds.four_ten, null, null ],
            "DC"   : [ table_odds.dont_pass_line, table_odds.dont_pass_line, null, null, null, null, null, null, null, null, "Push" ],
            "DCO"  : [ null, null, table_odds.dont_four_ten, table_odds.dont_five_nine, table_odds.dont_six_eight, null, table_odds.dont_six_eight, table_odds.dont_five_nine, table_odds.dont_four_ten, null, null ],
            "PL"   : [ null, null, table_odds.place_four_ten, table_odds.place_five_nine, table_odds.place_six_eight, null, table_odds.place_six_eight, table_odds.place_five_nine, table_odds.place_four_ten, null, null ],
            "DPL"  : [ null, null, table_odds.dont_place_four_ten, table_odds.dont_place_five_nine, table_odds.dont_place_six_eight, null, table_odds.dont_place_six_eight, table_odds.dont_place_five_nine, table_odds.dont_place_four_ten, null, null ],
            "B"    : [ null, null, table_odds.buy_four_ten, table_odds.buy_five_nine, table_odds.buy_six_eight, null, table_odds.buy_six_eight, table_odds.buy_five_nine, table_odds.buy_four_ten, null, null ],
            "L"    : [ null, null, table_odds.lay_four_ten, table_odds.lay_five_nine, table_odds.lay_six_eight, null, table_odds.lay_six_eight, table_odds.lay_five_nine, table_odds.lay_four_ten, null, null ],
            "F"    : [ table_odds.field_two, table_odds.field, table_odds.field, null, null, null, null, table_odds.field, table_odds.field, table_odds.field, table_odds.field_twelve ],
            "BIG"  : [ null, null, null, null, table_odds.big_six_eight, null, table_odds.big_six_eight, null, null, null, null ],
            "H"    : [ null, null, table_odds.hard_four_ten, null, table_odds.hard_six_eight, null, table_odds.hard_six_eight, null, table_odds.hard_four_ten, null, null ],
            "PROP" : [ table_odds.prop_two_twelve, table_odds.prop_three_eleven, null, null, null, table_odds.prop_seven, null, null, null, table_odds.prop_three_eleven, table_odds.prop_two_twelve ],
            "PROPC": [ table_odds.prop_craps, table_odds.prop_craps, null, null, null, null, null, null, null, null, table_odds.prop_craps ],
            "CE"   : [ table_odds.prop_craps_eleven[2], table_odds.prop_craps_eleven[3], null, null, null,null, null, null, null, table_odds.prop_craps_eleven[11], table_odds.prop_craps_eleven[12] ]
        };

        var format_odds = function(o) {
            if( o == "Push" ) return o;
            return o[0] + " to " + o[1];
        };

        $("#help_paytable_and_rules").css('width', '' + ($("#paytable_dialog_content_holder").outerWidth()) + 'px');

        for( var k in cell_odds ) {
            for( var i = 2; i <= 12; i++ ) {
                var cname = k + "_" + i;
                if( cell_odds[k][i-2] == null ) {
                    $("#" + cname).addClass("no_win");
                } else {
                    $("#" + cname).html(format_odds(cell_odds[k][i - 2]));
                }
            }
        }
    },
    set_bet_per_click: function(amount){
        if (amount == null) {
            amount = 1;
        }
        
        $(".initial_bet").each(function( index ) {
            var button = $(this);
            if(parseInt(this.innerHTML) == amount){
                button.addClass("on");
            }else{
                button.removeClass("on");
            }
        });
        
        this.bet_per_click = amount * this.credit_btc_value;
    },

    init_handlers: function() {
        var that = this;
        
        $(".show_expected_return_link").on( 'click', function() {
            that.show_expected_return_dialog();
            return false;
        });
        $(".show_provably_fair_explain_link").on( 'click', function() {
            dialog_system.show_provably_fair_explain_dialog(that.game_name);
            return false;
        });

        $(".dialog .confirm_button").click( function() {
            $('.dialog').trigger('close');
        });
        
        $(".bet").mouseenter( function(e) {
            var bet_id = $(this).attr("id").substring(7);
            that.glow_update( bet_id );
        });
        $(".bet").mouseleave( function(e) {
            that.glow_clear();
        });
        $(".bet").click( function(e) {
            // All .bet divs are "bet_id_BET", so slice away the first 7 chars
            if( autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPED ) {
                var bet_id = $(this).attr("id").substring(7);
                that.handle_bet( bet_id, true, true );
            }
        });
        $("#control_roll").click( function(e) {
            /*
            // Repeat last bet (by hitting spin button)
            if( that.bet == 0 ) {
                that.bets = clone(that.last_bets);
            }
            */
            
            that.handle_roll(e); 
        });
        
        $("#control_clear").click( function(e) {
            that.handle_clear(true); 
        });

        
        $("#bets_holder").attr('unselectable','on').css('UserSelect','none').css('MozUserSelect','none'); 

        $("#progressive_bet_none").on('click', function() {
            that.handle_change_progressive_bet(null,true);
        });

        $("#progressive_bet_0001").on('click', function() {
            that.handle_change_progressive_bet("0.0001",true);
        });
        
        $("#control_autoplay").click( function() {
            that.handle_auto();
        });

        $(".autoplay_mode_item").click( function() {
            that.handle_autoplay_mode($(this));
        });

        $("#autoplay_dialog .autoplay_start_image").click( function() {
            that.handle_autoplay_start();
        });
        
        $(window).on('beforeunload', function() {
            if( that.game_state != that.GAME_STATE_PRE_ROLL ||
                !that.is_current_bets_empty() ||
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED || 
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING ) {
                return 'You are in the middle of a game.  If you leave, you will be forfeiting your bet.'
            }
        });
        
        /*
        $(".show_craps_payout_link").click( function() {

            $('#paytable_and_rules_dialog').lightbox_me({
                centered: true,
                onLoad: function() {
                    $('#paytable_and_rules_dialog').trigger('reposition');
                }
            }); 
            return false;
        });
        */
        
        $("#selected_bet").mouseenter( function(e) {
            that.glow_update( that.selected_bet );
        });
        $("#selected_bet").mouseleave( function(e) {
            that.glow_clear();
        });
        
        
        
        var autoplay_speed_changed = function(option) {
            autoplay_system.autoplay_speed = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_basic_speed").change( function() { autoplay_speed_changed($(this)); } );

        var autoplay_mode_basic_play_style_changed = function(option) {
            that.autoplay_mode_basic_play_style = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_basic_play_style").change( function() { autoplay_mode_basic_play_style_changed($(this)); } );

        var autoplay_mode_basic_numbers_to_cover_changed = function(option) {
            that.autoplay_mode_basic_numbers_to_cover = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_basic_numbers_to_cover").change( function() { autoplay_mode_basic_numbers_to_cover_changed($(this)); } );

        var autoplay_mode_basic_take_odds_changed = function(option) {
            that.autoplay_mode_basic_take_odds = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_basic_take_odds").change( function() { autoplay_mode_basic_take_odds_changed($(this)); } );
        
        //  - Minus 1 currently is not being used (because it can't fit???)...Sure it does!!!
        $(".change_bet_delta.minus_1").on('click', function() {
            that.handle_bet_delta_minus(that.bet_per_click);
        });
        $(".change_bet_delta.clear").on('click', function() {
            that.handle_bet_delta_clear();
        });
        $(".change_bet_delta.plus_1").on('click', function() {
            that.handle_bet_delta_plus(that.bet_per_click, true);
        });
        $(".change_bet_delta.times_2").on('click', function() {
            that.handle_bet_delta_times(2);
        });
        $(".change_bet_delta.max").on('click', function() {
            that.handle_bet_delta_plus(account_system.get_active_btc_int_balance());
        });
        $(".change_bet_delta.pickup").on('click', function() {
            that.handle_pickup(that.selected_bet);
        });
        $(".initial_bet").on('click', function() {
            that.set_bet_per_click(parseInt(this.innerHTML));
        });
        
        //  - The text gets selected, but then something is instantly clearing the selection again...
        // http://stackoverflow.com/questions/6124394/select-all-text-on-focus-using-jquery 
        //  - This seems to work OK...
        $("#input_bet_amount").focus( function(ev) {
            //$(this).select();
            window.setTimeout( function() {
                $("#input_bet_amount").select();
            }, 100);
        });
        $("#input_bet_amount").keyup( function(ev) {
            that.handle_input_bet_amount();
        });
         
        $(document).keydown( function(ev) {
            if(!$("input").is(":focus") && that.handle_keypress(ev)) {
                ev.preventDefault();
            }
        });
        
        
        $("#guidance_control").click(function() {
            $( this ).toggleClass( "selected" );
            that.set_is_guide_on($(this).hasClass("selected"));
            that.flash_legal_bets(that.get_is_guide_on());
        });
        
        $("#guidance_control").hover( function(e) {
            that.flash_legal_bets();
        }, function(e) {
            that.flash_legal_bets(false);
        });
        
        //show odds on hover
        $(".bet").hover(function() {
            if (that.get_is_guide_on()) {
                var format_odds = function(o) {
                    if ( o instanceof Array ) {
                        if( o.length == 2 ) return o[0] + " to " + o[1];
                    }
                    return o;
                };
                $(this).css('cursor','pointer').attr('title', format_odds(Craps.get_odds_for_bet(that.get_bet_id(this), that.the_point)));
            } else { $(this).css('cursor','pointer').attr('title', ''); }
            
        }, function() {
            { $(this).css('cursor','pointer').attr('title', ''); }
        });
    },

    set_progressive_jackpot: function(intvalue) {
        // convert progressive_jackpot (which is in BTC) to credits..
        var credit_progressive_jackpot = '' + intvalue / this.credit_btc_value;
        var value;

        var p = indexOf(credit_progressive_jackpot, '.');
        if( p > 0 ) {
            credit_progressive_jackpot = credit_progressive_jackpot.slice(0, p+3);

            var before_number = credit_progressive_jackpot.slice(0, p);
            before_number = before_number.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
            value = before_number + credit_progressive_jackpot.slice(p, p+3);
        } else {
            value = ('' + credit_progressive_jackpot).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
        }

        if( this.progressive_jackpot == value ) return;

        var delay = 250 + Math.random() * 500;
        if( this.progressive_jackpot == null ) {
            delay = 0;
        }

        this.progressive_jackpot = value;
        if(this.progressive_jackpot_timeout_id == undefined || this.progressive_jackpot_timeout_id == null) {
            var that = this;
            this.progressive_jackpot_timeout_id = window.setTimeout( function() { 
                $("#progressive_value6").css({ opacity: 0.0 });
                $("#progressive_value6").animate({ opacity: 1.0 }, 1000, function() {}); 
                $("#progressive_value6").html( that.progressive_jackpot );
                that.update_progressive_label_widths();
                that.progressive_jackpot_timeout_id = null;
            }, delay );
        }
        this.update_progressive_label_widths();
        var m = 0;
        var that = this;
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
		var jackpot_total = m * credit_progressive_jackpot;
        this.display_jackpot(jackpot_total, credit_progressive_jackpot);
    },

    update_progressive_label_widths: function() {
        var block_width = 253;
        var padding     = 2;

        for( var i = 3; i <= this.RULESET.progressive_paytable.length; i++ ) {
            $("#progressive_label" + i).css("width", (block_width - $("#progressive_value" + i).outerWidth() - padding) + "px");
        }
    }
});

function init_craps(key, my_player_ident, my_public_id, starting_server_seed_hash, initial_leaderboards, initial_mygames, chatlog, ruleset, default_progressive_bet, last_rolls, sound_volume ) {
    var sound_list = [ 
        ['boop', 'boop.wav', true, 1],
        ['win1', 'win1.wav', false, 1],
        ['pay_coins', 'coinpay.wav', false, 1],
        ['win_on_deal', 'slot_machine_bet_10.wav', false, 1],
        ['win_progressive', 'slot_machine_win_19.wav', false, 1],
    ];
    common_init( 'Craps', key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, chatlog, sound_list, sound_volume );
    
    dialog_system.init_help( ["/static/images/cp-help-howtoplay.png", "#help_paytable_and_rules" ] );
    
    game_system = new CrapsSystem( starting_server_seed_hash, ruleset, default_progressive_bet, last_rolls );
    game_system.call_update_service();

    //we need to resize chat again, since blackjack does some progressive table size changing..
    chat_system.adjust_height(false);
    //same for game size
    game_system.resizeHandler();
}

