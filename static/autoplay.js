//  - I suspect this will eventually need to be subclassed to support videopoker/blackjack
var AutoplaySystem = Class.extend( {
    init: function(game) {
        this.AUTOPLAY_PHASE_STOPPED = 0;
        this.AUTOPLAY_PHASE_STARTED = 1;
        this.AUTOPLAY_PHASE_STOPPING = 2;
        this.AUTOPLAY_PHASE_HOLD_ONLY = 3;
        
        // speed control
        this.AUTOPLAY_SPEED_SLOW = 0;
        this.AUTOPLAY_SPEED_MEDIUM = 1;
        this.AUTOPLAY_SPEED_FAST = 2;

        this.autoplay_speed = this.AUTOPLAY_SPEED_MEDIUM; 
        this.autoplay_phase = this.AUTOPLAY_PHASE_STOPPED; 
        
        this.autoplay_id = null;

        this.autoplay_wait_between_steps = [ 2500, 1000, 0 ];
        this.autoplay_restart_wait = false;
        this.autoplay_last_wait_time = 0;
        this.autoplay_last_wait_reason = {}; 
        this.autoplay_game = game;
    },

    autoplay_holdonly: function() {
        if( this.autoplay_phase == this.AUTOPLAY_PHASE_HOLD_ONLY ) return;
        this.autoplay_stopnow();

        this.autoplay_phase = this.AUTOPLAY_PHASE_HOLD_ONLY;
        $("#control_autoplay").addClass('stop').text('Stop');
    },

    autoplay_start: function() {
        if( this.autoplay_phase == this.AUTOPLAY_PHASE_STARTED || this.autoplay_phase == this.AUTOPLAY_PHASE_STOPPING ) return;

        if( this.autoplay_id != null ) {
            clearInterval(this.autoplay_id);
        }

        this.autoplay_phase = this.AUTOPLAY_PHASE_STARTED;
        this.autoplay_restart_wait = false;
        this.autoplay_last_wait_reason = {'playgame':true};

        var that = this;
        this.autoplay_id = setInterval( function() {
            that.autoplay_step();
        }, 100);
        $("#auto_play_banner_container").show();
        $("#control_autoplay").addClass('stop').text('Stop');
    },

    autoplay_stopnow: function() {
        if( this.autoplay_phase != this.AUTOPLAY_PHASE_STOPPED ) {
            if( this.autoplay_id != null ) {
                clearInterval(this.autoplay_id);
                this.autoplay_id = null;
            }
            
            this.autoplay_phase = this.AUTOPLAY_PHASE_STOPPED;
            $("#auto_play_banner_container").hide();
            $("#control_autoplay").removeClass().text('Auto');

            //  - This code is silly
            if( this.autoplay_game == 'Video Poker' ) {
                game_system.update_buttons();
            } else if( this.autoplay_game == 'Roulette' ) {
                game_system.update_controls();
            } else if( this.autoplay_game == 'Craps' ) {
                game_system.update_controls();
            } else if( this.autoplay_game == 'Keno' ) {
                game_system.update_controls();
            } else if( this.autoplay_game == 'Slots' ) { 
                game_system.update_controls();
            } else if( this.autoplay_game == 'Dice' ) { 
                game_system.input_bet_amount = game_system.autoplay_input_bet_amount;
                game_system.recalc_input_bet_amount();
                game_system.update_controls();
            }
        }
    },

    autoplay_stop: function() {
        if( this.autoplay_phase == this.AUTOPLAY_PHASE_STARTED ) {
            this.autoplay_phase = this.AUTOPLAY_PHASE_STOPPING;
        } else if( this.autoplay_phase == this.AUTOPLAY_PHASE_STOPPING ) {
            this.autoplay_stopnow();
        } else if( this.autoplay_phase == this.AUTOPLAY_PHASE_HOLD_ONLY ) {
            this.autoplay_stopnow();
        }
    },

    autoplay_hold: function() {
        //pick cards to hold
        var cards_to_hold = poker_games[game_system.paytable].recommend_hold(game_system.cards);
        console.log("recommending " + cards_to_hold + " for " + game_system.cards);
        for( var i = 0; i < 5; i++ ) {
            game_system.holds[i] = cards_to_hold[i];
            if(game_system.holds[i]) $("#hold" + i).addClass( "on" ); 
        }
    },

    autoplay_step: function() {
        if( this.autoplay_phase == this.AUTOPLAY_PHASE_STOPPED || this.autoplay_phase == this.AUTOPLAY_PHASE_HOLD_ONLY ) return;

        var that = this;
        
        //Slow down the game if necessary...
        var now = (new Date()).getTime();
        if( this.autoplay_restart_wait ) {
            this.autoplay_last_wait_time = now;
            this.autoplay_restart_wait = false;
        }

        if( (now - this.autoplay_last_wait_time) < this.autoplay_wait_between_steps[autoplay_system.autoplay_speed] ) {
            return;
        }

        if( this.autoplay_game === "Video Poker" ) {
            this.autoplay_step_videopoker();
        } else if( this.autoplay_game === "Blackjack" ) {
            this.autoplay_step_blackjack();
        } else if( this.autoplay_game === "Craps" ) {
            this.autoplay_step_craps();
        } else if( this.autoplay_game === "Roulette" ) {
            this.autoplay_step_roulette();
        } else if( this.autoplay_game === "Craps" ) {
            this.autoplay_step_craps();
        } else if( this.autoplay_game === "Keno" ) {
            this.autoplay_step_keno();
        } else if( this.autoplay_game === "Slots" ) {
            this.autoplay_step_slots();
        } else if( this.autoplay_game === "Dice" ) {
            this.autoplay_step_dice();
        }
    },

    _wait: function(reason) {
        if( this.autoplay_last_wait_reason[reason] == undefined || this.autoplay_last_wait_reason[reason] == false ) {
            this.autoplay_last_wait_reason[reason] = true;
            this.autoplay_restart_wait = true;
            return true;
        }
        return false;
    },

    _clear: function(reason) {
        this.autoplay_last_wait_reason[reason] = false;
    },

    autoplay_step_videopoker: function() {
        switch(game_system.game_phase) {
        case game_system.GAME_PHASE_DOUBLE_DONE:
            if( this._wait('doubledown') ) return;
        case game_system.GAME_PHASE_PRE_GAME:
            // stop after a monster hand to let the player savor the moment
            if( poker_games[game_system.paytable].is_progressive_jackpot_winner(game_system.hand_eval) ) {
                this.autoplay_stopnow();
                break;
            }

            if( game_system.can_play_double_dealer() ) {
                if( this._wait('playdouble') ) break;

                switch( game_system.autoplay_mode_normal_double_down_rate ) {
                case 0: //never
                    break;
                case 1: //sometimes:
                    if( Math.floor(Math.random() * 2) == 1) {
                        game_system.play_double_dealer();
                        return;
                    }
                    break;
                case 2: //always:
                    game_system.play_double_dealer();
                    return;
                }
            }

            // do double dealer first before stopping...
            if( this.autoplay_phase == this.AUTOPLAY_PHASE_STOPPING ) {
                this.autoplay_stopnow();
                break;
            }

            // if we haven't waited long enough
            if( this._wait('playgame') ) break;

            if( account_system.get_active_btc_int_balance() < (game_system.bet_size * game_system.credit_btc_value) ) {
                this.autoplay_stopnow();
            } else {
                game_system.clear_cards();

                this._clear('playgame');
                this._clear('doubledown');
                this._clear('playdouble');
            }
            break;
        case game_system.GAME_PHASE_SELECT_HELD_CARDS:
            if( this._wait('heldcards') ) {
                this.autoplay_hold();
            } else {
                game_system.hold_cards();
                this._clear('heldcards');
            }
            break;
        case game_system.GAME_PHASE_DOUBLE_PICK_CARD:
            var which = 1 + Math.floor(Math.random() * 4);
            if( this._wait('pickdouble') ) return;
            game_system.play_double_pick(which);
            this._clear('pickdouble');
            break;
        }        
    },            
    
    autoplay_step_blackjack: function() {
        switch(game_system.game_state) {
        case game_system.GAME_STATE_PRE_DEAL:
            // stop after a massive win
            if( game_system.last_progressive_hand != null && game_system.last_progressive_hand >= Blackjack.PROGRESSIVE_HAND_THREE_DIAMOND_SEVENS ) {
                this.autoplay_stopnow();
                break;
            }

            if( this.autoplay_phase == this.AUTOPLAY_PHASE_STOPPING ) {
                this.autoplay_stopnow();
                break;
            }

            if( account_system.get_active_btc_int_balance() < (game_system.bet + game_system.progressive_bet) ) {
                this.autoplay_stopnow();
                break;
            }

            // if we haven't waited long enough
            if( this._wait('playgame') ) break;

            if( account_system.get_active_btc_int_balance() <= 0 ) {
                this.autoplay_stopnow();
            } else {
                game_system.handle_draw();

                this._clear('playgame');
                this._clear('doubledown');
                this._clear('playdouble');
            }
            break;
        case game_system.GAME_STATE_PLAYER_DECISION:
            if( !this._wait('decide') ) {
                // player hands are dealt according to what the server tells us
                var player_hands = new Array();
                for( var i = 0; i < game_system.player_hands.length; i++ ) {
                    player_hands.push(game_system.get_hand(game_system.player_hands[i]));
                }

                var insurance_risk = 0;
                if( game_system.autoplay_take_insurance == game_system.AUTOPLAY_TAKE_INSURANCE_SOMETIMES ) {
                    insurance_risk = 0.5;
                } else if( game_system.autoplay_take_insurance == game_system.AUTOPLAY_TAKE_INSURANCE_ALWAYS ) {
                    insurance_risk = 1.0;
                }

                var action = Blackjack.player_action(game_system.dealer_shows, player_hands, game_system.next_hand, game_system.actions, insurance_risk, game_system.RULESET.max_split_count, game_system.progressive_bet, Math.floor(game_system.current_bet / game_system.credit_btc_value), game_system.num_credits);

                if( action == Blackjack.HIT ) {
                    game_system.handle_hit();
                } else if( action == Blackjack.DOUBLE ) {
                    game_system.handle_double();
                } else if( action == Blackjack.SPLIT ) {
                    game_system.handle_split();
                } else if( action == Blackjack.STAND ) {
                    game_system.handle_stand();
                } else if( action == Blackjack.INSURANCE ) {
                    game_system.handle_insurance();
                }
                this._clear('decide');
            }
            break;
        }
    },

    autoplay_step_roulette: function() {
        switch(game_system.game_state) {
        case game_system.GAME_STATE_PRE_SPIN:
            // stop after a massive win
            if( game_system.last_progressive_hand != null && game_system.last_progressive_hand >= Roulette.PROGRESSIVE_HAND_THREE_ZEROS ) {
                this.autoplay_stopnow();
                break;
            }

            if( this.autoplay_phase == this.AUTOPLAY_PHASE_STOPPING ) {
                this.autoplay_stopnow();
                break;
            }

            if( account_system.get_active_btc_int_balance() == 0 ) {
                this.autoplay_stopnow();
                break;
            }

            // if we haven't waited long enough
            if( this._wait('playgame') ) break;

            var stop = false;
            // place bets based on the betting strategy
            switch(game_system.autoplay_strategy) {
            case game_system.AUTOPLAY_STRATEGY_MARTINGALE:
                if( game_system.autoplay_martingale_bet_spot != null && game_system.spin_result != null ) {
                    if( game_system.autoplay_martingale_bet_spot in game_system.spin_result.prizes && game_system.spin_result.prizes[game_system.autoplay_martingale_bet_spot] != 0 ) {
                        //win!
                        game_system.autoplay_martingale_bet_spot = null;
                    } else {
                        game_system.autoplay_martingale_bet *= 2;

                        //check for hitting the bet limit
                        var bet_in_credits = game_system.autoplay_martingale_bet * game_system.credit_btc_value;
                        if( bet_in_credits >= game_system.RULESET['maximum_bet'] ) {
                            if( game_system.autoplay_martingale_table_limit == 0 ) { //bet the limit
                                game_system.autoplay_martingale_bet = game_system.get_rounded_credits(game_system.RULESET['maximum_bet'] / game_system.credit_btc_value);
                            } else {
                                //start over
                                game_system.autoplay_martingale_bet_spot = null;
                            }
                        }
                    }
                }

                if( game_system.autoplay_martingale_bet_spot == null ) {
                    //pick a new martingale bet
                    var bets = ["L18", "H18", "E", "O", "R", "B"];
                    var r = Math.floor(Math.random() * bets.length);
                    while( bets[r] == game_system.autoplay_martingale_bet_spot ) {
                        r = Math.floor(Math.random() * bets.length);
                    }
                    game_system.autoplay_martingale_bet_spot = bets[r];
                    game_system.autoplay_martingale_bet = game_system.autoplay_martingale_starting_bet;
                }

                game_system.handle_clear(false);

                var old_bet_per_click = game_system.bet_per_click;
                game_system.bet_per_click = game_system.autoplay_martingale_bet * game_system.credit_btc_value;
                game_system.handle_bet(game_system.autoplay_martingale_bet_spot, false);
                game_system.bet_per_click = old_bet_per_click;

                $("#autoplay_details_name").html( "MARTINGALE" );
                $("#autoplay_details_info").html( "BET " + game_system.autoplay_martingale_bet );

                break;
            case game_system.AUTOPLAY_STRATEGY_LABOUCHERE:
                var table_limit = game_system.get_rounded_credits(game_system.RULESET['maximum_bet'] / game_system.credit_btc_value);

                if( game_system.autoplay_labouchere_numbers != null && game_system.spin_result != null ) {
                    if( game_system.autoplay_martingale_bet_spot in game_system.spin_result.prizes && game_system.spin_result.prizes[game_system.autoplay_martingale_bet_spot] != 0 ) {
                        game_system.autoplay_labouchere_numbers = game_system.autoplay_labouchere_numbers.slice(1, game_system.autoplay_labouchere_numbers.length-1);
                    } else {
                        var b = 0;
                        if( game_system.autoplay_labouchere_numbers.length == 1 ) {
                            b = game_system.autoplay_labouchere_numbers[0];
                        } else {
                            b = game_system.autoplay_labouchere_numbers[0] + game_system.autoplay_labouchere_numbers[game_system.autoplay_labouchere_numbers.length-1];
                        }
                        if( b > table_limit ) b = table_limit;
                        game_system.autoplay_labouchere_numbers.push(b);
                    }

                    if( game_system.autoplay_labouchere_numbers.length == 0 || game_system.autoplay_labouchere_numbers.length > 999 ) {
                        game_system.autoplay_labouchere_numbers = null;
                    }
                }


                if( game_system.autoplay_labouchere_numbers == null ) {
                    //build a new set of numbers
                    //first, figure out what our max will be
                    var bet_size = table_limit;
                    if( game_system.autoplay_labouchere_bet == 1 ) { // bet specified
                        var n = game_system.autoplay_labouchere_bet_size;
                        if( n < bet_size ) {
                            bet_size = n;
                        }
                    }

                    //Then truncate the list length to be no more than bet_size long (1 credit per)
                    var list_length = game_system.autoplay_labouchere_number_count;
                    if( list_length > bet_size ) list_length = bet_size;

                    var numbers = new Array();
                    var sum     = 0;
                    for( var i = 0; i < list_length; i++ ) {
                        var n = 1 + Math.floor(bet_size * Math.random());
                        sum += n;
                        numbers.push(n);
                    }

                    var new_sum = 0;
                    for( var i in numbers ) {
                        numbers[i] /= sum;
                        numbers[i] = Math.floor(numbers[i] * bet_size);
                        if(numbers[i] == 0) numbers[i] = 1;
                        new_sum += numbers[i];
                    }

                    // randomly add credits until we hit the bet size
                    while(new_sum < bet_size) {
                        var r = Math.floor(Math.random() * numbers.length);
                        numbers[r] += 1;
                        new_sum += 1;
                    }

                    game_system.autoplay_labouchere_numbers = numbers;
                
                    // I'll just cheat and use the martingale spot
                    var bets = ["L18", "H18", "E", "O", "R", "B"];
                    var r = Math.floor(Math.random() * bets.length);
                    while( bets[r] == game_system.autoplay_martingale_bet_spot ) {
                        r = Math.floor(Math.random() * bets.length);
                    }
                    game_system.autoplay_martingale_bet_spot = bets[r];
                }
                
                $("#autoplay_details_name").html( "LABOUCHÈRE" );
                var pretty_list = null;
                if( game_system.autoplay_labouchere_numbers == null ) {
                    pretty_list = "";
                }
                else {
                    if( game_system.autoplay_labouchere_numbers.length > 12 ) {
                        pretty_list = game_system.autoplay_labouchere_numbers.slice(0,6).join(", ") + " ... " + game_system.autoplay_labouchere_numbers.slice( game_system.autoplay_labouchere_numbers.length-6 ).join(", ");
                    }
                    else { 
                        pretty_list = game_system.autoplay_labouchere_numbers.join(", ");
                    }
                    $("#autoplay_details_info").html( pretty_list );
                }

                // place the bet
                var b = 0;
                if( game_system.autoplay_labouchere_numbers.length == 1 ) {
                    b = game_system.autoplay_labouchere_numbers[0];
                } else {
                    b = game_system.autoplay_labouchere_numbers[0] + game_system.autoplay_labouchere_numbers[game_system.autoplay_labouchere_numbers.length-1];
                }

                if( b > table_limit ) b = table_limit;

                game_system.handle_clear(false);
                for( i = 0; i < b; i++ ) {
                    game_system.handle_bet(game_system.autoplay_martingale_bet_spot, false);
                }

                break;
            case game_system.AUTOPLAY_STRATEGY_LUCKY_NUMBER:
                var n = -2;
                if( game_system.autoplay_lucky_number_number == undefined ) {
                    while( n < (1 - game_system.RULESET['number_of_zeros']) || n > 36 ) {
                        var c = game_system.RULESET['number_of_zeros'] + 37;
                        n = Math.floor((1 - game_system.RULESET['number_of_zeros']) + (c * Math.random()));
                        if( n == -1 ) n = "00";
                    }
                } else {
                    n = game_system.autoplay_lucky_number_number;
                }
                console.log(n);
                game_system.handle_clear(false);

                var old_bet_per_click = game_system.bet_per_click;
                game_system.bet_per_click = game_system.autoplay_lucky_number_bet_size * game_system.credit_btc_value;
                game_system.handle_bet("N" + n, false);
                game_system.bet_per_click = old_bet_per_click;
                
                $("#autoplay_details_name").html( "LUCKY NUMBER" );
                $("#autoplay_details_info").html( n );
            
                if( account_system.get_active_btc_int_balance() < (game_system.bet + game_system.progressive_bet) ) {
                    stop = true;
                }
                break;
            }

            // betting strategy failed to place bets?  stop.
            if( stop || game_system.bet == 0 ) {
                this.autoplay_stopnow();
                break;
            }

            if( account_system.get_active_btc_int_balance() <= 0 ) {
                this.autoplay_stopnow();
            } else {
                game_system.handle_spin();

                this._clear('playgame');
            }
            break;
        }
    },

    autoplay_step_craps: function() {
        var get_placed_bet = function(b) {
            var t = 0;
            if( game_system.roll_result != null && (b in game_system.roll_result.current_bets)) {
                t += game_system.roll_result.current_bets[b];
            }
            if( b in game_system.bets ) {
                t += game_system.bets[b];
            }
            return t;
        }

        switch(game_system.game_state) {
        case game_system.GAME_STATE_PRE_ROLL:
            // stop after a massive win
            if( game_system.last_progressive_hand != null && game_system.last_progressive_hand >= Craps.PROGRESSIVE_HAND_SIX_SIXES ) {
                this.autoplay_stopnow();
                break;
            }

            if( this.autoplay_phase == this.AUTOPLAY_PHASE_STOPPING ) {
                this.autoplay_stopnow();
                break;
            }

            if( account_system.get_active_btc_int_balance() == 0 ) {
                this.autoplay_stopnow();
                break;
            }

            // if we haven't waited long enough
            if( this._wait('playgame') ) break;

            var stop = false;
            // place bets based on the betting strategy
            switch(game_system.autoplay_strategy) {
            case game_system.AUTOPLAY_STRATEGY_BASIC:
                var pbet = "P";
                var dont_pass = false;
                if( game_system.autoplay_mode_basic_play_style == game_system.AUTOPLAY_MODE_BASIC_PLAY_STYLE_DONT_PASS ) {
                    pbet = "DP";
                    dont_pass = true;
                }

                var cbet = "C";
                if( game_system.autoplay_mode_basic_play_style == game_system.AUTOPLAY_MODE_BASIC_PLAY_STYLE_DONT_PASS ) {
                    cbet = "DC";
                }

                if( game_system.the_point == null ) {
                    // On coming out roll, make sure we have a bet on "P"
                    if( !(pbet in game_system.bets) && (game_system.roll_result == null || !(pbet in game_system.roll_result.current_bets) ) )  {
                        game_system.handle_bet(pbet, false, false);
                    }
                } else {
                    // Make sure we have full odds on "PO"
                    if( game_system.autoplay_mode_basic_take_odds == game_system.AUTOPLAY_MODE_BASIC_TAKE_ODDS_PASS || 
                        game_system.autoplay_mode_basic_take_odds == game_system.AUTOPLAY_MODE_BASIC_TAKE_ODDS_ALWAYS ) {
                        var pobet = pbet + "O";
                        var current_pobet = get_placed_bet(pobet);

                        if( dont_pass ) {
                            for( ; current_pobet < (Craps.DONT_PASS_ODDS_LIMITS[game_system.the_point] * game_system.bet_per_click); current_pobet += game_system.bet_per_click ) {
                                game_system.handle_bet(pobet, false, false);
                            }
                        } else {
                            for( ; current_pobet < (Craps.PASS_ODDS_LIMITS[game_system.the_point] * game_system.bet_per_click); current_pobet += game_system.bet_per_click ) {
                                game_system.handle_bet(pobet, false, false);
                            }
                        }
                    }

                    // Count number of points we have covered
                    var numbers_covered = 0;
                    for( var i = 4; i <= 10; i++ ) {
                        var c = get_placed_bet( cbet + i ); // It's fine if "CO7" doesn't exist.
                        if( c != 0 ) {
                            numbers_covered += 1;

                            if( game_system.autoplay_mode_basic_take_odds == game_system.AUTOPLAY_MODE_BASIC_TAKE_ODDS_COME || 
                                game_system.autoplay_mode_basic_take_odds == game_system.AUTOPLAY_MODE_BASIC_TAKE_ODDS_ALWAYS ) {
                                var cobet = cbet + "O" + i;
                                var current_cobet = get_placed_bet( cobet );

                                if( dont_pass ) {
                                    for( ; current_cobet < (Craps.DONT_COME_ODDS_LIMITS[game_system.the_point] * game_system.bet_per_click); current_cobet += game_system.bet_per_click ) {
                                        game_system.handle_bet(cobet, false, false);
                                    }
                                } else {
                                    for( ; current_cobet < (Craps.COME_ODDS_LIMITS[game_system.the_point] * game_system.bet_per_click); current_cobet += game_system.bet_per_click ) {
                                        game_system.handle_bet(cobet, false, false);
                                    }
                                }
                            }
                        }
                    }

                    // If we have few than the # of points to cover covered, place a come/don't come bet.
                    if( numbers_covered < game_system.autoplay_mode_basic_numbers_to_cover && get_placed_bet(cbet) == 0) {
                        game_system.handle_bet(cbet, false, false);
                    }
                }

                $("#autoplay_details_name").html( "BASIC STRATEGY" );
                $("#autoplay_details_info").html( ((game_system.autoplay_mode_basic_play_style == game_system.AUTOPLAY_MODE_BASIC_PLAY_STYLE_DONT_PASS) ? "DON'T PASS LINE BETS" : "PASS LINE BETS") );

                break;
            }

            var total_bet = game_system.bet;
            if( game_system.roll_result != null ) {
                for( var k in game_system.roll_result.current_bets ) {
                    total_bet += game_system.roll_result.current_bets[k];
                }
            }

            // betting strategy failed to place bets?  stop.
            if( stop || total_bet == 0 ) {
                this.autoplay_stopnow();
                break;
            }

            if( account_system.get_active_btc_int_balance() <= 0 ) {
                this.autoplay_stopnow();
            } else {
                game_system.handle_roll();

                this._clear('playgame');
            }
            break;
        }
    },

    autoplay_step_keno: function() {
        switch(game_system.game_state) {
        case game_system.GAME_STATE_PRE_BLESS:
            // stop after a massive win
            if( game_system.last_progressive_jackpot >= 9 ) {
                this.autoplay_stopnow();
                break;
            }

            if( this.autoplay_phase == this.AUTOPLAY_PHASE_STOPPING ) {
                this.autoplay_stopnow();
                break;
            }

            if( account_system.get_active_btc_int_balance() == 0 ) {
                this.autoplay_stopnow();
                break;
            }

            // if we haven't waited long enough
            if( this._wait('playgame') ) break;

            // Play numbers (or leave them)
            if( game_system.autoplay_mode_basic_pick_selection == game_system.AUTOPLAY_PICK_SELECTION_RANDOM ) {
                game_system.clear_picks(false);
                game_system.do_quickpick(false);
            }

            // betting strategy failed to place bets?  stop.
            if( game_system.num_picks != game_system.NUM_REQUIRED_PICKS ) {
                this.autoplay_stopnow();
                break;
            }

            if( account_system.get_active_btc_int_balance() <= (game_system.bet_size * game_system.credit_btc_value) ) {
                this.autoplay_stopnow();
            } else {
                game_system.handle_bless();
                this._clear('playgame');
            }
            break;
        }
    },

    autoplay_step_slots: function() {
        switch(game_system.game_state) {
        case game_system.GAME_STATE_PRE_PULL:
            if( game_system.last_progressive_jackpot > 0 ) {
                this.autoplay_stopnow();
                break;
            }

            if( this.autoplay_phase == this.AUTOPLAY_PHASE_STOPPING ) {
                this.autoplay_stopnow();
                break;
            }

            if( account_system.get_active_btc_int_balance() == 0 ) {
                this.autoplay_stopnow();
                break;
            }

            // if we haven't waited long enough
            if( this._wait('playgame') ) break;

            if( account_system.get_active_btc_int_balance() <= (game_system.num_lines * game_system.credit_btc_value) ) {
                this.autoplay_stopnow();
            } else {
                game_system.handle_pull();
                this._clear('playgame');
            }
            break;
        }
    },

    autoplay_step_dice: function() {
        switch(game_system.game_state) {
        case game_system.GAME_STATE_PRE_PULL:
            // stop after a massive win
            if( game_system.last_progressive_jackpot != null && game_system.last_progressive_jackpot > 0 ) {
                this.autoplay_stopnow();
                break;
            }

            if( this.autoplay_phase == this.AUTOPLAY_PHASE_STOPPING ) {
                this.autoplay_stopnow();
                break;
            }

            if( account_system.get_active_btc_int_balance() == 0 ) {
                this.autoplay_stopnow();
                break;
            }

            // if we haven't waited long enough
            if( this._wait('playgame') ) break;

            var stop = false;
            // place bets based on the betting strategy
            switch(game_system.autoplay_strategy) {
            case game_system.AUTOPLAY_STRATEGY_MARTINGALE:
                if( game_system.autoplay_martingale_bet != null && game_system.pull_result != null ) {
                    if( game_system.pull_result.prize > 0 ) {
                        //win!
                        game_system.autoplay_martingale_bet = null;
                    } else {
                        game_system.autoplay_martingale_bet = Math.floor(game_system.autoplay_martingale_bet * game_system.autoplay_martingale_bet_multiplier);

                        //check if "profit" is too high
                        var bet = game_system.autoplay_martingale_bet;
                        var profit = game_system.autoplay_martingale_bet * game_system.input_bet_payout;
                        if( profit > game_system.RULESET['maximum_profit'] ) {
                            if( game_system.autoplay_martingale_table_limit == 0 ) { //bet the limit
                                var s = game_system.RULESET['maximum_profit'] / game_system.input_bet_payout;
                                var r = s % game_system.RULESET['bet_resolution'];
                                game_system.autoplay_martingale_bet = s - r;
                            } else {
                                //start over
                                game_system.autoplay_martingale_bet = null;
                            }
                        }
                    }
                }

                if( game_system.autoplay_martingale_bet == null ) {
                    //start a new martingale 
                    game_system.autoplay_martingale_bet = game_system.autoplay_martingale_starting_bet;
                }

                // Lower the bet size so that your max loss is capped at what you set it to be. Otherwise it could potentially get much higher than expected, if you were winning earlier and the multiplier has gotten very high.
                var current_total_loss = game_system.autoplay_starting_credits - game_system.num_credits;
                if( game_system.autoplay_martingale_max_loss > 0 && current_total_loss + (game_system.autoplay_martingale_bet/game_system.credit_btc_value) > game_system.autoplay_martingale_max_loss ) {
                    game_system.autoplay_martingale_bet = (game_system.autoplay_martingale_max_loss - current_total_loss) * game_system.credit_btc_value;
                    // Don't bet less than 1 since it stops the UI with an input error
                    if( game_system.autoplay_martingale_bet < game_system.credit_btc_value ) {
                        game_system.autoplay_martingale_bet = game_system.credit_btc_value;
                    }
                } 

                //! TODO $("#autoplay_details_name").html( "MARTINGALE" );
                //!$("#autoplay_details_info").html( "BET " + game_system.autoplay_martingale_bet );
                game_system.input_bet_amount = Math.floor(game_system.autoplay_martingale_bet / game_system.credit_btc_value);
                game_system.recalc_input_bet_amount();

                // See if the max win / max loss 
                if( game_system.autoplay_martingale_max_win > 0 && game_system.num_credits >= game_system.autoplay_starting_credits + game_system.autoplay_martingale_max_win ) {
                    stop = true;
                }
                if( game_system.autoplay_martingale_max_loss > 0 && game_system.num_credits <= game_system.autoplay_starting_credits - game_system.autoplay_martingale_max_loss ) {
                    stop = true;
                }

                break;

            case game_system.AUTOPLAY_STRATEGY_REPEAT:
                //!  TODO $("#autoplay_details_name").html( "LUCKY NUMBER" );
                //! $("#autoplay_details_info").html( n );
            
                break;
            }

            var bet_size = game_system.credit_btc_value * game_system.input_bet_amount;
            if( account_system.get_active_btc_int_balance() < bet_size ) {
                stop = true;
            }

            // betting strategy failed to place bets?  stop.
            if( stop || game_system.bet == 0 ) {
                this.autoplay_stopnow();
                break;
            }

            if( account_system.get_active_btc_int_balance() <= 0 ) {
                this.autoplay_stopnow();
            } else {
                game_system.handle_pull(undefined, game_system.autoplay_target == 0 ? "low" : "high");

                this._clear('playgame');
            }
            break;
        }
    }

});

