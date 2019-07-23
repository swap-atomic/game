var BlackjackSystem = GameSystem.extend( {
    init: function( starting_server_seed_hash, ruleset, default_progressive_bet ) {
        //  - Need a correct value for credits_btc_value_in!
        this._super('blackjack', starting_server_seed_hash, ruleset['bet_resolution'], ['blackjack', 'videopoker', 'roulette', 'craps']);

        this.default_num_credit_decimals = 1;

        this.GAME_STATE_PRE_DEAL = 0;
        this.GAME_STATE_DEALING = 1;
        this.GAME_STATE_PLAYER_DECISION = 2;
        this.GAME_STATE_HITTING = 3;
        this.GAME_STATE_STANDING = 4;
        this.GAME_STATE_DOUBLING = 5;
        this.GAME_STATE_SPLITING = 6;
        this.GAME_STATE_INSURING = 7;
        
        this.FAIL_REASON_AJAX_ERROR = 0;
        this.FAIL_REASON_INSUFFICIENT_FUNDS = 1;

        this.WORD_WIDTHS =  {
            'bust': 88,
            'win' : 66,
            'push': 86,
            'lose': 87,
            'blackjack': 204 
        };

        this.AUTOPLAY_TAKE_INSURANCE_NEVER = 0
        this.AUTOPLAY_TAKE_INSURANCE_SOMETIMES = 1
        this.AUTOPLAY_TAKE_INSURANCE_ALWAYS = 2
        this.autoplay_take_insurance = this.AUTOPLAY_TAKE_INSURANCE_SOMETIMES;

        this.RULESET = ruleset;

        for( var i = 1; i < this.RULESET.progressive_paytable.length-1; i++ ) {
            $("#progressive_value" + i).html(this.RULESET.progressive_paytable[i]);
        }

        this.hand_template = $("#hand_holder_template").html();
        this.dealer_hands_holder = $("#dealer_hands_holder");
        this.player_hands_holder = $("#player_hands_holder");
        this.hands_holder_width = this.player_hands_holder.innerWidth();
        this.hands_holder_height = this.player_hands_holder.innerHeight();

        this.credit_size = Bitcoin.string_amount_to_int("0.0001");
        this.bet_in_credits = 1;
        this.bet = this.bet_in_credits * this.credit_size;
        this.is_counting_up = false;

        this.progressive_jackpot = 0;
        this.progressive_jackpot_timeout_id = null;
        this.last_progressive_hand = null;
        this.is_bet_table_active = false;

        this.game_state = this.GAME_STATE_PRE_DEAL;
        this.show_half_credits = true;
        this.reset_game();
        this.init_handlers();
        this.time_update();
        
        this.update_progressive_label_widths();
        this.set_progressive_bet(default_progressive_bet);

        this.show_face_down_cards();
        //this.show_bet_table();

        rules_div = "<div id='help_rules'>";
        rules_div += "<div id='help_rules_content'>";
        rules_div += this.get_pretty_blackjack_rules(); 
        rules_div += "</div>";
        rules_div += "</div>";
        $("body").append(rules_div);
    },
    
    time_update: function() {
        var that = this;
        this.blink_on = !this.blink_on;
        
        if( this.blink_on ) {
            $("#control_draw.on").addClass("bright");
            $(".sevens_name.win").addClass("bright");
            $(".sevens_value.win").addClass("bright");
        }
        else {
            $("#control_draw.on").removeClass("bright");
            $(".sevens_name.win").removeClass("bright");
            $(".sevens_value.win").removeClass("bright");
        } 
        
        window.setTimeout( function() {
            that.time_update();
        }, this.BLINK_DELAY );
    },

    //  - Move to common code?
    call_update_service: function() {

        var that = this;
        if (this.user_is_active) { 
            var timestamp = (new Date()).getTime();
            $.ajax({
            	url: "/blackjack/update?progressive_bet=" + this.progressive_bet + "&last=" + leaderboard_system.last_leaderboard_time + "&chatlast=" + chat_system.last_chatlog_index + "&_=" + timestamp
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
    
    show_face_down_cards: function() {
        var dealer_hand = this.add_hand(this.dealer_hands_holder, 0);
        this.add_card_to_hand(dealer_hand, "back", false);
        this.add_card_to_hand(dealer_hand, "back", false);
        
        var player_hand = this.add_hand(this.player_hands_holder, 0);
        this.add_card_to_hand(player_hand , "back", false);
        this.add_card_to_hand(player_hand , "back", false);
        this.player_hands = [["ah", "as"]];
    },

    hide_bet_table: function() {
        this.is_bet_table_active = false;
        //$("#change_bet_table").css( {display: "none"} );
        $("#change_bet_table").hide();
        $("#control_changebet").removeClass("disable");
    },
    show_bet_table: function() {
        var that = this;

        if( this.game_state != this.GAME_STATE_PRE_DEAL ) return;
        this.is_bet_table_active = true;

        $("#control_changebet").addClass("disable");
        if( this.player_hands.length > 0 ) {
            //fade out the player hands...?
            this.player_hands_holder.find(".hand_holder_container").fadeOut(100, function() {
                that.player_hands = new Array();
                that.show_bet_table();
            });
            return;
        }
        
        $("#input_bet_amount").val( this.bet_in_credits );
        $("#input_bet_amount").removeClass("error");
        $("#change_bet_table").fadeIn(500);
    },

    add_hand: function(hand_holder) {
        var num_hands = hand_holder.children(".hand_holder_counter").length;
        return this.insert_hand(hand_holder, num_hands);
    },

    insert_hand: function(hand_holder, index) {
        var new_id = "game_hand" + this.idgen;
        this.idgen += 1;

        var div = '<div id="' + new_id + '" class="hand_holder_container">' + this.hand_template + "</div>";
        var children = hand_holder.children(".hand_holder_container");
        if( index >= children.length ) {
            hand_holder.append(div);
        } else {
            $(children[index]).before(div);
        }

        this.update_hands_holder_size(hand_holder);
        return $("#" + new_id);
    },

    set_zoom: function( hand_holder, scale ) {
        s = "scale(" + scale + ")";
        hand_holder.css("-moz-transform", s);
        hand_holder.css("-webkit-transform", s);
        hand_holder.css("-o-transform", s);
        hand_holder.css("-ms-transform", s);
        hand_holder.css("transform", s);

        s = "0 0";
        hand_holder.css("-webkit-transform-origin", s);
        hand_holder.css("-moz-transform-origin:", s);
        hand_holder.css("-o-transform-origin", s);
        hand_holder.css("-ms-transform-origin", s);
        hand_holder.css("transform-origin", s);
    },

    update_hands_holder_size: function(hand_holder) {
        var t = 0;
        var buffer = 40;
        hand_holder.children(".hand_holder_container").each(function(i, e) {
            t += $(e).outerWidth() + buffer;
        });

        if( t > this.hands_holder_width ) {
            var scale = t / this.hands_holder_width;
            scale = Math.min( 1.0 / scale, 1.0 );
            //hand_holder.css("zoom", scale);
            this.set_zoom( hand_holder, scale );
            hand_holder.css("width", this.hands_holder_width / scale);
            hand_holder.css("height", this.hands_holder_height / scale);
        }
    },

    numbers_to_digit_divs: function(number_list) {
        var nums = [];
        for( var si = 0; si < number_list.length; si++ ) {
            var s = number_list[si];
            var t = Math.floor(s / 10);
            if( t != 0 ) {
                nums.push('<div class="credit_digit credit_digit_' + t + '"></div>');
            }
            t = s % 10;
            nums.push('<div class="credit_digit credit_digit_' + t + '"></div>');
        
            if( si < (number_list.length - 1) ) {
                nums.push('<div class="credit_digit credit_digit_or"></div>');
            }
        }
        return nums.join('');
    },

    add_card_to_hand: function(card_holder, card, hidden_at_first) {
        var new_id = "cards" + this.idgen;
        this.idgen += 1;
        
        var is_first = (this.get_hand(card_holder).length == 0);
        if(hidden_at_first == undefined) hidden_at_first = false;
        var div = '';
        div +='<div id="' + new_id + '" class="game-card card_' + card + ' hand_card' + (is_first ? " hand_first" : "") + '"' + (hidden_at_first ? ' style="display:none;"' : "") + '>';
        div += '</div>';
        card_holder.children(".hand_dimmer").children(".hand_holder").append(div);
        card_holder.attr("cards", (!is_first ? (card_holder.attr("cards") + ",") : "") + card);

        this.update_hands_holder_size($(card_holder.parent()));

        return $("#" + new_id);
    },

    add_word_to_hand: function(card_holder, word) {
        var new_id = "word" + this.idgen;
        this.idgen += 1;

        var width = card_holder.find(".hand_holder").outerWidth();

        card_holder.children(".hand_dimmer").children(".hand_holder").append('<div class="card_text_background" style="display:none;"><div id="' + new_id + '" class="card_text ' + word + '"></div></div>');

        $("#" + new_id).parent().css('left', Math.floor((width / 2) - (this.WORD_WIDTHS[word] / 2)) + 'px');
        $("#" + new_id).parent().css('width', this.WORD_WIDTHS[word] + 5);
        $("#" + new_id).parent().css('display', '');
    },

    pop_card_from_hand: function(card_holder) {
        var player_hand = this.get_hand(card_holder);
        var last = player_hand.pop();

        // clean out the html
        card_holder.children(".hand_dimmer").children(".hand_holder").html("");
        card_holder.removeAttr("cards");

        // re-add the remaining cards
        for( var c = 0; c < player_hand.length; c++ ) {
            this.add_card_to_hand(card_holder, player_hand[c]);
        }

        return last;
    },

    get_hand: function(card_holder) {
        var cards = card_holder.attr("cards");
        if( cards == undefined ) return new Array();
        return cards.split(",");
    },

    show_hand_score: function(card_holder, hand_done) {
        var cards = this.get_hand(card_holder);
        if( cards.indexOf("back") >= 0 ) {
            card_holder.children(".hand_counter").html("");
        } else if( Blackjack.is_bust(cards) ) { 
            var score = Blackjack.score_hand(cards);
            card_holder.children(".hand_counter").html(this.numbers_to_digit_divs([score[0]]));
        } else {
            // need to filter the list to all numbers below 21.  if 21 is in the list, show only that.
            var new_list = new Array();
            var score = Blackjack.score_hand(cards);
            var has_21 = false;
            for( var si = 0; si < score.length; si++ ) {
                if( score[si] < 21 ) {
                    new_list.push(score[si]);
                } else if( score[si] == 21 ) {
                    has_21 = true;
                    break;
                }
            }

            if( has_21 ) {
                new_list = [21];
            }
            
            if( hand_done ) {
                new_list = new_list.slice( new_list.length - 1 );
            }

            card_holder.children(".hand_counter").html(this.numbers_to_digit_divs(new_list));
        }
    },

    reset_game: function() {
        this.update_bet_text();
        this.dealer_hands_holder.html("");
        //this.player_hands_holder.html(this.bet_table_template);
        this.player_hands_holder.html("");

        // Initialze bet table with the proper id..
        this.hide_bet_table();
        $(".sevens_name.win").removeClass("bright").removeClass("win");
        $(".sevens_value.win").removeClass("bright").removeClass("win");

        this.idgen = 0;
        this.player_hands = new Array();
        this.dealer_hand = null;
        this.update_controls();
        
        //  - Make these variable names compatible with videopoker
        this.current_game_id = null;
        this.current_unique_id = null;
        //this.client_seed = get_client_seed();
        this.current_bet = this.bet;
        this.current_progressive_bet = this.progressive_bet;
        
        this.actions = new Array();
        //this.player_hands_holder.css("zoom", "");
        this.set_zoom( this.player_hands_holder, 1 );
        this.player_hands_holder.css("width", "");
        this.player_hands_holder.css("height", "");
        this.dealer_shows = null;

        this.counter_wins_timer_id = null;
    },

    package_game_info: function(finish_result) {
        // player hands are dealt according to what the server tells us
        var player_hands = new Array();
        for( var i = 0; i < this.player_hands.length; i++ ) {
            player_hands.push(this.get_hand(this.player_hands[i]));
        }

        var p = {
            game_id                    : this.current_game_id,
            unique_id                  : this.current_unique_id,
            server_seed_hash           : this.next_server_seed_hash,
            deal_hash                  : this.current_deal_hash,
            deal_hash_source           : finish_result.deal_hash_source,
            server_reported_client_seed: finish_result.client_seed,
            client_seed                : this.client_seed,
            dealer_shows               : this.dealer_shows,
            game_seed                  : finish_result.game_seed,
            dealer_hand                : finish_result.dealer_hand,
            player_hands               : player_hands,
            actions                    : this.actions.slice(0).join(''),
            server_reported_actions    : finish_result.actions.slice(0),
            server_reported_prizes     : finish_result.prizes.slice(0),
            server_reported_bets       : finish_result.bets.slice(0),
            original_bet               : this.current_bet,
            progressive_bet            : this.current_progressive_bet,
            prize_total                : finish_result.prize_total,
            prizes                     : finish_result.prizes,
            game_eval                  : finish_result.game_eval,
            progressive_win            : finish_result.progressive_win,
            bets                       : finish_result.bets,
            insurance_bet              : (indexOf(finish_result.actions, "I") >= 0) ? Math.floor(this.current_bet / 2) : 0,
        };
        if( account_system.use_fake_credits ) {
            p['unique_id'] = this.games_played;
        }
        return p;
    },

    check_game: function(show_dialog, game_info_package) {
        var proof_error = null;
    
        var proves_server_seed = false;
        var proves_deck        = false;
        var proves_game_eval   = false;
        var proves_prize       = false;
        var game_is_legit      = false;
    
        // first make sure the hash is legitimate
        // 1. Our seed is reported exactly as we sent it
        // 2. Our seed is included somewhere in the game seed
        // 3. The game seed is included into the source hash
        if( game_info_package.server_reported_client_seed == game_info_package.client_seed 
           && game_info_package.game_seed.indexOf(game_info_package.client_seed) != -1 
           && game_info_package.deal_hash_source.indexOf(game_info_package.game_seed) != -1 ) {
            // Next, extract the server's seed from the game_seed and SHA-256 it, and make sure the hash matches the hash provided
            // before the hand is dealt.
            var li = game_info_package.game_seed.lastIndexOf(game_info_package.client_seed);
            var server_seed = game_info_package.game_seed.substr(0, li) + game_info_package.game_seed.substr(li + game_info_package.client_seed.length);
            if( SHA256(server_seed) == game_info_package.server_seed_hash ) {
                proves_server_seed = true;
    
                // Next, perform the shuffle on a deck of cards and verify the deck is exactly the one that we got.
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
        
                // At this point we need to shuffle the deck (it must match the one on the server or else we'll get the wrong answer)
                var check_cards = new Array();
                for( var deck = 0; deck < this.RULESET['number_of_decks']; deck++ ) {
                    check_cards = check_cards.concat(this.STANDARD_CARDS.slice(0));
                }
                shuffle(twister, check_cards)
                check_cards_string = check_cards.join("");
        
                // Get the deck out of the deal_hash_source (deck should be part of the game hash)
                var first_close_paren = game_info_package.deal_hash_source.indexOf(')');
                var game_cards        = game_info_package.deal_hash_source.slice(1, first_close_paren);
    
                // This verifies the deck order hasn't changed
                if( check_cards_string == game_cards ) {
                    // verify that the hash of the deal_hash_source (what the server gave us in /deal) matches the actual hash
                    if( SHA256(game_info_package.deal_hash_source) == game_info_package.deal_hash ) {
                        proves_deck = true;
    
                        if( game_info_package.actions == game_info_package.server_reported_actions ) {
                            // Verify the cards dealt out were in the proper order from the deck
                            var simulation_result = this.simulate_game(game_cards, game_info_package.dealer_shows, game_info_package.actions, game_info_package.original_bet);
    
                            var all_player_hands_are_correct = (simulation_result.player_hands.length == game_info_package.player_hands.length);
                            for( var i = 0; i < simulation_result.player_hands.length && all_player_hands_are_correct; i++ ) {
                                if( simulation_result.player_hands[i].length != game_info_package.player_hands[i].length ) {
                                    all_player_hands_are_correct = false;
                                    break;
                                }
    
                                for( var j = 0; j < simulation_result.player_hands[i].length; j++ ) {
                                    if( simulation_result.player_hands[i][j] != game_info_package.player_hands[i][j] ) {
                                        all_player_hands_are_correct = false;
                                        break;
                                    }
                                }
                            }
    
                            var dealer_hand_is_correct = ( simulation_result.dealer_hand.length == game_info_package.dealer_hand.length );
                            for( var i = 0; i < simulation_result.dealer_hand.length && dealer_hand_is_correct; i++ ) {
                                if( simulation_result.dealer_hand[i] != game_info_package.dealer_hand[i] ) {
                                    dealer_hand_is_correct = false;
                                    break;
                                }
                            }

                            var bets_are_correct = ( simulation_result.bets.length == game_info_package.server_reported_bets.length );
                            for( var i = 0; i < simulation_result.bets.length && bets_are_correct; i++ ) {
                                if( simulation_result.bets[i] != game_info_package.server_reported_bets[i] ) {
                                    bets_are_correct = false;
                                    break;
                                }
                            }

                            if( simulation_result.insurance_bet != game_info_package.insurance_bet ) {
                                bets_are_correct = false;
                            }
    
                            if( all_player_hands_are_correct && dealer_hand_is_correct && bets_are_correct ) {
                                // now we know all the hands dealt are legitimate, we need to verify the prizes given out to us are legit.
                                var game_eval = Blackjack.get_game_eval( simulation_result.dealer_hand, 
                                                                         simulation_result.player_hands, 
                                                                         game_info_package.original_bet,
                                                                         simulation_result.bets,
                                                                         simulation_result.insurance_bet > 0 );
                                if( game_eval == game_info_package.game_eval ) {
                                    proves_game_eval = true;

                                    // finally, we should verify that all the prizes are correct
                                    var has_split = game_info_package.actions.indexOf("S") >= 0;
                                    var prize_total = 0;
                                    var all_prizes_are_good = true;
                                    var progressive_win = 0;
                                    var is_progressive_jackpot_win = false;
                                    for( var hand_index = 0; hand_index < simulation_result.player_hands.length; hand_index++ ) {
                                        var prize = Blackjack.get_prize(simulation_result.dealer_hand, simulation_result.player_hands[hand_index], simulation_result.bets[hand_index], has_split, this.RULESET['blackjack_pays']);

                                        if( hand_index == 0 && simulation_result.insurance_bet > 0 && Blackjack.is_blackjack(simulation_result.dealer_hand) ) {
                                            prize += simulation_result.insurance_bet + this.RULESET.insurance_pays[0] * Math.floor( simulation_result.insurance_bet / this.RULESET.insurance_pays[1] );
                                        }

                                        if( this.RULESET.loses_only_original_bet_on_dealer_blackjack && prize == 0 ) {
                                            // Player loses only the original_bet, per hand, if the player lost against a dealer blackjack
                                            prize = simulation_result.bets[i] - game_info_package.original_bet;
                                        }

                                        if( prize != game_info_package.prizes[hand_index] ) { 
                                            all_prizes_are_good = false; 
                                            break;
                                        }

                                        prize_total += prize
                                    }

                                    if( game_info_package.progressive_bet > 0 ) {
                                        var progressive_win_hand = Blackjack.get_progressive_win_for_game(check_cards, game_info_package.actions, game_info_package.progressive_bet, this.RULESET.progressive_paytable);
                                        if( progressive_win_hand == Blackjack.PROGRESSIVE_WIN_JACKPOT ) {
                                            // unfortunately we can't predict the progressive jackpot, so we have to take the servers word on it.
                                            // We can't predict it, because it's changing all the time. a single .001 change would throw off our proof errors.
                                            var progressive_jackpot = game_info_package.prizes[hand_index] - prize;
                                            progressive_win += progressive_jackpot;
                                            prize_total += progressive_win;
                                            is_progressive_jackpot_win = true;
                                        } else if( progressive_win_hand > 0 ) {
                                            // all other progressive wins are predictable
                                            progressive_win += progressive_win_hand;
                                            prize_total += progressive_win;
                                        }
                                    }

                                    if( all_prizes_are_good && (prize_total == game_info_package.prize_total) && game_info_package.progressive_win == progressive_win ) {
                                        proves_prize = true;
                                        game_is_legit = true;
                                    } else {
                                        proof_error = "prizes";
                                    }
                                } else {
                                    proof_error = "game_eval";
                                }
                            } else {
                                proof_error = "deal";
                            }
                        } else {
                            proof_error = "actions";
                        }
                    } else {
                        proof_error = "game_hash";
                    }
                } else {
                    proof_error = "deck";
                }
            } else {
                proof_error = "server_seed";
            }
        } else {
            proof_error = "client_seed";
        }
    
        if( show_dialog ) {
            this.show_provably_fair_dialog(game_info_package, proves_server_seed, proves_deck, proves_game_eval, proves_prize);
        }

        return game_is_legit ? true : proof_error;
    },

    simulate_game: function(game_cards, dealer_shows, actions, original_bet) {
        var that = this;

        var card = function(i) {
            return game_cards.substring(i*2, i*2+2);
        }
    
        var player_hands = [[card(0), card(2)]];
        var hand_is_result_of_split = [0];  // 0 = not from split, 1 = from split (not ace), 2 = from split of ace
        var num_splits = 0;
        var bets = [original_bet];
        var total_bet = original_bet;
        var deal_index = 4;
        var hand_index = 0;
        var insurance_bet = 0;
    
        var next_hand = function(hi) {
            var next_hand_index = hi + 1;
            if( next_hand_index < player_hands.length && player_hands[next_hand_index].length == 1 ) {
                player_hands[next_hand_index].push(card(deal_index));
                deal_index += 1;
            }
            return next_hand_index;
        }
    
        var should_go_to_next_hand = function() {
            if( Blackjack.is_bust(player_hands[hand_index]) || Blackjack.is_21(player_hands[hand_index]) ) return true;
    
            // special rules for aces and splits
            if( hand_is_result_of_split[hand_index] == 2 ) {
                var second_card_is_ace = (Blackjack.get_card_rank_number(player_hands[hand_index][1]) == 1);
                if( second_card_is_ace ) {
                    if( !that.RULESET.can_resplit_aces ) return true;
                    else if( num_splits >= that.RULESET.max_split_count ) return true; // Second card is an ace, which means player could normally resplit, but he's split too many times this game already
                } else {
                    if( !that.RULESET.can_hit_split_aces ) return true;
                }
            }
    
            return false;
        }
    
        var i;
        var has_split;
        for( i = 0; i < actions.length && hand_index < player_hands.length; i++ ) {
            var go_to_next_hand = false;
    
            if( actions[i] == 'T' ) {
                go_to_next_hand = true;
            } else if( actions[i] == 'H' ) {
                player_hands[hand_index].push(card(deal_index));
                deal_index += 1;
            } else if( actions[i] == 'D' ) {
                bets[hand_index] += original_bet;
                total_bet += original_bet;
                player_hands[hand_index].push(card(deal_index));
                deal_index += 1;
                go_to_next_hand = true;
            } else if( actions[i] == 'S' ) {
                if( (Blackjack.get_card_rank_number(player_hands[hand_index][0]) != Blackjack.get_card_rank_number(player_hands[hand_index][1]))
                   || (player_hands[hand_index].length != 2)
                   || (player_hands.length >= (this.RULESET['max_split_count'] + 1)) ) {
                    break;
                }
    
                var new_hands   = player_hands.slice(0, hand_index);
                var after_hands = player_hands.slice(hand_index + 1);
                new_hands.push([player_hands[hand_index][0]]);
                new_hands.push([player_hands[hand_index][1]]);

                var new_results = hand_is_result_of_split.slice(0, hand_index);
                var after_results = hand_is_result_of_split.slice(hand_index + 1);
                new_results.push((Blackjack.get_card_rank_number(player_hands[hand_index][0]) == 1) ? 2 : 1);
                new_results.push((Blackjack.get_card_rank_number(player_hands[hand_index][0]) == 1) ? 2 : 1);
    
                var new_bets   = bets.slice(0, hand_index + 1);
                var after_bets = bets.slice(hand_index + 1);
                new_bets.push(original_bet);
    
                if( after_bets.length != after_hands.length ) break;
    
                for( var j = 0; j < after_hands.length; j++ ) {
                    new_hands.push(after_hands[j]);
                    new_bets.push(after_bets[j]);
                    new_results.push(after_results[j]);
                }
    
                player_hands = new_hands;
                bets = new_bets;
                hand_is_result_of_split = new_results;
                num_splits += 1;

                // Now deal a card to the new hand
                hand_index = next_hand(hand_index - 1);
            } else if( actions[i] == 'I' ) {
                insurance_bet = Math.floor( original_bet / 2 );
            }
    
            while( hand_index < player_hands.length && ( go_to_next_hand || should_go_to_next_hand() ) ) {
                hand_index = next_hand(hand_index);
                go_to_next_hand = false;
            }
        }
    
        // put the dealer cards in reverse order so that the 'dealer_shows' card is first
        var dealer_hand;
        if( card(3) == dealer_shows ) {
            dealer_hand = [card(3), card(1)];
        } else {
            dealer_hand = [card(1), card(3)];
        }
    
        for( ; !Blackjack.is_bust(dealer_hand) ; ) {
            var move = Blackjack.dealer_action(dealer_hand, this.RULESET['dealer_hits_on_soft_17']);
            if( move == Blackjack.HIT ) {
                dealer_hand.push(card(deal_index));
                deal_index += 1;
            } else if( move == Blackjack.STAND ) {
                break;
            }
        }
    
        var incomplete = ( i < actions.length || hand_index < player_hands.length );
    
        return {
            dealer_hand: dealer_hand,
            player_hands: player_hands,
            bets: bets,
            insurance_bet: insurance_bet
        };
    },

    show_provably_fair_dialog: function(game_info_package, proves_server_seed, proves_deck, proves_game_eval, proves_prize) {
        var li = game_info_package.game_seed.lastIndexOf(game_info_package.client_seed);
        var server_seed = game_info_package.game_seed.replace(game_info_package.client_seed,'');

        // Get the deck out of the deal_hash_source (deck should be part of the game hash)
        var first_close_paren = game_info_package.deal_hash_source.indexOf(')');
        var game_cards        = game_info_package.deal_hash_source.slice(1, 1+(52*2));

        // Main game stuff
        $("#provably_fair_gameid").html(game_info_package.game_id);
        $("#provably_fair_server_seed").html(server_seed);
        $("#provably_fair_server_seed_hash").html(game_info_package.server_seed_hash);
        $("#provably_fair_client_seed").html(game_info_package.client_seed);
        $("#provably_fair_game_seed").html(game_info_package.game_seed);
        $("#provably_fair_game_hash").html(game_info_package.deal_hash);
        $("#provably_fair_game_cards").html(game_cards);

        var pretty_actions = function(s) {
            var ret = [];
            var strings = {
                "I": "Insurance",
                "S": "Split",
                "T": "Stand",
                "D": "Double Down",
                "H": "Hit"
            };
            for( var si = 0; si < s.length; si++ ) {
                ret.push(strings[s[si]]);
            }
            if( ret.length > 0 ) {
                return ret.join(", ");
            } else {
                return "N/A";
            }
        }

        $("#provably_fair_actions").html(pretty_actions(game_info_package.actions));
        $("#provably_fair_game_eval").html(Blackjack.get_pretty_game_eval(game_info_package.game_eval));
        
        var total_bet = game_info_package.server_reported_bets.reduce(function(a, b) { return a+b; }, 0) + game_info_package.insurance_bet;
        $("#provably_fair_total_bet").html(Bitcoin.int_amount_to_string(total_bet));
        if( game_info_package.progressive_bet > 0 ) {
            $("#provably_fair_progressive_bet").html(" + " + Bitcoin.int_amount_to_string(game_info_package.progressive_bet) + " BTC (progressive bet)");
        }

        $("#provably_fair_prize").html(Bitcoin.int_amount_to_string(game_info_package.prize_total - game_info_package.progressive_win));

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
            $("#provably_fair_proves_deck").css('visibility', 'visible');
            $("#provably_fair_proves_deck").addClass( proves_deck ? "pass" : "fail" );
        }, 1000);
    	window.setTimeout(function() { 
            $("#provably_fair_proves_game_eval").css('visibility', 'visible');
            $("#provably_fair_proves_game_eval").addClass( proves_game_eval ? "pass" : "fail" );
        }, 1500);
    	window.setTimeout(function() { 
            $("#provably_fair_proves_prize").css('visibility', 'visible');
            $("#provably_fair_proves_prize").addClass( proves_prize ? "pass" : "fail" );
        }, 2000);

 
        $('#provably_fair_dialog').lightbox_me({
            centered: true,
            onLoad: function() {
                $('#pf_tab_main').click();
                $('#provably_fair_dialog').trigger('reposition');
            }
        }); 
    },

    draw_hand_text_on_all_hands: function() {
        var dealer_cards = this.get_hand(this.dealer_hand);

        if( Blackjack.is_bust(dealer_cards) ) {
            this.add_word_to_hand(this.dealer_hand, 'bust');
        }

        var has_split = this.player_hands.length > 1;

        for( var hi = 0; hi < this.player_hands.length; hi++ ) {
            var player_cards = this.get_hand(this.player_hands[hi]);

            if( Blackjack.is_bust(player_cards) ) {
                this.player_hands[hi].find(".hand_holder").addClass("dimmed");
                this.add_word_to_hand(this.player_hands[hi], 'bust');
                continue;
            }

            var prize = Blackjack.get_prize( dealer_cards, player_cards, 10, has_split );
            if( prize == 10 ) {
                this.add_word_to_hand(this.player_hands[hi], 'push');
                continue;
            } else if( prize > 10 ) {
                if( !has_split && Blackjack.is_blackjack(player_cards) ) {
                    this.add_word_to_hand(this.player_hands[hi], 'blackjack');
                }
                else {
                    this.add_word_to_hand(this.player_hands[hi], 'win');
                }
                continue;
            } else {
                this.player_hands[hi].find(".hand_holder").addClass("dimmed");
                this.add_word_to_hand(this.player_hands[hi], 'lose');
                continue;
            }
        }
    },
    
    add_game_to_leaderboard: function( finish_result, game_info_package ) {
        
        var that = this;
        var timestamp = (new Date()).getTime() / 1000;
        var winnings = reduce(game_info_package.prizes, function(a, b) { return a+b; }, 0);
        winnings += game_info_package.progressive_win;
        
        var inttotalbet = 0;
        for( var i = 0; i < game_info_package.bets.length; i++ ) {
            inttotalbet += game_info_package.bets[i];
        }

        inttotalbet += game_info_package.insurance_bet;

        var intwinnings = winnings;
        var intgameearnings = intwinnings - inttotalbet;

        var game_eval = Blackjack.get_game_eval( game_info_package.dealer_hand, game_info_package.player_hands, game_info_package.original_bet, game_info_package.bets, game_info_package.insurance_bet > 0 );
        var lb = {
            player_ident: account_system.player_ident,
            public_id: account_system.public_id,
            timestamp: timestamp,
            game: "blackjack",
            gamedata: {
                "game_eval": game_eval,
                "progressive_win": game_info_package.progressive_win,
                "unique_id": game_info_package.unique_id,
                "inttotalbet": inttotalbet,
                "intprogressivebet": game_info_package.progressive_bet,
                "intwinnings": intwinnings,
                "intgameearnings": intgameearnings,
                "progressive_hand": this.last_progressive_hand
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
            this.show_server_lied_dialog(game_check, null, game_info_package.game_id);
        }

        new_row.find("div.verify_button").on('click', function() {
            that.check_game(true, game_info_package);
        });
    },


    finish_game: function(finish_result) {
        var that = this;

        // clear dealer hand and show everything
        this.dealer_hands_holder.html("");
        this.dealer_hand = this.add_hand(this.dealer_hands_holder);

        // Text evaluating dealer's score shouldn't *quite* be left-centered
        //this.dealer_hand.children(".hand_counter").css("margin-left", "70px");

        // add the first card right away then deal out the rest..
        this.add_card_to_hand(this.dealer_hand, finish_result.dealer_hand[0]);
        
        // create a closure on game_info_package, sealing in the game state into memory for...ev....ar.
        // this has to happen before calling local_done(), as that will change the next game server seed
        //  - It should be OK here, since the server seed is updated after this function in local_done().
        var game_info_package = this.package_game_info(finish_result); 

        var local_done = function() {
            var winnings = finish_result.prizes.reduce(function(a, b) { return a+b; }, 0);
            winnings += finish_result.progressive_win;
            that.update_bet_text(winnings);
            that.draw_hand_text_on_all_hands();
            if( winnings > 0 ) {
                window.setTimeout( function() {
                    if( finish_result.progressive_win > 0 ) {
                        sound_system.play_sound( "win_progressive" );
                    }
                    else {
                        sound_system.play_sound( "win1" ); 
                    }
                }, that.WIN_SOUND_DELAY);
            }
            
            if( game_info_package.progressive_win > 0 ) {
                //  - Can get the final cards from deal_hash_source
                // Only care about the first 5 cards dealt
                var game_cards        = game_info_package.deal_hash_source.slice(1, 5*2 + 1);
                var chopped_array = game_cards.match(/.{2}/g);
                
                var hand = Blackjack.get_progressive_hand_for_game( chopped_array, game_info_package.actions );
                that.last_progressive_hand = hand;
                
                if( hand == Blackjack.PROGRESSIVE_HAND_NOTHING ) {
                    console.log("Error, progressive hand is nothing yet progressive_win > 0");
                }
                else {
                    $(".sevens_name.win").removeClass("win");
                    $(".sevens_value.win").removeClass("win");
                    $("#progressive_label" + hand).addClass("win");
                    $("#progressive_value" + hand).addClass("win");
                }
            } else {
                that.last_progressive_hand = null;
            }

            that.set_progressive_jackpot(finish_result.progressive_jackpot);

            // update the buttons now while the counter goes up, so that a player can interrupt 
            // small countups (like blackjack) and continue with the game immediately.
            // on big wins, we delay this just slightly..
            if( game_info_package.progressive_win > 0 ) {
                window.setTimeout( function() {
                    that.game_state = that.GAME_STATE_PRE_DEAL;
                    that.update_controls();
                }, 500 );
            } else {
                that.game_state = that.GAME_STATE_PRE_DEAL;
                that.update_controls();
            }

            //  - Should also be showing the dealer's score while he's getting cards.
            that.show_hand_score(that.dealer_hand, true);
            // Can now show the updated credits value since the game is done.
            var credits_won = winnings / that.credit_btc_value;
            that.is_counting_up = true;
            // Skip the count up if you're in autoplay (since otherwise you won't see the final number)
            var start = 0;
            if( autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED ) {
                start = credits_won;
            } 
            that.counter_wins_timer_id = that.countup_wins(start, credits_won, game_info_package.progressive_win > 0, function() {
                that.is_counting_up = false;
                that.add_game_to_leaderboard(finish_result, game_info_package); 
                that.calculate_credits();
                that.set_next_server_seed_hash(finish_result.server_seed_hash);
            });
        }

        // determine if we should play out the dealer's hand...
        var playout_dealer = true;
        if( this.player_hands.length == 1 && Blackjack.is_blackjack(this.get_hand(this.player_hands[0])) ) {
            playout_dealer = false;
        } else {
            var all_bust = true;
            for( var pi = 0; pi < this.player_hands.length; pi++ ) {
                if(!Blackjack.is_bust(this.get_hand(this.player_hands[pi]))) {
                    all_bust = false;
                    break;
                }
            }
            if(all_bust) {
                playout_dealer = false;
            }
        }
        
        // if player has a blackjack and dealer does not, then just show dealer's two cards 
        if( !playout_dealer ) {
            this.add_card_to_hand(this.dealer_hand, finish_result.dealer_hand[1]);
            local_done();
            $("#dealer_hands_holder > div.hand_holder_container > div.hand_dimmer").addClass('clickable').off('click.show_cards').on('click.show_cards', function() {
                that.deal_cards(-1, [], finish_result.dealer_hand.slice(2), function() {});
                $(this).removeClass("clickable").off('click.show_cards');
            });
        } else {
            this.deal_cards(-1, [], finish_result.dealer_hand.slice(1), function() {
                local_done();
            });
        }
        
    },

    deal_cards: function(starting_hand_index, player_cards, dealer_cards, done) {
        var hand_index = starting_hand_index;
        var finished = false;

        var cards_to_deal = new Array();

        //var card_index = 0;
        //for( var card_index = 0; card_index < (player_cards.length + dealer_cards.length) && hand_index < this.player_hands.length; card_index++ ) {
        while( (player_cards.length > 0 || dealer_cards.length > 0 ) ) {
            //if( ( card_index % 2 ) == 0 && dealer_cards.length > 0 ) {
            if( dealer_cards.length > 0 ) {
                var next_card = dealer_cards[0];
                dealer_cards = dealer_cards.slice(1);

                var card_elem = this.add_card_to_hand(this.dealer_hand, next_card, true);
                cards_to_deal.push(card_elem);
                //continue;
            } 
            
            if( player_cards.length == 0 ) {
                //ran out of player cards, finish dealing dealer cards
                continue;
            }

            var next_card = player_cards[0];
            player_cards = player_cards.slice(1);

            var card_elem = this.add_card_to_hand(this.player_hands[hand_index], next_card, true);
            var player_hand = this.get_hand(this.player_hands[hand_index]);

            cards_to_deal.push(card_elem);
            
            if( Blackjack.is_bust(player_hand) || Blackjack.is_21(player_hand) ) {
                hand_index += 1;
                continue;
            } 

            if( player_hand.length == 2 && this.actions.indexOf("S") >= 0 ) {
                // we've split before, so we need to handle aces and such.
                if( Blackjack.get_card_rank_number(player_hand[0]) == 1 ) {
                    if( Blackjack.get_card_rank_number(player_hand[1]) == 1 ) {
                        if( !this.RULESET.can_resplit_aces ) {
                            hand_index += 1;
                            continue;
                        }
                    }

                    // ace and something else and cannot hit
                    if( !this.RULESET.can_hit_split_aces ) {
                        hand_index += 1;
                        continue;
                    }
                }
            }

            if( player_hand.length == 3 && this.actions[this.actions.length-1] == "D" ) {
                hand_index += 1;
                continue;
            }
        }
        
        if( cards_to_deal.length > 0 ) {
            //cards_to_deal[0].css("display", "");
            
            if( cards_to_deal.length == 4 ) {
                sound_system.play_sound("deal_four");
            }
            
            var that = this;
            var show_cards = function(i) {
                if( i < cards_to_deal.length ) {
                    if( cards_to_deal.length != 4 ) {
                        sound_system.play_rotating( "show_card" );
                    }
                    
                    cards_to_deal[i].css("display", "");
                    setTimeout(function() { show_cards(i+1); }, that.CARD_DELAY);
                } else {
                
                    //  - Ding ding if you can split
                    if( hand_index >= 0 && hand_index < that.player_hands.length ) {
                        var player_hand = that.get_hand(that.player_hands[hand_index]);

                        if( player_hand.length == 2 ) {
                            if( that.progressive_bet > 0 && Blackjack.get_card_rank_number(player_hand[0]) == 7 ) {
                                //  - Determine if this is 1 seven, 2 sevens suited/unsuited, and then do blinking goodness.
                                if( Blackjack.get_card_rank_number(player_hand[1]) == 7 ) {
                                    if( Blackjack.get_card_suit(player_hand[0]) == Blackjack.get_card_suit(player_hand[1]) ) {
                                        $("#progressive_label" + Blackjack.PROGRESSIVE_HAND_TWO_SUITED_SEVENS).addClass("win");
                                        $("#progressive_value" + Blackjack.PROGRESSIVE_HAND_TWO_SUITED_SEVENS).addClass("win"); 
                                    }
                                    else {
                                        $("#progressive_label" + Blackjack.PROGRESSIVE_HAND_TWO_UNSUITED_SEVENS).addClass("win");
                                        $("#progressive_value" + Blackjack.PROGRESSIVE_HAND_TWO_UNSUITED_SEVENS).addClass("win"); 
                                    } 
                                }
                                else {
                                    $("#progressive_label" + Blackjack.PROGRESSIVE_HAND_ONE_SEVEN).addClass("win");
                                    $("#progressive_value" + Blackjack.PROGRESSIVE_HAND_ONE_SEVEN).addClass("win"); 
                                }
                                sound_system.play_sound("seven_card");
                            } else {
                                if( that.player_hands.length <= that.RULESET.max_split_count && Blackjack.get_card_rank_number(player_hand[0]) == Blackjack.get_card_rank_number(player_hand[1]) ) {
                                    window.setTimeout( function() {
                                        sound_system.play_sound( "win_on_deal" );
                                    }, that.WIN_SOUND_DELAY);
                                } 
                            }
                        }
                    }
                    
                    //  - Happy blackjack sound
                    if( that.player_hands.length == 1 && hand_index == 0 && Blackjack.is_21(player_hand) ) {
                        window.setTimeout( function() {
                            sound_system.play_sound( "win_double_game" );
                        }, 500 );
                    } 
                    
                    //  - This will get called after a 100ms delay, since it needs to wait for that extra setTimeout() call.
                    done();
                }
            }

            setTimeout(function() { show_cards(0); }, this.CARD_DELAY);
        } else {
            done();
        }
    },

    activate_hand: function(hand_index) {
        // somehow let player know which hand is being decided
        $.each(this.player_hands, function(i, element) {
            if( i == hand_index || hand_index == null ) {
                $(element).find(".hand_holder").removeClass("dimmed");
            } else {
                $(element).find(".hand_holder").addClass("dimmed");
            }
        });
    },
    
    countup_wins: function( current, goal, show_fireworks, done ) {
        var that = this;
        
        if( show_fireworks && !isMobile.any() ) {
            this.maybe_create_firework();
        } 

        this.countup_wins_done = done;
        if( current >= goal ) {
            
            this.draw_win_amount( goal, this.WIN_TEXT_WIN );
            done();
            return;
        }

        this.draw_win_amount( current, this.WIN_TEXT_WIN );
        
        delta = Math.floor(this.bet_in_credits / 5);
        if( delta < 1 ) {
            delta = 1;
        }
        
        delay = 50;

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

    handle_standard_response: function(hand_index, response) {
        var that = this;
        var d = function() {
            that.activate_hand(response.finished ? null : response.next_hand);

            for( var hi = 0; hi < that.player_hands.length; hi++ ) {
                that.show_hand_score(that.player_hands[hi], hi < hand_index);
            }

            if( response.finished ) {
                that.finish_game(response);
            } else {
                that.next_hand = response.next_hand;
                that.game_state = that.GAME_STATE_PLAYER_DECISION;
                that.update_controls();
            }
        }

        if(response.intbalance != undefined) {
            account_system.set_btc_balance(response.intbalance, response.fake_intbalance);
            // Don't update credits if a game has just ended, since you'll see the added credits before the dealer has gotten his cards!
            if( !this.is_counting_up && (this.game_state == this.GAME_STATE_PRE_DEAL || this.game_state == this.GAME_STATE_PLAYER_DECISION) ) {
                this.calculate_credits();
            }
        }

        if(response.shutdown_time != undefined && response.shutdown_time != 0) {
            account_system.shutting_down(response.shutting_down);
        }

        if( response.cards != undefined ) {
            //alert(response.cards);
            //alert("next hand: " + response.next_hand);
            this.deal_cards(hand_index, response.cards, response.dealer_cards != undefined ? response.dealer_cards : [], d);
        } else {
            d();
        }
    },

    reseed: function(cb) {
        var that = this;
    	$.ajax({
    		url: "/blackjack/reseed"
    	}).done(function(reseed_request) { 
            if( reseed_request.result == true ) {
                that.set_next_server_seed_hash(reseed_request.server_seed_hash);
                cb();
            }
        });
    },

    handle_draw: function(e) {
        var that = this;

        if(e != undefined) e.preventDefault();

        if( this.game_state != this.GAME_STATE_PRE_DEAL ) return;
        
        //  - use common num_credits?
        if( account_system.get_active_btc_int_balance() < (this.bet + this.progressive_bet) ) {
            account_system.show_no_credits_dialog();
            return;
        }
        
        // Only check during pre-game, since we should allow 'hold' to finish games
        if( account_system.should_show_shutting_down_dialog() ) {
            account_system.show_shutting_down_dialog();
            return;
        }

     	//  - If seed is bad, get a new one and try again.
        if( this.next_server_seed_hash == null ) {
            this.reseed(function() {
                that.handle_draw();
            });
            return;
        }

        if( !this.check_client_seed() ) {
            return;
        }

        this.stop_countup_wins();
        this.reset_game();

        // Give the dealer his one and only empty hand
        this.dealer_hand = this.add_hand(this.dealer_hands_holder);

        // give the player the first empty hand
        this.player_hands.push(this.add_hand(this.player_hands_holder));
        
        sound_system.play_sound( "pay_coins" );
        
        var credits_delta = (this.current_bet + this.current_progressive_bet) / this.credit_btc_value;
    	this.num_credits -= credits_delta; 
    	this.update_credits(); 
        use_fake_credits_string = "use_fake_credits=" + account_system.use_fake_credits;

        this.client_seed = $("#next_client_seed").val();
        $("#next_client_seed").prop('disabled', true); 

    	$.ajax({
    		url: "/blackjack/deal?bet=" + this.current_bet + "&progressive_bet=" + this.current_progressive_bet + "&server_seed_hash=" + this.next_server_seed_hash + "&client_seed=" + this.client_seed + "&" + use_fake_credits_string
    	}).done(function(deal_result) { 
    	    if( deal_result.error != undefined && deal_result['error'] != null ) {
                that.num_credits += credits_delta;
                that.update_credits();
                that.game_state = that.GAME_STATE_PRE_DEAL;
                that.update_controls();
    	        if( deal_result['error'] == "insufficient_funds" ) {
    	            account_system.show_no_credits_dialog();
    	        } else if( deal_result['error'] == 'shutting_down' ) {
                    account_system.show_shutting_down_dialog();
                } else if( deal_result['error'] == 'need_seed' ) {
                    that.next_server_seed_hash = null;
                    that.handle_draw();
                }
    	        else {
    	            alert("Internal server error. Please try again later. (" + deal_result['error'] + ")" );
    	        }
            } 
            else {
                that.current_game_id   = deal_result.game_id;
                that.current_unique_id = deal_result.unique_id;
                that.current_deal_hash = deal_result.deal_hash;
                that.dealer_shows      = deal_result.dealer_shows;

                //set up the dealt cards for the dealer
                deal_result.dealer_cards = [ 'back', deal_result.dealer_shows ];

                // Deal out cards as necessary
                that.handle_standard_response(0, deal_result);
            }
    	}).fail(function() { 
            that.num_credits += credits_delta;
            that.update_credits();
            that.game_state = that.GAME_STATE_PRE_DEAL;
            that.update_controls();
    	    alert("Error connecting to server. Please check your internet connection, try again, or reload the page."); 
        });

        this.game_state = this.GAME_STATE_DEALING;
        this.update_controls();
    },

    revert_failed_game_action: function( expected_action, credits_delta, fail_reason ) {
        var last_action = this.actions.pop(); 
        if( last_action != expected_action ) {
            console.log("Error: expected last_action = " + expected_action + " but instead got " + last_action); 
        }
        this.num_credits += credits_delta;
        this.update_credits();
        this.game_state = this.GAME_STATE_PLAYER_DECISION;
        this.update_controls();
        if( fail_reason == this.FAIL_REASON_AJAX_ERROR ) {
    	    alert("Error connecting to server. Please check your internet connection, try again, or reload the page."); 
    	}
    	else {
            account_system.show_no_credits_dialog();
    	}
    },
    
    handle_hit: function() {
        var that = this;
        var hand_index = this.next_hand;

        if( this.game_state != this.GAME_STATE_PLAYER_DECISION ) return;

        this.actions.push("H");

        var timestamp = (new Date()).getTime();
        $.ajax({
    		url: "/blackjack/hit?game_id=" + this.current_game_id + "&hand_index=" + hand_index + "&timestamp=" + timestamp
    	}).done(function(hit_result) { 
            if( hit_result.error != undefined ) {
                alert("Hit error: " + hit_result.error);
            } else {
                // Deal out cards as necessary
                that.handle_standard_response(hand_index, hit_result);
            }
    	}).fail(function() { 
    	    that.revert_failed_game_action('H', 0, that.FAIL_REASON_AJAX_ERROR);
        });

        this.game_state = this.GAME_STATE_HITTING;
        that.update_controls();
    },

    handle_stand: function() {
        var that = this;
        var hand_index = this.next_hand;
        var next_hand = hand_index + 1; //deal any cards in splits to the next hand

        if( this.game_state != this.GAME_STATE_PLAYER_DECISION ) return;

        this.actions.push("T");

        if( next_hand < this.player_hands.length ) {
            this.activate_hand(next_hand);
        } else {
            this.activate_hand(null);
        }

        var timestamp = (new Date()).getTime();
    	$.ajax({
    		url: "/blackjack/stand?game_id=" + this.current_game_id + "&hand_index=" + hand_index + "&timestamp=" + timestamp
    	}).done(function(stand_result) { 
            if( stand_result.error != undefined ) {
                alert("Stand error: " + stand_result.error);
            } else {
                // Deal out cards as necessary
                that.handle_standard_response(next_hand, stand_result);
            }
    	}).fail(function() { 
    	    that.revert_failed_game_action('T', 0, that.FAIL_REASON_AJAX_ERROR);
        });

        this.game_state = this.GAME_STATE_STANDING;
        that.update_controls();
    },

    handle_double: function() {
        var that = this;
        var hand_index = this.next_hand;

        if( this.game_state != this.GAME_STATE_PLAYER_DECISION ) return;

        this.actions.push("D");
        
        var credits_delta = this.current_bet / this.credit_btc_value;
    	this.num_credits -= credits_delta;
    	this.update_credits(); 

        var timestamp = (new Date()).getTime();
    	$.ajax({
    		url: "/blackjack/double?game_id=" + this.current_game_id + "&hand_index=" + hand_index + "&timestamp=" + timestamp
    	}).done(function(double_result) { 
            if( double_result.error != undefined ) {
    	        if( double_result.error == "insufficient_funds" ) {
            	    that.revert_failed_game_action('D', credits_delta, this.FAIL_REASON_INSUFFICIENT_FUNDS);
    	        } 
    	        else {
                    alert("Unhandled server error: " + double_result.error);
                }
    	        
            } else {
                // Deal out cards as necessary
                that.handle_standard_response(hand_index, double_result);
            }
    	}).fail(function() { 
    	    that.revert_failed_game_action('D', credits_delta, that.FAIL_REASON_AJAX_ERROR);
        });

        this.game_state = this.GAME_STATE_DOUBLING;
        that.update_controls();
    },

    handle_split: function() {
        var that = this;
        var hand_index = this.next_hand;

        if( this.game_state != this.GAME_STATE_PLAYER_DECISION ) return;


        this.actions.push("S");
        
        var credits_delta = this.current_bet / this.credit_btc_value;
    	this.num_credits -= credits_delta;
    	this.update_credits(); 

        var timestamp = (new Date()).getTime();
    	$.ajax({
    		url: "/blackjack/split?game_id=" + this.current_game_id + "&hand_index=" + hand_index + "&timestamp=" + timestamp
    	}).done(function(split_result) { 
            if( split_result.error != undefined ) {
    	        if( split_result.error == "insufficient_funds" ) {
            	    that.revert_failed_game_action('S', credits_delta, this.FAIL_REASON_INSUFFICIENT_FUNDS);
    	        } 
    	        else {
                    alert("Unhandled server error: " + split_result.error);
                }
            } else {
            
                //  - I moved all this split code to the success handler so that it doesn't all need to be reverted on server error.
                // If the user experience sucks I can look into reverting all this stuff.
                var num_splits = count_elem(that.actions, "S");

                var split_card = that.pop_card_from_hand(that.player_hands[hand_index]);
                var new_hand   = that.insert_hand(that.player_hands_holder, hand_index+1); 
                that.add_card_to_hand(new_hand, split_card);

                var last = that.player_hands.slice(hand_index+1);
                that.player_hands = that.player_hands.slice(0, hand_index+1);
                that.player_hands.push(new_hand);
                for( var i = 0; i < last.length; i ++ ) {
                    that.player_hands.push(last[i]);
                }

                // adjust the margins based on how many splits there are.. ie., first split should be further apart..
                if( num_splits == 1 ) {
                    that.player_hands_holder.find(".hand_dimmer").addClass("first_two");
                } else if( num_splits == 2 ) {
                    that.player_hands_holder.find(".hand_dimmer").removeClass("first_two").addClass("three_split");
                } else {
                    that.player_hands_holder.find(".hand_dimmer").removeClass("three_split");
                }

                that.activate_hand(hand_index);
                
                // Deal out cards as necessary
                that.handle_standard_response(hand_index, split_result);
            }
    	}).fail(function() { 
    	    that.revert_failed_game_action('S', credits_delta, that.FAIL_REASON_AJAX_ERROR);
        });

        this.game_state = this.GAME_STATE_SPLITING;
        this.update_controls();
    },

    handle_insurance: function() {
        var that = this;
        var hand_index = this.next_hand;

        if( this.game_state != this.GAME_STATE_PLAYER_DECISION ) return;

        this.actions.push("I");

        var credits_delta = (this.current_bet / this.credit_btc_value) / 2.0;
    	this.num_credits -= credits_delta;
    	this.update_credits(); 
    	
        sound_system.play_sound( "boop" ); 
        $("#control_insurance").addClass("used"); 

        var timestamp = (new Date()).getTime();
    	$.ajax({
    		url: "/blackjack/insurance?game_id=" + this.current_game_id + "&timestamp=" + timestamp
    	}).done(function(insurance_result) { 
            if( insurance_result.error != undefined ) {
    	        if( insurance_result.error == "insufficient_funds" ) {
                    $("#control_insurance").removeClass("used"); 
            	    that.revert_failed_game_action('I', credits_delta, this.FAIL_REASON_INSUFFICIENT_FUNDS);
    	        } 
    	        else {
                    alert("Unhandled server error: " + insurance_result.error);
                }
            } else {
                // If the game is finish, the user was correct with his insurance bet.
                // If the game is not finished, the user was not correct and must continue playing.
                $("#control_insurance").removeClass("used"); 
                if( insurance_result.finished == true ) {
                    $("#control_insurance_result").addClass("correct"); 
                } 
                else {
                    $("#control_insurance_result").addClass("incorrect"); 
                }
                
                // Deal out cards/end game as necessary
                that.handle_standard_response(hand_index, insurance_result)
            }
    	}).fail(function() { 
            $("#control_insurance").removeClass("used"); 
    	    that.revert_failed_game_action('I', credits_delta, that.FAIL_REASON_AJAX_ERROR);
        });

        this.game_state = this.GAME_STATE_INSURING;
        that.update_controls();
    },

    update_bet_text: function(prize) {
        var pb = '';
        if( this.progressive_bet != 0 ) {
            pb = '+' + Math.floor(this.progressive_bet / this.RULESET['bet_resolution']);
        }
        var bet = 'BET ' + Math.floor(this.bet / this.RULESET['bet_resolution']) + pb;

        $("#bet_text").html(bet);
        
        //  - Maybe draw DOUBLE if you doubled down? (second param to this)
        if( prize == undefined ) {
            this.draw_win_amount( 0, this.WIN_TEXT_WIN );
        }
        else {
            var credits_won = prize / this.credit_btc_value;
            this.draw_win_amount( credits_won, this.WIN_TEXT_WIN );
        }
    },

    // Called by AccountSystem
    //  - This could potentially be handled in common game code?
    handle_balance_update: function( intbalance )
    {
        if( !this.is_counting_up && (this.game_state == this.GAME_STATE_PRE_DEAL || this.game_state == this.GAME_STATE_PLAYER_DECISION) ) {
            this.calculate_credits();
        }
    },

    update_actions_for_game: function() {

        var that = this;
        var player_hand = this.get_hand(this.player_hands[this.next_hand]);

        // the only way we have 21 (and can't hit/double) is if the dealer is showing an ace
        if( !Blackjack.is_21(player_hand) ) {
            $("#control_hit").addClass("on").off('click').on('click', function() { that.handle_hit(); });

            //  - Can not hit split aces
            if( !that.RULESET.can_hit_split_aces ) {
                var has_split = this.actions.indexOf("S") >= 0;
                if( has_split && Blackjack.get_card_rank_number(player_hand[0]) == 1 ) {
                    $("#control_hit").removeClass("on").off('click');
                }
            }

            if( player_hand.length == 2 ) {
                $("#control_double").addClass("on").off('click').on('click', function() { that.handle_double(); });
            } else {
                $("#control_double").removeClass("on").off('click');
            }
        } else {
            $("#control_hit").removeClass("on").off('click');
            $("#control_double").removeClass("on").off('click');
        }

        $("#control_stand").addClass("on").off('click').on('click', function() { that.handle_stand(); });

        if( player_hand.length == 2 && Blackjack.get_card_rank_number(player_hand[0]) == Blackjack.get_card_rank_number(player_hand[1]) && count_elem(this.actions, "S") < this.RULESET.max_split_count ) {
            $("#control_split").addClass("on").off('click').on('click', function() { that.handle_split(); });
        } else {
            $("#control_split").removeClass("on").off('click');
        }

        var dealer_hand = this.get_hand(this.dealer_hand);
        if( dealer_hand.length == 2 && Blackjack.get_card_rank_number(dealer_hand[1]) == 1 && this.actions.length == 0 ) {
            $("#control_insurance").addClass("on").off('click').on('click', function() { that.handle_insurance(); });
        } else {
            $("#control_insurance").removeClass("on").removeClass("used").off('click');
        }
    },

    update_controls: function() {
        switch( this.game_state ) {
        case this.GAME_STATE_PRE_DEAL:
            $(".game_button").removeClass("on");
            $("#control_draw").addClass("on");
            $("#control_changebet").removeClass("disable");
            break;
        case this.GAME_STATE_PLAYER_DECISION:
            this.update_actions_for_game();
            $("#control_draw").removeClass("on").removeClass("bright");
            $("#control_changebet").addClass("disable");
            break;
        case this.GAME_STATE_DEALING:
        case this.GAME_STATE_HITTING:
        case this.GAME_STATE_STANDING:
        case this.GAME_STATE_DOUBLING:
        case this.GAME_STATE_SPLITING:
        case this.GAME_STATE_INSURING:
            $(".game_button").removeClass("on");
            $("#control_draw").removeClass("on").removeClass("bright");
            $("#control_changebet").addClass("disable");
            $("#control_insurance_result").removeClass("correct").removeClass("incorrect");
            break;
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
        	url: "/blackjack/set_progressive_bet?progressive_bet=" + this.progressive_bet + "&_=" + (new Date()).getTime()
        }).done(function(set_result) { 
            // don't care if this succeeds or not.
        });
    },

    handle_auto: function() {
        if( autoplay_system.autoplay_phase != autoplay_system.AUTOPLAY_PHASE_STOPPED ) {
            autoplay_system.autoplay_stop();
            return;
        }

        $("#autoplay_dialog").css('width', '500px');
        this.set_autoplay_options();

		let autoplay_dialog = document.querySelector("#autoplay_dialog");
		let options = autoplay_dialog && isMobile.any() ? mobileLightboxOptions(autoplay_dialog) : {};
		$("#autoplay_dialog").lightbox_me({
			centered: true,
			...options
		});
    },

    set_autoplay_options: function() {
        $("#autoplay_mode_normal_speed option:selected").removeAttr("selected");
        $("#autoplay_mode_normal_insurance option:selected").removeAttr("selected");

        $($("#autoplay_mode_normal_speed option")[autoplay_system.autoplay_speed]).prop('selected', true);
        $($("#autoplay_mode_normal_insurance option")[this.autoplay_take_insurance]).prop('selected', true);
    },

    handle_autoplay_start: function() {
        this.last_progressive_hand = null;
        autoplay_system.autoplay_start(false);
        $("#autoplay_dialog").trigger("close");
    },

    set_bet_amount: function( amount, caused_by_direct_input ) {
        this.bet_in_credits = amount;
        this.bet = this.bet_in_credits * this.credit_size;

        // if you are typing in the number, no need to mess with the value again, since it screws with your cursor position.
        // Without this, hitting left/right arrow keys + home always throw you to the end of the input control.
        if( !caused_by_direct_input ) {
            $("#input_bet_amount").val( this.bet_in_credits );
        }
        this.update_bet_text();
    },

    handle_input_bet_amount: function() {
        // if(this.selected_bet == null) return;
        
        var str = $("#input_bet_amount").val();
        for( var i = 0; i < str.length; i++ ) {
            if( str[i] < '0' || str[i] > '9' ) {
                $("#input_bet_amount").addClass("error");
                return;
            }
        }

        var new_value = parseInt(str, 10);
        var how_much = new_value - this.bet_in_credits;

        $("#input_bet_amount").removeClass("error"); 
        if( isNaN(new_value) ) {
            if( str != '' ) $("#input_bet_amount").addClass("error");
            return;
        } 


        var checked_credits = this.check_bet_in_credits_bounds( new_value );
        if( checked_credits != new_value ) {
            // The credits number was chopped against upper/lower bounds, so it's not a valid bet.
            $("#input_bet_amount").addClass("error");
            return;
        }

        this.set_bet_amount( new_value, true );
    },
        
    check_bet_in_credits_bounds: function( credits ) {
        var max_bet_in_credits = Math.floor(this.RULESET.maximum_bet / this.RULESET['bet_resolution']);
        var pb = Math.floor(this.progressive_bet / this.RULESET['bet_resolution']);
        if( credits + pb > Math.floor(this.num_credits) ) {
            credits = Math.floor(this.num_credits) - pb;
        }
        else if( credits > max_bet_in_credits ) {
            credits = max_bet_in_credits;
        }

        //  - The above if statement can result in the bet becoming 0 (invalid), so this should not
        // be an else_if.
        if( credits < 1 ) {
            credits = 1;
        }
        return credits;
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
        case 9: //tab
            if( this.progressive_bet == 0 ) {
                this.handle_change_progressive_bet("0.0001",true);
            } else {
                this.handle_change_progressive_bet(null, true);
            }
            return true;
        case 38: // up arrow
            if( $("#input_bet_amount").is(":focus") ) {
                var new_value = this.bet_in_credits + 1;
                new_value = this.check_bet_in_credits_bounds( new_value );
                this.set_bet_amount( new_value, false );
            }
            return true;
        case 40: // down arrow
            if( $("#input_bet_amount").is(":focus") ) {
                var new_value = this.bet_in_credits - 1;
                new_value = this.check_bet_in_credits_bounds( new_value );
                this.set_bet_amount( new_value, false );
            }
            return true;
        case 13: //enter, stand
            if( $("#input_bet_amount").is(":focus") ) {
                return false;
            }

            if( this.game_state == this.GAME_STATE_PRE_DEAL ) {
                this.handle_draw();
            } else if( this.game_state == this.GAME_STATE_PLAYER_DECISION ) {
                this.handle_stand();
            }
            return true;
        case 32: //space
            this.handle_hit();
            return true;
        case 68: //d
            this.handle_double();
            return true;
        case 73: //i
            this.handle_insurance();
            return true;
        case 83: //s
            this.handle_split();
            return true;
        }
        return false;
    },

    get_pretty_blackjack_rules: function() {
        content = "";
        
        add_rule = function(s, text) {
            s += "<div class='blackjack_rule'>";
            s += text;
            s += "</div>";
            return s;
        }
        
        // content += "<div><b>EXPECTED RETURN: 99.5%</b></div><br/>";
        content = add_rule(content, "Minimum bet is " + Bitcoin.int_amount_to_string(this.RULESET.bet_resolution) + " BTC" );
        content = add_rule(content, "Maximum bet is " + Bitcoin.int_amount_to_string(this.RULESET.maximum_bet) + " BTC" );
        content = add_rule(content, "Blackjack pays " + this.RULESET.blackjack_pays[0] + ":" + this.RULESET.blackjack_pays[1] );
        content = add_rule(content, "Insurance pays " + this.RULESET.insurance_pays[0] + ":" + this.RULESET.insurance_pays[1] );
        content = add_rule(content, "Number of decks is " + this.RULESET.number_of_decks);
        content = add_rule(content, "Number of allowed splits is " + this.RULESET.max_split_count);
        if( this.RULESET.dealer_hits_on_soft_17 ) {
            content = add_rule(content, "Dealer hits on soft 17");
        }
        else {
            content = add_rule(content, "Dealer does not hit on soft 17");
        }
        if( this.RULESET.can_double_after_split ) {
            content = add_rule(content, "Can double after split");
        }
        else {
            content = add_rule(content, "Can not double after split"); 
        }
        if( this.RULESET.can_hit_split_aces ) {
            content = add_rule(content, "Can hit split aces");
        }
        else {
            content = add_rule(content, "Can not hit split aces");
        }
        if( this.RULESET.can_resplit_aces ) {
            content = add_rule(content, "Can resplit aces");
        }
        else {
            content = add_rule(content, "Can not resplit aces");
        }
        content = add_rule(content, "Can double on " + this.RULESET.can_double_on);
        if( this.RULESET.dealer_peeks ) {
            content = add_rule(content, "Dealer peeks");
        }
        else {
            content = add_rule(content, "Dealer does not peek");
        }
        return content;
    },

    init_handlers: function() {
        var that = this;

        $("#control_draw").click( function(e) {
            that.handle_draw(e);
        });

        $("#control_changebet").on('click', function() {
            if( that.is_bet_table_active ) {
                that.hide_bet_table();
            }
            else {
                that.show_bet_table();
            }
            sound_system.play_sound("boop");
        });

        var autoplay_speed_changed = function(option) {
            autoplay_system.autoplay_speed = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_normal_speed").change( function() { autoplay_speed_changed($(this)); } );

        var autoplay_take_insurance_changed = function(option) {
            that.autoplay_take_insurance = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_normal_insurance").change( function() { autoplay_take_insurance_changed($(this)); } );

        $("#control_autoplay").click( function() {
            that.handle_auto();
        });

        $("#autoplay_dialog .autoplay_start_image").click( function() {
            that.handle_autoplay_start();
        });

        $("#progressive_bet_none").on('click', function() {
            that.handle_change_progressive_bet(null,true);
        });

        $("#progressive_bet_0001").on('click', function() {
            that.handle_change_progressive_bet("0.0001",true);
        });

        /*
        $(".show_blackjack_rules_link").click( function() {
            content = that.get_pretty_blackjack_rules(); 
            dialog_system.show_generic_dialog("RULES", content);
            return false;
        });
        */
        
        $(".show_expected_return_link").on( 'click', function() {
            that.show_expected_return_dialog();
            return false;
        });
        $(".show_provably_fair_explain_link").click( function() {
            dialog_system.show_provably_fair_explain_dialog(that.game_name);
            return false;
        });

        $(".dialog .confirm_button").click( function() {
            $('.dialog').trigger('close');
        });

        $(window).on('beforeunload', function() {
            if( that.game_state != that.GAME_STATE_PRE_DEAL ||
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED || 
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING ) {
                return 'You are in the middle of a game.  If you leave, you will be forfeiting your bet.'
            }
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

        $("#change_bet_table .change_bet_delta").click( function() {
            var new_value;

            if ($(this).attr("delta") === "max") {
                new_value = parseInt( that.num_credits );
            } else {
                new_value = that.bet_in_credits + parseInt( $(this).attr("delta") );
            }

            new_value = that.check_bet_in_credits_bounds( new_value );
            that.set_bet_amount( new_value, false );
        });
        //  - This prevents the text selection stuff from showing up if you double click on +100
        $("#change_bet_table").attr('unselectable','on').css('UserSelect','none').css('MozUserSelect','none'); 
    },

    set_progressive_jackpot: function(intvalue) {
        // convert progressive_jackpot (which is in BTC) to credits..
        var credit_progressive_jackpot = '' + intvalue / this.credit_size;
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
        var block_width = 221;
        var padding     = 2;

        for( var i = 1; i <= this.RULESET.progressive_paytable.length; i++ ) {
            $("#progressive_label" + i).css("width", (block_width - $("#progressive_value" + i).outerWidth() - padding) + "px");
        }
    }
});

function init_blackjack(key, my_player_ident, my_public_id, starting_server_seed_hash, initial_leaderboards, initial_mygames, chatlog, ruleset, default_progressive_bet, sound_volume ) {
    var sound_list = [ 
        ['boop', 'boop.wav', true, 1],
        ['win1', 'win1.wav', false, 1],
        ['pay_coins', 'coinpay.wav', false, 1],
        ['win_on_deal', 'slot_machine_bet_10.wav', false, 1],
        ['win_double_game', 'slot_machine_win_22.wav', false, 1],
        ['seven_card', 'slot_machine_bet_01.wav', false, 1],
        ['win_progressive', 'slot_machine_win_19.wav', false, 1],
        ['deal_four', 'deal_four.wav', false, 1],
        ['show_card', 'carddeal.wav', false, 3],
    ];
    common_init( 'Blackjack', key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, chatlog, sound_list, sound_volume );
    
    game_system = new BlackjackSystem( starting_server_seed_hash, ruleset, default_progressive_bet );
    game_system.call_update_service();

    dialog_system.init_help( ["/static/images/bj-help-howtoplay.png", "/static/images/bj-help-extras.png", "#help_rules"] ); 

    //we need to resize chat again, since blackjack does some progressive table size changing..
    chat_system.adjust_height(false);
}