if(false) {
    $(document).ready(function(){
        var test = function(g, h, r) {
            var ret = g.recommend_hold(h);
            if( ret != r ) {
                alert(g.name + ": " + h + " gives " + ret + " but should give " + r);
            }
        };
        var p = new PokerJacksOrBetter();
        test(p, ['ah', '3d', 'tc', '4h', '2d'], '1,0,0,0,0');
        test(p, ['qc', 'kc', 'ac', 'jc', 'tc'], '1,1,1,1,1');
        test(p, ['kc', 'kd', 'ks', 'kh', '5d'], '1,1,1,1,0');
        test(p, ['qc', 'kd', 'qs', 'qh', 'qd'], '1,0,1,1,1');
        test(p, ['qc', 'kc', 'ac', '9h', 'tc'], '1,1,1,0,1');
        test(p, ['jc', 'kc', '3c', 'ac', 'tc'], '1,1,0,1,1');
        test(p, ['jc', 'jh', '3c', '4c', 'jd'], '1,1,0,0,1');
        test(p, ['8h', '7h', 'tc', '9d', 'jc'], '1,1,1,1,1');
        test(p, ['3h', 'qh', 'th', '9h', 'ah'], '1,1,1,1,1');
        test(p, ['3h', 'td', 'th', '3c', 'ts'], '1,1,1,1,1');
        test(p, ['3h', '8d', '7d', 'td', 'jd'], '0,1,1,1,1');
        test(p, ['3h', '6d', '7d', 'td', 'jd'], '0,1,1,1,1');
        test(p, ['3h', '6d', '7d', 'td', 'jc'], '0,1,1,1,0');
        test(p, ['3h', '3d', '7d', '7c', 'as'], '1,1,1,1,0');
        test(p, ['3h', '4d', 'jd', 'ad', 'js'], '0,0,1,0,1');
        test(p, ['qd', '4d', 'jd', 'ad', 'ks'], '1,0,1,1,0');
        test(p, ['2d', '4d', 'jd', '9d', 'ks'], '1,1,1,1,0');
        test(p, ['2d', '4d', '2h', '9d', 'ks'], '1,0,1,0,0');
        test(p, ['2d', '4s', '5h', '3d', 'ks'], '1,1,1,1,0');
        test(p, ['9d', '4s', '5h', '3d', '6s'], '0,1,1,1,1');
        test(p, ['9d', '4s', 'jh', 'ah', '6s'], '0,0,1,1,0');
        test(p, ['qh', '4s', 'jh', 'ah', '6s'], '1,0,1,1,0');
        test(p, ['2h', '4s', '6h', 'ac', '5h'], '1,0,1,0,1');
        test(p, ['2h', '4s', '6d', 'ah', '5h'], '1,0,0,1,1');
        test(p, ['2s', '7s', '3h', 'ad', '4c'], '0,0,0,1,0');
        test(p, ['2s', '3s', '5s', 'as', '9c'], '1,1,1,1,0');
        test(p, ['2s', '5d', 'qs', 'kh', '9c'], '0,0,1,1,0');
        test(p, ['ad', 'qs', '5d', 'kh', '9c'], '0,1,0,1,0');
        test(p, ['ts', 'qs', '5d', '4h', '9c'], '1,1,0,0,0');
        test(p, ['kd', '2s', '5d', 'td', '9c'], '1,0,0,1,0');
        test(p, ['3s', '2s', 'jd', 'td', '9c'], '0,0,1,1,0');
        test(p, ['3s', '2s', 'jd', '8h', '9c'], '0,0,1,0,0');
        test(p, ['as', '2s', '7d', '8h', '9c'], '1,0,0,0,0');
        test(p, ['kd', '5s', 'ts', 'ah', 'qs'], '1,0,0,0,1');
        test(p, ['3d', 'js', 'qc', 'kh', 'as'], '0,1,0,0,1');
    
        var p = new PokerBonus();
        test(p, ['5s', '9h', '9c', '9d', '9s'], '0,1,1,1,1');
        test(p, ['8s', '8h', '8c', '2s', '8d'], '1,1,1,1,1');
    
        var p = new PokerDoubleDoubleBonus();
        test(p, ['3s', 'ah', 'ac', 'ad', 'as'], '1,1,1,1,1');
        test(p, ['as', 'ah', 'ac', 'ad', '5s'], '1,1,1,1,0');
        test(p, ['2s', '2h', '2c', '2d', '5s'], '1,1,1,1,0');
        test(p, ['2s', '2h', '2c', '2d', 'as'], '1,1,1,1,1');
        test(p, ['2s', '2h', '4c', '2d', '2c'], '1,1,1,1,1');
        test(p, ['2s', '2h', '9c', '2d', '2c'], '1,1,0,1,1');
        test(p, ['9s', '9h', '9c', '9d', '2c'], '1,1,1,1,1');
        test(p, ['9s', '9h', '9c', '9d', '5c'], '1,1,1,1,0');
    
        var p = new PokerDeucesWild();
        test(p, ['6s', '7d', 'tc', '2h', '9d'], '1,1,1,1,1');
        test(p, ['6s', '9d', '8c', '2h', '7d'], '1,1,1,1,1');
        test(p, ['3s', '5d', '4c', '2h', 'ad'], '1,1,1,1,1');
        test(p, ['3s', '5s', '2c', 'ks', 'ts'], '1,1,1,1,1');
        test(p, ['3s', '7d', '9c', 'js', 'qs'], '0,0,0,1,1');
        test(p, ['6h', 'th', '5c', '9h', '9s'], '1,1,0,1,0');
        test(p, ['ts', '7s', '9h', '2s', 'as'], '1,0,0,1,1');
        test(p, ['4d', '8s', '8h', 'th', 'kh'], '0,1,1,0,0');
        test(p, ['4d', '7s', '8h', 'th', 'kh'], '0,0,0,1,1');
        test(p, ['6d', '7s', 'jc', 'ad', 'qd'], '0,0,0,1,1');
        test(p, ['td', 'jc', 'ad', 'js', 'kc'], '1,1,1,0,1');
        test(p, ['3h', '5d', '3s', '3c', '2h'], '1,0,1,1,1');
        test(p, ['7d', 'kh', 'as', '5h', '6c'], '1,0,0,1,1');
        test(p, ['ks', 'ah', '6s', '5c', '4c'], '0,0,1,1,1');
        test(p, ['3c', 'td', 'qd', 'kd', '2c'], '0,1,1,1,1');
        test(p, ['2h', 'qh', '4h', 'ad', '9d'], '1,0,0,1,0');
        test(p, ['2s', 'ts', 'jd', 'kc', '3c'], '1,0,0,1,0');
        test(p, ['as', 'ts', '9s', '2s', '2c'], '1,1,0,1,1');
        test(p, ['as', '7s', '9s', '2s', '2c'], '1,1,1,1,1');
    });
}
