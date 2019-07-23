var RouletteSystem = GameSystem.extend({
    init: function (starting_server_seed_hash, ruleset, last_numbers, default_progressive_bet) {
        //  - Need a correct value for credits_btc_value_in!
        //  - Why is the order of the games list not consistent?
        this._super('roulette', starting_server_seed_hash, 10000, ['blackjack', 'videopoker', 'roulette']);

        this.GAME_STATE_PRE_SPIN = 0;
        this.GAME_STATE_SPINNING = 1;

        this.FAIL_REASON_AJAX_ERROR = 0;
        this.FAIL_REASON_INSUFFICIENT_FUNDS = 1;

        this.TIME_UPDATE_DELAY = 50;
        this.time_since_blink = 0;

        this.credit_btc_value = Bitcoin.string_amount_to_int("0.0001");
        this.AUTOPLAY_STRATEGY_MARTINGALE = 0;
        this.AUTOPLAY_STRATEGY_LABOUCHERE = 1;
        this.AUTOPLAY_STRATEGY_LUCKY_NUMBER = 2;

        this.bet = 0;
        this.last_bet = 0;
        this.is_counting_up = false;
        this.selected_bet = null;
        this.can_spin = false;

        this.bets = {};
        this.last_bets = {};
        this.last_prizes = {};
        // Javascript sucks and you can't quickly get the number of items in a dictionary... so maintain this variable instead
        this.RULESET = ruleset;

        for (var i = 1; i < this.RULESET.progressive_paytable.length - 1; i++) {
            $("#progressive_value" + i).html(this.RULESET.progressive_paytable[i]);
        }

        this.progressive_jackpot = 0;
        this.progressive_jackpot_timeout_id = null;
        this.last_progressive_hand = null;

        this.game_state = this.GAME_STATE_PRE_SPIN;
        this.reset_game();
        this.init_handlers();
        this.time_update();
        this.update_controls();

        this.update_progressive_label_widths();
        this.set_progressive_bet(default_progressive_bet);


        //this.WHEEL_SPEED = 0.2;
        this.WHEEL_SPEED = 0.1;
        this.WHEEL_STATE_STOPPED = 0;
        this.WHEEL_STATE_EASE_IN = 1;
        this.WHEEL_STATE_SEARCH = 2;
        this.WHEEL_STATE_EASE_OUT = 3;
        this.wheel_state = this.WHEEL_STATE_STOPPED;
        this.wheel_angle_goal = 0;
        if (last_numbers && last_numbers.length > 0)
            this.wheel_angle_current = this.get_num_wheel_angle(last_numbers[last_numbers.length-1][0]);
        else this.wheel_angle_current = this.get_num_wheel_angle(0);
         $("#wheel_img").rotate({ angle: this.wheel_angle_current });
        this.wheel_update_delay = 50;
        this.last_wheel_update = 0;
        this.spin_result = null;

        this.bet_per_click = this.credit_btc_value;

        this.autoplay_lucky_number_number = undefined;
        this.autoplay_strategy = this.AUTOPLAY_STRATEGY_MARTINGALE;
        this.autoplay_martingale_table_limit = 0;
        this.autoplay_labouchere_bet_size = 250;
        this.autoplay_labouchere_number_count = 100;
    },

    wheel_update: function () {
        if (this.wheel_state == this.WHEEL_STATE_STOPPED) {
            console.log("WHEEL_STATE_STOPPED inside wheel_update()");
            return;
        }
        //  - Don't do wheel update calls all the time if the wheel is not spinning!
        var that = this;
        var now = (new Date()).getTime();
        var delta = (now - this.last_wheel_update) * this.WHEEL_SPEED;
        this.last_wheel_update = now;

        //  - Easing function when wheel is slowing down
        // Subtract since the wheel spins counter clockwise
        this.wheel_angle_current -= delta;

        //console.log(this.wheel_angle_current);
        //console.log(this.wheel_angle_goal);
        if (this.wheel_state == this.WHEEL_STATE_SEARCH && this.wheel_angle_current < this.wheel_angle_goal && this.wheel_angle_current + delta > this.wheel_angle_goal) {
            this.wheel_angle_current = this.wheel_angle_goal;
            this.wheel_state = this.WHEEL_STATE_STOPPED;
            //  - Callback stuff!
            // Finished game stuff
            this.finish_game(this.spin_result);

        }

        this.wheel_angle_current = (this.wheel_angle_current + 360) % 360;

        $("#wheel_img").rotate({ angle: this.wheel_angle_current });

        if (this.wheel_state != this.WHEEL_STATE_STOPPED) {
            window.setTimeout(function () {
                that.wheel_update();
            }, 20);
        }
    },

    wheel_start: function () {
        /*
        if( this.wheel_state != this.WHEEL_STATE_STOPPED ) {
        console.log("ERROR: wheel_start() called when wheel is already spinning");
        return;
        }
        this.last_wheel_update = (new Date()).getTime();
        this.wheel_state = this.WHEEL_STATE_EASE_IN;
        that.wheel_update();
        */
        $("#wheel_spinning").addClass("on");
        $("#ball").removeClass("on");
    },
    wheel_stop: function (num) {
        $("#wheel_img").rotate({ angle: this.get_num_wheel_angle(num) });
        $("#wheel_spinning").removeClass("on");
        $("#ball").addClass("on");
    },

    wheel_singlespin_update: function () {
        var that = this;
        if (this.wheel_state == this.WHEEL_STATE_STOPPED) {
            return;
        }

        // Map from 0 to 360 
        //  - Easing function when wheel is slowing down
        var now = (new Date()).getTime();
        var angle = (now - this.wheel_singlespin_start_time) * 360.0 * 0.0005;

        if (angle > 360) {
            angle = 0;
            this.wheel_state = this.WHEEL_STATE_STOPPED;
        }

        $("#wheel_img").rotate({ angle: angle });
        window.setTimeout(function () {
            that.wheel_singlespin_update();
        }, 20);

    },
    wheel_singlespin_stop: function () {
        this.wheel_state = this.WHEEL_STATE_STOPPED;
    },
    wheel_singlespin_start: function () {
        this.wheel_singlespin_start_time = (new Date()).getTime();
        this.wheel_state = this.WHEEL_STATE_SEARCH;
        this.wheel_singlespin_update();
    },

    time_update: function () {
        var that = this;
        this.time_since_blink += this.TIME_UPDATE_DELAY;

        if (this.time_since_blink > this.BLINK_DELAY) {
            this.time_since_blink = 0;
            this.blink_on = !this.blink_on;

            if (this.blink_on) {
                if (this.can_spin) {
                    $("#control_spin").addClass("bright");
                    $(".zeroes_name.win").addClass("blink");
                    $(".zeroes_value.win").addClass("blink");
                }
            }
            else {
                $("#control_spin").removeClass("bright");
                $(".zeroes_name.win").removeClass("blink");
                $(".zeroes_value.win").removeClass("blink");
            }

        }

        if (this.game_state == this.GAME_STATE_SPINNING) {
            var angle = Math.random() * 300;
            $("#wheel_spinning_img").rotate({ angle: angle });
        }

        window.setTimeout(function () {
            that.time_update();
        }, this.TIME_UPDATE_DELAY);
    },

    //  - Move to common code?
    call_update_service: function () {
        var that = this;
        if (this.user_is_active) {
            var timestamp = (new Date()).getTime();
            $.ajax({
                url: "/roulette/update?progressive_bet=" + this.progressive_bet + "&last=" + leaderboard_system.last_leaderboard_time + "&chatlast=" + chat_system.last_chatlog_index + "&_=" + timestamp
            }).done(function (update_result) {
                wowbar_system.handle_update(update_result);

                leaderboard_system.process_leaderboard_data(update_result.leaderboard, false);
                chat_system.process_chatlog(update_result.chatlog, false);

                that.set_progressive_jackpot(update_result.progressive_jackpot);
            });
        }

        window.setTimeout(function () {
            that.call_update_service();
        }, 2000);
    },

    reset_game: function () {
        this.update_bet_text();
        this.update_controls();

        //  - Make these variable names compatible with videopoker
        this.current_game_id = null;
        this.current_unique_id = null;
        this.current_bet = this.bet;
        this.current_progressive_bet = this.progressive_bet;

        this.counter_wins_timer_id = null;
    },

    package_game_info: function (finish_result) {
        var p = {
            game_id: finish_result.game_id,
            unique_id: finish_result.unique_id,
            ball_number: finish_result.ball_number,
            bets: clone(this.bets),
            server_seed_hash: this.next_server_seed_hash,
            client_seed: this.client_seed,
            game_seed: finish_result.game_seed,
            intlost: finish_result.intlost,
            total_bet: this.last_bet,
            progressive_bet: this.current_progressive_bet,
            intwinnings: finish_result.intwinnings,
            server_reported_prizes: clone(finish_result.prizes),
            progressive_win: finish_result.progressive_win,
            progressive_hand: finish_result.progressive_hand,
            last_numbers: finish_result.last_numbers
        };
        if (account_system.use_fake_credits) {
            p['unique_id'] = this.games_played;
        }
        return p;
    },

    check_game: function (show_dialog, game_info_package) {
        var proof_error = null;

        var proves_server_seed = false;
        var proves_ball = false;
        var proves_prizes = false;
        var game_is_legit = false;

        // first make sure that our client seed was used in the game seed
        if (game_info_package.game_seed.indexOf(game_info_package.client_seed) != -1) {
            // Next, extract the server's seed from the game_seed and SHA-256 it, and make sure the hash matches the hash provided
            // before the hand is dealt.
            var li = game_info_package.game_seed.lastIndexOf(game_info_package.client_seed);
            var server_seed = game_info_package.game_seed.substr(0, li) + game_info_package.game_seed.substr(li + game_info_package.client_seed.length);
            if (SHA256(server_seed) == game_info_package.server_seed_hash) {
                proves_server_seed = true;

                // Next, produce a mersenne twister and pick a random number and verify it is the ball we got from the server
                // 1. Python's random module first hashes the game seed using SHA256
                // 2. The hash is turned into a sequence of bytes
                // 3. The bytes are appended to the seed
                // 4. The result is used to seed a Mersenne Twister

                // Concat the original seed with the hash of the seed
                var hash_bytes = new Array()
                for (var i = 0; i < game_info_package.game_seed.length; i++) {
                    hash_bytes.push(game_info_package.game_seed.charCodeAt(i));
                }

                var hashed_game_seed = (new jsSHA(game_info_package.game_seed, "ASCII")).getHash("SHA-512", "HEX");
                for (var i = 0; i < 128; i += 2) {
                    hash_bytes.push(parseInt(hashed_game_seed.substring(i, i + 2), 16));
                }

                // Convert the hash_bytes into an array of 32-bit words starting from the right
                var word_array = byte_array_to_words(hash_bytes);

                // Create a MT rng
                var twister = new MersenneTwister();
                twister.init_by_array(word_array, word_array.length);

                // At this point all we need to do is draw one number using randrange(1 minus number of zeros, 37)
                var check_cards = new Array();
                for (var deck = 0; deck < this.RULESET['number_of_decks']; deck++) {
                    check_cards = check_cards.concat(this.STANDARD_CARDS.slice(0));
                }
                var ball_number = randrange(twister, 1 - this.RULESET['number_of_zeros'], 37);

                // This verifies the ball provided by the server is correct.
                if (ball_number == game_info_package.ball_number) {
                    proves_ball = true;

                    // Since the game doesn't exist in multiple parts (there is no /deal then /hold), there's no need to verify that the shuffle was valid
                    // All we care about is that our client seed was incorporated into the RNG and that the server seed provided was correct. 

                    // Verify the cards dealt out were in the proper order from the deck
                    var valid_bets = Roulette.get_valid_bets(this.RULESET['number_of_zeros']);
                    var game_eval = Roulette.evaluate_game(valid_bets, game_info_package.bets, game_info_package.ball_number);
                    var prizes = game_eval[0];

                    var num_prizes = 0;
                    var all_prizes_are_correct = true;
                    for (var k in prizes) {
                        num_prizes += 1;
                        if (!(k in game_info_package.server_reported_prizes) || (game_info_package.server_reported_prizes[k] != prizes[k])) {
                            all_prizes_are_correct = false;
                            break;
                        }
                    }

                    var num_server_prizes = 0;
                    for (var k in game_info_package.server_reported_prizes) {
                        num_server_prizes += 1;
                    }

                    // If same number of prizes exist in each object AND the loop above passes, then the objects must be identical
                    if (num_server_prizes != num_prizes) {
                        all_prizes_are_correct = false;
                    }

                    var lost_is_correct = (game_eval[2] == game_info_package.intlost);
                    if (all_prizes_are_correct && lost_is_correct) {
                        proves_prizes = true;

                        // We need to verify the progressive win, but unfortunately because our system lets you play
                        // from multiple tabs at the same time, there's no way we can guarantee the number of zeros.
                        // The Best we can do is say that "this was a zero and I should have AT LEAST something to show for it"
                        var progressive_is_ok = true;
                        if (game_info_package.progressive_bet > 0 && ball_number == 0) {
                            if (game_info_package.progressive_win == 0) {
                                progressive_is_ok = false;
                            }
                        }

                        if (progressive_is_ok) {
                            // Sum of prizes + total_bet + progressive_win - lost should be equal to intwinnings
                            var total_win = 0;
                            for (var k in prizes) {
                                total_win += prizes[k];
                            }

                            total_win += game_info_package.progressive_win;

                            if (game_info_package.intwinnings == total_win) {
                                game_is_legit = true;
                            } else {
                                proof_error = "prize";
                            }
                        } else {
                            proof_error = "progressive";
                        }
                    } else {
                        proof_error = "prizes";
                    }
                } else {
                    proof_error = "ball";
                }
            } else {
                proof_error = "server_seed";
            }
        } else {
            proof_error = "client_seed";
        }

        if (show_dialog) {
            this.show_provably_fair_dialog(game_info_package, proves_server_seed, proves_ball, proves_prizes);
        }

        return game_is_legit ? true : proof_error;
    },

    show_provably_fair_dialog: function (game_info_package, proves_server_seed, proves_ball, proves_prizes) {
        var li = game_info_package.game_seed.lastIndexOf(game_info_package.client_seed);
        var server_seed = game_info_package.game_seed.replace(game_info_package.client_seed, '');

        // Main game stuff
        $("#provably_fair_gameid").html(game_info_package.game_id);
        $("#provably_fair_server_seed").html(server_seed);
        $("#provably_fair_client_seed").html(game_info_package.client_seed);
        $("#provably_fair_game_seed").html(game_info_package.game_seed);
        $("#provably_fair_ball_number").html(game_info_package.ball_number);

        var pretty_bets = function (b) {
            var bets = [];
            for (var k in b) {
                bets.push('' + Bitcoin.int_amount_to_string(b[k]) + ' BTC on ' + k);
            }
            return bets.join(', ');
        }

        $("#provably_fair_bets").html(pretty_bets(game_info_package.bets));
        $("#provably_fair_total_bet").html(Bitcoin.int_amount_to_string(game_info_package.total_bet + game_info_package.progressive_bet));
        if (game_info_package.progressive_bet > 0) {
            $("#provably_fair_progressive_bet").html(" + " + Bitcoin.int_amount_to_string(game_info_package.progressive_bet) + " BTC (progressive bet)");
        }

        var valid_bets = Roulette.get_valid_bets(this.RULESET['number_of_zeros']);
        var game_eval = Roulette.evaluate_game(valid_bets, game_info_package.bets, game_info_package.ball_number);
        var pretty_prizes = Roulette.get_pretty_game_eval(game_eval[0], 200);

        $("#provably_fair_wins").html(pretty_prizes);

        var pretty_prizes = function (p) {
            var prizes = [];
            for (var k in p) {
                prizes.push('' + Bitcoin.int_amount_to_string(p[k]) + ' BTC on ' + k);
            }
            return prizes.join(', ');
        }

        $("#provably_fair_prizes").html(pretty_prizes(game_eval[0]));

        var total_win = 0;
        for (var k in game_eval[0]) {
            total_win += game_eval[0][k];
        }

        $("#provably_fair_prize").html(Bitcoin.int_amount_to_string(total_win));
        $("#provably_fair_progressive_win").html(Bitcoin.int_amount_to_string(game_info_package.progressive_win));

        $("#pf_tab_main").click(function () {
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

        window.setTimeout(function () {
            $("#provably_fair_proves_server_seed").css('visibility', 'visible');
            $("#provably_fair_proves_server_seed").addClass(proves_server_seed ? "pass" : "fail");
        }, 500);
        window.setTimeout(function () {
            $("#provably_fair_proves_ball").css('visibility', 'visible');
            $("#provably_fair_proves_ball").addClass(proves_ball ? "pass" : "fail");
        }, 1000);
        window.setTimeout(function () {
            $("#provably_fair_proves_prize").css('visibility', 'visible');
            $("#provably_fair_proves_prize").addClass(proves_prizes ? "pass" : "fail");
        }, 1500);

        $('#provably_fair_dialog').lightbox_me({
            centered: true,
            onLoad: function () {
                $('#pf_tab_main').click();
                $('#provably_fair_dialog').trigger('reposition');
            }
        });
    },

    winning_number_set: function (num) {
        var blink_digit = $("#num_id" + num + " .digit");
        blink_digit.addClass("winning_number");
    },
    winning_number_clear: function () {
        $(".num .digit").removeClass("winning_number");
    },

    add_game_to_leaderboard: function (finish_result, game_info_package) {
        var that = this;
        var timestamp = (new Date()).getTime() / 1000;
        var intwinnings = game_info_package.intwinnings;
        var inttotalbet = game_info_package.total_bet;
        var intgameearnings = intwinnings - inttotalbet;

        //var game_eval = Blackjack.get_game_eval( game_info_package.dealer_hand, game_info_package.player_hands, game_info_package.original_bet, game_info_package.bets, game_info_package.insurance_bet > 0 );
        var lb = {
            player_ident: account_system.player_ident,
            public_id: account_system.public_id,
            timestamp: timestamp,
            game: "roulette",
            gamedata: {
                "prizes": game_info_package.server_reported_prizes,
                "progressive_win": game_info_package.progressive_win,
                "unique_id": game_info_package.unique_id,
                "inttotalbet": inttotalbet,
                "intprogressivebet": game_info_package.progressive_bet,
                "intwinnings": intwinnings,
                "intgameearnings": intgameearnings,
                "progressive_hand": game_info_package.progressive_hand
            }
        };
        var new_row = leaderboard_system.process_row("mygames", lb, false, false);
        if (intgameearnings > 0) {
            leaderboard_system.process_row("recent", lb, false, false);
        }

        // Display mygames page if it's the first game played
        if (this.games_played == 0) {
            $("#tab4").trigger("click");
        }
        this.games_played++;

        // and check it right now!
        var game_check = this.check_game(false, game_info_package);
        if (game_check != true) {
            this.show_server_lied_dialog(game_check, null, game_info_package.game_id);
        }

        new_row.find("div.verify_button").on('click', function () {
            that.check_game(true, game_info_package);
        });
    },

    get_ball_number_class: function (num) {
        var cls = "red";
        if (Roulette.is_number_black(num)) {
            cls = "black";
        }
        else if (num == 0) {
            cls = "green";
        }
        return cls;
    },

    fill_last_numbers: function (last_numbers, slide) {
        s = "";
        //last_numbers = last_numbers.slice(0,10);
        // Most recent number is on top, so go backwards in list
        for (var i = last_numbers.length - 1; (i >= 0 && i >= last_numbers.length - 12); i--) {
            extra = "";
            if (slide && i == last_numbers.length - 1) {
                extra = " id='top_last_number' style='margin-top:-15px;' ";
            }
            var num = last_numbers[i][0];
            s += "<div class='last_number " + this.get_ball_number_class(num) + "'" + extra + ">";
            s += num;
            s += "</div>";
        }
        $("#last_numbers").html(s);

        // Slide in the top number from above the display to its top position
        if (slide) {
            $("#top_last_number").animate({ 'margin-top': '0px' }, 1000, function () { });
        }
    },

    finish_game: function (finish_result) {
        var that = this;

        // create a closure on game_info_package, sealing in the game state into memory for...ev....ar.
        // this has to happen before saving the next game server seed
        var game_info_package = this.package_game_info(finish_result);
        this.add_game_to_leaderboard(finish_result, game_info_package);

        this.fill_last_numbers(finish_result.last_numbers, true);

        if (finish_result.progressive_hand > 0) {
            $("#progressive_label" + finish_result.progressive_hand).addClass("win");
            $("#progressive_value" + finish_result.progressive_hand).addClass("win");
        }

        // Clear all bets, but also remember what the previous bets were
        this.last_bets = clone(this.bets);
        this.last_prizes = finish_result.prizes;
        this.bets = {}
        this.bet = 0;
        this.chips_show_prizes(finish_result.prizes);
        this.update_bet_text(finish_result.intwinnings);
        if (finish_result.intwinnings > 0) {
            window.setTimeout(function () {
                if (finish_result.progressive_win > 0) {
                    sound_system.play_sound("win_progressive");
                }
                else {
                    sound_system.play_sound("win1");
                }
            }, this.WIN_SOUND_DELAY);
        }

        // Can now show the updated credits value since the game is done.
        var credits_won = finish_result.intwinnings / this.credit_btc_value;
        this.is_counting_up = true;
        var show_fireworks = false;
        if (finish_result.progressive_win > 0) {
            show_fireworks = true;
        }
        if (finish_result.intwinnings / finish_result.inttotalbet > 6) {
            show_fireworks = true;
        }
        // Skip the count up if you're in autoplay (since otherwise you won't see the final number)
        var start = 0;
        if (autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED) {
            start = credits_won;
        }
        this.counter_wins_timer_id = this.countup_wins(start, credits_won, show_fireworks, function () {
            that.is_counting_up = false;

            if (finish_result.intbalance != undefined) {
                account_system.set_btc_balance(finish_result['intbalance'], finish_result['fake_intbalance']);
            }
            //  - this is already called in the above code. No need to wait I guess?
            //that.add_game_to_leaderboard(finish_result, game_info_package); 
            //that.next_server_seed_hash = finish_result.server_seed_hash;
            that.calculate_credits();
        });


        this.winning_number_set(finish_result.ball_number);

        $("#wheel_cont #ball_number").html(finish_result.ball_number);
        $("#wheel_cont #ball_number").removeClass("red black green").addClass(this.get_ball_number_class(finish_result.ball_number));

        this.set_next_server_seed_hash(finish_result.server_seed_hash);
        this.game_state = this.GAME_STATE_PRE_SPIN;
        this.update_controls();
        return;
    },

    countup_wins: function (current, goal, show_fireworks, done) {
        var that = this;

        if (show_fireworks && !isMobile.any()) {
            this.maybe_create_firework();
        }

        this.countup_wins_done = done;
        if (current >= goal) {

            this.draw_win_amount(goal, this.WIN_TEXT_WIN);
            done();
            return;
        }

        this.draw_win_amount(current, this.WIN_TEXT_WIN);

        var bet_in_credits = this.last_bet / this.credit_btc_value;
        delta = Math.floor(bet_in_credits / 10);
        if (delta < 1) {
            delta = 1;
        }

        delay = 25;

        if (current + delta >= goal) {
            this.num_credits += goal - current;
        }
        else {
            this.num_credits += delta;
        }
        this.update_credits();

        return window.setTimeout(function () {
            that.counter_wins_timer_id = that.countup_wins(current + delta, goal, show_fireworks, done);
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
            url: "/roulette/reseed"
        }).done(function (reseed_request) {
            if (reseed_request.result == true) {
                that.set_next_server_seed_hash(reseed_request.server_seed_hash);
                cb();
            }
        });
    },

    update_selected_bet: function (bet_id, caused_by_direct_input) {
        if (bet_id == null) {
            $("#selected_bet").removeClass("on").addClass("off");
            return;
        } else {
            $("#intro_message").removeClass("on").addClass("off");
            $("#selected_bet").removeClass("off").addClass("on");
        }
        var selected_bet_name = Roulette.get_bet_name(bet_id).toUpperCase();
        $("#selected_bet #name").html(selected_bet_name + " (pays " + Roulette.PAYOUT_TABLE[bet_id][0] + ":" + Roulette.PAYOUT_TABLE[bet_id][1] + ")");
        //$("#selected_bet #payout").html( "pays " + Roulette.PAYOUT_TABLE[bet_id][0] + ":" + Roulette.PAYOUT_TABLE[bet_id][1] );

        var amt = 0;
        if (bet_id in this.bets) {
            amt = Math.floor(this.bets[bet_id] / 10000);
        }
        // if you are typing in the number, no need to mess with the value again, since it screws with your cursor position.
        // Without this, hitting left/right arrow keys + home always throw you to the end of the input control.
        if (!caused_by_direct_input) {
            $("#input_bet_amount").val(amt);
        }

    },

    handle_input_bet_amount: function () {
        if (this.selected_bet == null) return;

        var str = $("#input_bet_amount").val();
        for (var i = 0; i < str.length; i++) {
            if (str[i] < '0' || str[i] > '9') {
                $("#input_bet_amount").addClass("error");
                return;
            }
        }

        var old_value = (this.selected_bet in this.bets) ? this.bets[this.selected_bet] : 0;
        var new_value = 0;
        if (str.length > 0) {
            new_value = parseInt(str, 10) * this.credit_btc_value;
        }
        var how_much = new_value - old_value;

        $("#input_bet_amount").removeClass("error");
        if (isNaN(new_value)) {
            if (str != '') {
                $("#input_bet_amount").addClass("error");
            }
            return;
        }

        if ((new_value + this.progressive_bet) > account_system.get_active_btc_int_balance()) {
            $("#input_bet_amount").addClass("error");
            return;
        }

        if ((this.bet + how_much) > this.RULESET['maximum_bet']) {
            $("#input_bet_amount").addClass("error");
            return;
        }

        // new_value cannot have any extra bet less than bet_resolution
        if (new_value % this.RULESET['bet_resolution'] != 0) {
            $("#input_bet_amount").addClass("error");
            return;
        }

        this.bet += (new_value - old_value);
        this.bets[this.selected_bet] = new_value;
        this.update_selected_bet(this.selected_bet, true);
        this.chips_set(this.selected_bet, this.bets[this.selected_bet], this.bets[this.selected_bet] != 0 ? 'on' : 'off');
        if (this.bets[this.selected_bet] == 0) {
            delete this.bets[this.selected_bet];
        }
        this.update_bet_text();
        this.update_controls();
    },

    update_bet_text: function (prize) {
        var pb = '';
        if (this.progressive_bet != 0) {
            pb = '+' + Math.floor(this.progressive_bet / 10000);
        }

        var bet_amount = this.bet;
        if (this.bet == 0) {
            var bet_amount = this.last_bet;
        }
        var bet = 'BET ' + Math.floor(bet_amount / 10000) + pb;

        $("#bet_text").html(bet);

        //  - Maybe draw DOUBLE if you doubled down? (second param to this)
        if (prize == undefined) {
            this.draw_win_amount(0, this.WIN_TEXT_WIN);
        }
        else {
            var credits_won = prize / this.credit_btc_value;
            this.draw_win_amount(credits_won, this.WIN_TEXT_WIN);
        }
    },

    // Called by AccountSystem
    //  - This could potentially be handled in common game code?
    handle_balance_update: function (intbalance) {
        if (!this.is_counting_up && (this.game_state == this.GAME_STATE_PRE_SPIN)) {
            this.calculate_credits();
        }
    },

    update_controls: function () {
        //  - Turn stuff on and off depending on game state
        var state_use = this.game_state;

        // In autoplay, just disable all the buttons.
        if (autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED || autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING) {
            state_use = this.GAME_STATE_SPINNING;
            $("#intro_message").addClass("off");
            $("#selected_bet").addClass("off");
            $("#autoplay_details").removeClass("off");
        }
        else {
            if (this.selected_bet == null) {
                //$("#intro_message").removeClass("off");             // Never turn intro message back on
                $("#selected_bet").addClass("off");
            }
            else {
                $("#intro_message").addClass("off");
                $("#selected_bet").removeClass("off");
            }
            $("#autoplay_details").addClass("off");
        }

        switch (state_use) {
            case this.GAME_STATE_PRE_SPIN:
                this.can_spin = true;
                $("#control_spin").removeClass("disabled");
                $("#control_clear").removeClass("disabled");
                $("#control_repeat").removeClass("disabled");
                $("#control_double").removeClass("disabled");
                if (this.bet == 0 && this.last_bet == 0) {
                    this.can_spin = false;
                    $("#control_spin").addClass("disabled");
                    $("#control_clear").addClass("disabled");
                    $("#control_double").addClass("disabled");
                }
                //Repeat should be available in the case that last_bets has at least 1 bet
                var b = false;
                for (var k in this.last_bets) {
                    if (this.last_bets[k] != 0) {
                        b = true;
                        break;
                    }
                }
                if (!b) {
                    $("#control_repeat").addClass("disabled");
                }
                break;
            case this.GAME_STATE_SPINNING:
                this.can_spin = false;
                $("#control_spin").addClass("disabled");
                $("#control_clear").addClass("disabled");
                $("#control_repeat").addClass("disabled");
                $("#control_double").addClass("disabled");
                break;
        }
    },

    set_progressive_bet: function (int_size) {
        if (int_size == null || int_size == 0) {
            $("#progressive_bet_0001").removeClass("selected");
            $("#progressive_bet_none").addClass("selected");
            this.progressive_bet = int_size;
        } else if (int_size === Bitcoin.string_amount_to_int("0.0001")) {
            $("#progressive_bet_0001").addClass("selected");
            $("#progressive_bet_none").removeClass("selected");
            this.progressive_bet = int_size;
        }

        this.update_bet_text();
    },

    handle_change_progressive_bet: function (size, play_sound) {
        if (size == null) {
            this.set_progressive_bet(0);
        } else {
            this.set_progressive_bet(Bitcoin.string_amount_to_int(size));
        }

        if (play_sound) {
            sound_system.play_sound("boop");
        }

        $.ajax({
            url: "/roulette/set_progressive_bet?progressive_bet=" + this.progressive_bet + "&_=" + (new Date()).getTime()
        }).done(function (set_result) {
            // don't care if this succeeds or not.
        });
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
        $("#autoplay_mode_labouchere_speed option:selected").removeAttr("selected");
        $("#autoplay_mode_lucky_number_speed option:selected").removeAttr("selected");

        $($("#autoplay_mode_martingale_speed option")[autoplay_system.autoplay_speed]).prop('selected', true);
        $($("#autoplay_mode_labouchere_speed option")[autoplay_system.autoplay_speed]).prop('selected', true);
        $($("#autoplay_mode_lucky_number_speed option")[autoplay_system.autoplay_speed]).prop('selected', true);

        $("#autoplay_dialog .options_container").hide();
        $(".autoplay_mode_item.selected .options_container").show();

        var table_limit = this.get_rounded_credits(this.RULESET['maximum_bet'] / this.credit_btc_value);
        $("#autoplay_mode_labouchere_bet_table_limit").html('' + table_limit);

        if (table_limit < this.autoplay_labouchere_bet_size) {
            this.autoplay_labouchere_bet_size = table_limit;
        }
        $("#autoplay_mode_labouchere_bet_size").val('' + this.autoplay_labouchere_bet_size);

        if (this.autoplay_labouchere_number_count > this.autoplay_labouchere_bet_size) {
            this.autoplay_labouchere_number_count = this.autoplay_labouchere_bet_size;
        }
        $("#autoplay_mode_labouchere_number_count").val('' + this.autoplay_labouchere_number_count);
    },

    handle_autoplay_mode: function (div) {
        $("#autoplay_dialog .autoplay_mode_item").removeClass("selected");
        div.addClass("selected");
        this.set_autoplay_options();
    },

    handle_labouchere_bet_change: function (div) {
        var v = parseInt($(div).attr("value"));
        if (v == 0) {
            $("#autoplay_mode_labouchere_bet_size").attr("disabled", "");
        } else {
            $("#autoplay_mode_labouchere_bet_size").removeAttr("disabled");
        }
        this.autoplay_mode_labouchere_bet = v;
    },

    handle_lucky_number_number_change: function (div) {
        var v = parseInt($(div).attr("value"));
        if (v == 0) {
            $("#autoplay_mode_lucky_number_number").attr("disabled", "");
            this.autoplay_lucky_number_number = undefined;
        } else {
            $("#autoplay_mode_lucky_number_number").removeAttr("disabled");
            this.autoplay_lucky_number_number = 0;
        }
    },

    handle_autoplay_start: function () {
        var table_limit = this.get_rounded_credits(this.RULESET['maximum_bet'] / this.credit_btc_value);

        this.last_progressive_hand = null;

        var p = $("#autoplay_dialog .autoplay_mode_item.selected").attr('id');
        if (p == 'autoplay_mode_martingale') {
            this.autoplay_strategy = this.AUTOPLAY_STRATEGY_MARTINGALE;
        } else if (p == 'autoplay_mode_labouchere') {
            this.autoplay_strategy = this.AUTOPLAY_STRATEGY_LABOUCHERE;
        } else if (p == 'autoplay_mode_lucky_number') {
            this.autoplay_strategy = this.AUTOPLAY_STRATEGY_LUCKY_NUMBER;
        }

        if (this.autoplay_strategy == this.AUTOPLAY_STRATEGY_MARTINGALE) {
            var starting_bet = parseInt($.trim($("#autoplay_mode_martingale_starting_bet").val()))
            if (isNaN(starting_bet) || starting_bet <= 0 || starting_bet > table_limit) {
                alert("The starting bet size is invalid. It must be between 1 and " + table_limit + ".");
                return;
            }

            // We also check to see if the value is somewhat sane
            if ((starting_bet * 2) > table_limit || (starting_bet * 4) > table_limit) {
                if (!confirm("The starting bet you specified cannot be doubled too many times before hitting the table limit. Are you sure you want to use this bet size?")) {
                    return;
                }
            }

            this.autoplay_martingale_starting_bet = starting_bet;
        }

        if (this.autoplay_strategy == this.AUTOPLAY_STRATEGY_LUCKY_NUMBER) {
            if (this.autoplay_lucky_number_number == 0) {
                var ln = $.trim($("#autoplay_mode_lucky_number_number").val());
                if (ln == "00") {
                    ln = -1;
                } else {
                    ln = parseInt(ln);
                }
                if (isNaN(ln) || ln > 36 || ln < (1 - this.RULESET['number_of_zeros'])) {
                    alert("That Lucky Number is invalid. Only 0 through 36 are valid numbers.");
                    return;
                }
                this.autoplay_lucky_number_number = ln;
            }

            var bet_size = parseInt($.trim($("#autoplay_mode_lucky_number_bet_size").val()))
            if (isNaN(bet_size) || bet_size <= 0 || bet_size > table_limit) {
                alert("The specified bet size is invalid. It must be between 1 and " + table_limit + ".");
                return;
            }

            this.autoplay_lucky_number_bet_size = bet_size;
        }

        if (this.autoplay_strategy == this.AUTOPLAY_STRATEGY_LABOUCHERE) {
            var b = table_limit;
            if (this.autoplay_mode_labouchere_bet == 1) {
                ln = parseInt($.trim($("#autoplay_mode_labouchere_bet_size").val()));
                if (isNaN(ln) || ln < 2 || ln > table_limit) {
                    alert("The specified Labouchère bet size is invalid. It must be at least 2 and less than the table limit (" + table_limit + ").");
                    return;
                }
                this.autoplay_labouchere_bet_size = ln;
                b = this.autoplay_labouchere_bet_size;
            }

            var ln = parseInt($.trim($("#autoplay_mode_labouchere_number_count").val()));
            if (isNaN(ln) || ln < 2 || ln > b) {
                alert("The length specified for the Labouchère number list is invaild. It must be at least 2 and less than the Specific Bet.");
                return;
            }
            this.autoplay_labouchere_number_count = ln;

        }

        this.autoplay_labouchere_numbers = null;
        this.autoplay_martingale_bet = null;
        this.autoplay_martingale_bet_spot = null;

        autoplay_system.autoplay_start(false);
        $("#autoplay_dialog").trigger("close");
    },


    handle_clear: function (play_sound) {
        if (play_sound) {
            sound_system.play_sound("boop");
        }
        this.winning_number_clear();
        this.bets = {};
        this.chips_clear();
        this.bet = 0;
        this.last_bet = 0;
        this.update_bet_text();
        this.update_controls();
        this.update_selected_bet(this.selected_bet, false);
    },

    handle_repeat: function () {
        sound_system.play_sound("boop");
        this.bets = clone(this.last_bets);
        this.bet = 0;
        for (var k in this.bets) {
            this.bet += this.bets[k];
        }
        this.winning_number_clear();
        this.chips_rebuild(this.bets);
        this.update_bet_text();
        this.update_controls();
    },
    handle_double: function () {
        var bets = this.bets;
        var original_bet = this.bet;
        if (this.bet == 0) {
            // Double your last bets if you are looking at prizes
            this.winning_number_clear();
            bets = this.last_bets;
            original_bet = this.last_bet;
        }

        var ending_bet = original_bet * 2;
        if (ending_bet > this.RULESET['maximum_bet'] || ending_bet > account_system.get_active_btc_int_balance()) {
            //  - Some kind of error message or unhappy sound?
            return;
        }
        sound_system.play_sound("boop");
        this.bet = 0;
        //for( var k in this.bets ) {
        for (var k in bets) {
            this.bets[k] = bets[k] * 2;
            this.bet += this.bets[k];
        }
        this.chips_rebuild(this.bets);
        this.update_bet_text();
        this.update_controls();
    },

    handle_bet: function (bet_id, play_sound) {
        // Clear away any winning chip displays from previous game
        if (this.bet == 0) {
            this.chips_clear()
            this.winning_number_clear();
        }

        var change_selected_bet_only = (bet_id != this.selected_bet) && bet_id in this.bets && this.bets[bet_id] != 0;
        var can_bet = true;

        if (!change_selected_bet_only) {
            if ((this.bet + this.bet_per_click + this.progressive_bet) > account_system.get_active_btc_int_balance()) {
                account_system.show_no_credits_dialog();
                return;
            }

            if ((this.bet + this.bet_per_click) > this.RULESET['maximum_bet']) {
                //TODO play a different sound?
                can_bet = false;
            }
        }

        if (can_bet && !change_selected_bet_only) {
            if (play_sound) {
                sound_system.play_sound("boop");
            }

            var current_amount = 0;
            if (bet_id in this.bets) {
                current_amount = this.bets[bet_id];
            }
            var new_amount = current_amount + this.bet_per_click;

            this.bets[bet_id] = new_amount;
            this.bet += this.bet_per_click;

            this.chips_set(bet_id, new_amount, 'on');
            this.update_bet_text();
            this.update_controls();
        } else {
            //TODO play a different 'click' sound?
        }

        //this has to happen even if the user can't place bets due to not enough BTC or table limit
        this.selected_bet = bet_id;
        this.update_selected_bet(this.selected_bet, false);
    },

    handle_bet_delta_clear: function () {
        if (this.selected_bet == null || !(this.selected_bet in this.bets)) return;
        this.bet -= this.bets[this.selected_bet];
        delete this.bets[this.selected_bet];
        sound_system.play_sound("boop");
        this.update_selected_bet(this.selected_bet, false);
        this.chips_set(this.selected_bet, 0, 'off');
        this.update_bet_text();
        this.update_controls();
    },

    handle_bet_delta_minus: function (how_much) {
        if (this.selected_bet == null || !(this.selected_bet in this.bets)) return;
        if (this.bets[this.selected_bet] == 0) {
            delete this.bets[this.selected_bet];
            return;
        }
        if (this.bets[this.selected_bet] < how_much) how_much = this.bets[this.selected_bet];
        this.bet -= how_much;
        this.bets[this.selected_bet] -= how_much;
        if (this.bets[this.selected_bet] == 0) {
            delete this.bets[this.selected_bet];
            this.chips_set(this.selected_bet, 0, 'off');
        } else {
            this.chips_set(this.selected_bet, this.bets[this.selected_bet], 'on');
        }
        sound_system.play_sound("boop");
        this.update_selected_bet(this.selected_bet, false);
        this.update_bet_text();
        this.update_controls();
    },

    handle_bet_delta_plus: function (how_much) {
        if (this.selected_bet == null) return;
        var old_value = (this.selected_bet in this.bets) ? this.bets[this.selected_bet] : 0;
        var new_value = old_value + how_much;

        if ((this.bet + how_much + this.progressive_bet) > account_system.get_active_btc_int_balance()) {
            //TODO play a different sound?
            new_value = account_system.get_active_btc_int_balance() - this.progressive_bet - this.bet + old_value;
            if (new_value < old_value) return;
        }

        if ((this.bet + how_much) > this.RULESET['maximum_bet']) {
            //TODO play a different sound?
            new_value = this.RULESET['maximum_bet'] - this.bet + old_value;
            if (new_value < old_value) return;
        }

        // new_value cannot have any extra bet less than bet_resolution
        new_value -= (new_value % this.RULESET['bet_resolution']);

        this.bet += (new_value - old_value);
        this.bets[this.selected_bet] = new_value;
        sound_system.play_sound("boop");
        this.update_selected_bet(this.selected_bet, false);
        this.chips_set(this.selected_bet, this.bets[this.selected_bet], this.bets[this.selected_bet] != 0 ? 'on' : 'off');
        this.update_bet_text();
        this.update_controls();
    },

    handle_bet_delta_times: function (how_many) {
        if (this.selected_bet == null) return;
        var old_value = (this.selected_bet in this.bets) ? this.bets[this.selected_bet] : 0;
        var new_value = old_value * how_many;

        if ((this.bet + (new_value - old_value) + this.progressive_bet) > account_system.get_active_btc_int_balance()) {
            //TODO play a different sound?
            new_value = account_system.get_active_btc_int_balance() - this.progressive_bet - this.bet + old_value;
            if (new_value < old_value) return;
        }

        if ((this.bet + (new_value - old_value)) > this.RULESET['maximum_bet']) {
            //TODO play a different sound?
            new_value = this.RULESET['maximum_bet'] - this.bet + old_value;
            if (new_value < old_value) return;
        }

        // new_value cannot have any extra bet less than bet_resolution
        new_value -= (new_value % this.RULESET['bet_resolution']);

        this.bet += (new_value - old_value);
        this.bets[this.selected_bet] = new_value;
        sound_system.play_sound("boop");
        this.update_selected_bet(this.selected_bet, false);
        this.chips_set(this.selected_bet, this.bets[this.selected_bet], this.bets[this.selected_bet] != 0 ? 'on' : 'off');
        this.update_bet_text();
        this.update_controls();
    },

    handle_spin: function (e) {
        that = this;

        if (e != undefined) e.preventDefault();

        // Don't spin if a spin is in progress
        if (this.game_state != this.GAME_STATE_PRE_SPIN) return;

        // No bets placed (not including progressive), don't do anything.
        if (this.bet == 0 && this.last_bet == 0) return;

        // Generate a random number and pass it off to the server
        // this.client_seed = get_client_seed();
        if( !this.check_client_seed() ) {
            return;
        }

        // Get the progressive bet for this game
        this.current_progressive_bet = this.progressive_bet;

        var bet_string = "";
        var first = true;
        var total_bet = 0;
        for (var key in this.bets) {
            if (first != true) {
                bet_string += "&";
            }
            bet_string += key + "=" + this.bets[key];
            first = false;
            total_bet += this.bets[key];
        }

        this.last_bet = total_bet;
        var bet_in_credits = this.get_rounded_credits((this.last_bet + this.current_progressive_bet) / this.credit_btc_value);

        // Check balance
        if ((this.last_bet + this.progressive_bet) > account_system.get_active_btc_int_balance()) {
            account_system.show_no_credits_dialog();
            return;
        }

        // Subtract credits
        this.num_credits -= bet_in_credits;
        this.update_credits();
        use_fake_credits_string = "use_fake_credits=" + account_system.use_fake_credits;

        this.game_state = this.GAME_STATE_SPINNING;
        this.stop_countup_wins();

        $(".zeroes_name").removeClass("win blink");
        $(".zeroes_value").removeClass("win blink");
        this.winning_number_clear();

        //  - The chip display could still be showing your previous winnings, so change it to your actual bets.
        this.chips_rebuild(this.bets);
        this.wheel_start();
        $("#wheel_cont #ball_number").removeClass("red black green");

        sound_system.play_sound("pay_coins");
        this.selected_bet = null; //update_controls will turn off the selected_bet page
        this.update_controls();

        this.client_seed = $("#next_client_seed").val();
        $("#next_client_seed").prop('disabled', true);

        $.ajax({
            url: "/roulette/spin?server_seed_hash=" + this.next_server_seed_hash + "&client_seed=" + this.client_seed + "&progressive_bet=" + this.current_progressive_bet + "&" + bet_string + "&" + use_fake_credits_string
        }).done(function (spin_result) {
            if (spin_result['error'] != null) {
                that.wheel_stop(0);
                if (spin_result['error'] == "insufficient_funds") {
                    account_system.show_no_credits_dialog();
                } else if (spin_result['error'] == 'shutting_down') {
                    account_system.show_shutting_down_dialog();
                } else if (spin_result['error'] == 'need_seed') {
                    that.num_credits += bet_in_credits;
                    that.update_credits();
                    that.GAME_STATE_PRE_SPIN;
                    that.reseed(function () {
                        that.handle_spin();
                    });
                }
                else {
                    alert("Internal server error. Please try again later. (" + spin_result['error'] + ")");
                }
                that.game_state = that.GAME_STATE_PRE_SPIN;
                return;
            }
            that.spin_result = spin_result;
            that.wheel_stop(spin_result.ball_number);
            that.finish_game(that.spin_result);

            account_system.shutting_down(spin_result['shutdown_time'], false);
            if (spin_result.shutdown_time != undefined && spin_result.shutdown_time != 0) {
                account_system.shutting_down(spin_result.shutting_down);
            }

        }).fail(function () {
            that.wheel_stop(0);
            that.game_state = that.GAME_STATE_PRE_SPIN;
            that.update_controls();
            that.num_credits += bet_in_credits;
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
            case 38: // up arrow
                if ($("#input_bet_amount").is(":focus")) {
                    this.handle_bet_delta_plus(this.RULESET['bet_resolution']);
                }
                return true;
            case 40: // down arrow
                if ($("#input_bet_amount").is(":focus")) {
                    this.handle_bet_delta_minus(this.RULESET['bet_resolution']);
                }
                return true;
            case 13: //enter, stand
                if ($("#input_bet_amount").is(":focus")) {
                    return false;
                }

                // Repeat last bet (by hitting spin button)
                if (this.bet == 0 && this.last_bet > 0) {
                    this.bets = clone(this.last_bets);
                }
                this.handle_spin();
                return true;
        }
        return false;
    },

    hilight_bet_numbers: function (bet_id) {
        this.hilight_clear();
        var winners = Roulette.get_bet_winning_numbers(bet_id);
        for (var i = 0; i < winners.length; i++) {
            $("#num_id" + winners[i]).addClass("hilight");
        }
    },

    hilight_clear: function () {
        $(".num").removeClass("hilight");
    },

    chips_clear: function () {
        $(".bet .chips").removeClass("on win lose");
    },
    chips_set: function (bet_id, amount, cls) {
        var chips = $("#bet_id_" + bet_id + " .chips");
        chips.html(Math.floor(amount / this.credit_btc_value));
        chips.removeClass("on win lose");
        chips.addClass(cls);
    },
    chips_rebuild: function (bets) {
        this.chips_clear();
        for (var k in bets) {
            this.chips_set(k, bets[k], "on");
        }
    },
    chips_show_prizes: function (prizes) {
        //  TEST - Show losing bets as gray or red instead of just removing them?
        // this.chips_clear(); 
        //$(".chips.on").removeClass("on").addClass("lose").html("&nbsp;");
        $(".chips.on").removeClass("on").addClass("lose");

        for (var k in prizes) {
            this.chips_set(k, prizes[k], "win");
        }
    },

    get_num_wheel_angle: function (num) {
        // Given a number, figure out what angle to rotate the wheel to display it at the correct position.
        //  - Should create an array going the other way, instead of linear searching this
        var nums = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34,
                    6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
                    24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
                    29, 7, 28, 12, 35, 3, 26];

        var pos = -1;
        for (var i = 0; i < nums.length; i++) {
            if (nums[i] == num) {
                pos = i;
                break;
            }
        }

        // 360/37 = 9.729729
        //return 42; 
        var p = -45 - pos * 9.729729 + 1;

        //  - Map to [0,360)
        return (p + 360) % 360;
    },

    init_handlers: function () {
        var that = this;

        $("#control_changebet").on('click', function () {
            if (that.is_bet_table_active) {
                that.hide_bet_table();
            }
            else {
                that.show_bet_table();
            }
            sound_system.play_sound("boop");
        });

        var autoplay_speed_changed = function (option) {
            autoplay_system.autoplay_speed = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_martingale_speed").change(function () { autoplay_speed_changed($(this)); });
        $("#autoplay_mode_labouchere_speed").change(function () { autoplay_speed_changed($(this)); });
        $("#autoplay_mode_lucky_number_speed").change(function () { autoplay_speed_changed($(this)); });

        $("#autoplay_mode_martingale_table_limit").change(function () {
            that.autoplay_martingale_table_limit = parseInt($(this).children(":selected").val());
        });

        $("#autoplay_mode_labouchere_bet").change(function () {
        });

        var autoplay_take_insurance_changed = function (option) {
            that.autoplay_take_insurance = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_normal_insurance").change(function () { autoplay_take_insurance_changed($(this)); });

        $("#control_autoplay").click(function () {
            that.handle_auto();
        });

        $(".autoplay_mode_item").click(function () {
            that.handle_autoplay_mode($(this));
        });

        $("#autoplay_dialog .autoplay_start_image").click(function () {
            that.handle_autoplay_start();
        });

        $("input[name='autoplay_mode_labouchere_bet']").change(function () {
            that.handle_labouchere_bet_change(this);
        });

        $("input[name='autoplay_mode_lucky_number_specific']").change(function () {
            that.handle_lucky_number_number_change(this);
        });

        $("#progressive_bet_none").on('click', function () {
            that.handle_change_progressive_bet(null, true);
        });

        $("#progressive_bet_0001").on('click', function () {
            that.handle_change_progressive_bet("0.0001", true);
        });

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

        //  - The text gets selected, but then something is instantly clearing the selection again...
        // http://stackoverflow.com/questions/6124394/select-all-text-on-focus-using-jquery 
        //  - This seems to work OK...
        $("#input_bet_amount").focus(function (ev) {
            //$(this).select();
            window.setTimeout(function () {
                $("#input_bet_amount").select();
            }, 100);
        });
        $("#input_bet_amount").keyup(function (ev) {
            that.handle_input_bet_amount();
        });

        $(window).on('beforeunload', function () {
            if (that.game_state != that.GAME_STATE_PRE_SPIN ||
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED ||
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING) {
                return 'You are in the middle of a game.  If you leave, you will be forfeiting your bet.'
            }
        });

        $(document).keydown(function (ev) {
            if (!$("input").is(":focus") && that.handle_keypress(ev)) {
                ev.preventDefault();
            }
        });


        $("#selected_bet").mouseenter(function (e) {
            that.hilight_bet_numbers(that.selected_bet);
        });
        $("#selected_bet").mouseleave(function (e) {
            that.hilight_clear();
        });
        $(".bet").mouseenter(function (e) {
            $(this).find(".glow").addClass("on");
            var bet_id = $(this).attr("id").substring(7);
            that.hilight_bet_numbers(bet_id);
        });
        $(".bet").mouseleave(function (e) {
            $(this).find(".glow").removeClass("on");
            that.hilight_clear();
        });
        $(".bet").click(function (e) {
            // All .bet divs are "bet_id_BET", so slice away the first 7 chars
            var bet_id = $(this).attr("id").substring(7);
            that.handle_bet(bet_id, true);
        });
        $("#control_spin").mouseenter(function (e) {
            // Show your previous bet for spin-spin-spin gameplay
            if (that.bet == 0) {
                that.chips_rebuild(that.last_bets);
                //  - Update the BET 0 text to show how much you'd be betting.
            }
        });
        $("#control_spin").mouseleave(function (e) {
            if (that.bet == 0) {
                //  - Should revert back to your previous green win chips
                that.chips_show_prizes(that.last_prizes);
            }
        });
        $("#control_spin").click(function (e) {
            // Repeat last bet (by hitting spin button)
            if (that.bet == 0) {
                that.bets = clone(that.last_bets);
            }

            that.handle_spin(e);
        });
        $("#control_repeat").click(function (e) {
            that.handle_repeat();
        });
        $("#control_double").click(function (e) {
            that.handle_double();
        });
        $("#control_clear").click(function (e) {
            that.handle_clear(true);
        });
        $(".change_bet_delta.clear").on('click', function () {
            that.handle_bet_delta_clear();
        });
        $(".change_bet_delta.minus_10").on('click', function () {
            that.handle_bet_delta_minus(10 * that.credit_btc_value);
        });
        $(".change_bet_delta.minus_1").on('click', function () {
            that.handle_bet_delta_minus(1 * that.credit_btc_value);
        });
        $(".change_bet_delta.plus_10").on('click', function () {
            that.handle_bet_delta_plus(10 * that.credit_btc_value);
        });
        $(".change_bet_delta.plus_1").on('click', function () {
            that.handle_bet_delta_plus(1 * that.credit_btc_value);
        });
        $(".change_bet_delta.times_2").on('click', function () {
            that.handle_bet_delta_times(2);
        });
        $(".change_bet_delta.max").on('click', function () {
            that.handle_bet_delta_plus(account_system.get_active_btc_int_balance());
        });

        $("#bets_holder").attr('unselectable', 'on').css('UserSelect', 'none').css('MozUserSelect', 'none');
    },

    set_progressive_jackpot: function (intvalue) {
        // convert progressive_jackpot (which is in BTC) to credits..
        var credit_progressive_jackpot = '' + intvalue / this.credit_btc_value;
        var value;

        var p = indexOf(credit_progressive_jackpot, '.');
        if (p > 0) {
            credit_progressive_jackpot = credit_progressive_jackpot.slice(0, p + 3);

            var before_number = credit_progressive_jackpot.slice(0, p);
            before_number = before_number.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
            value = before_number + credit_progressive_jackpot.slice(p, p + 3);
        } else {
            value = ('' + credit_progressive_jackpot).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
        }

        if (this.progressive_jackpot == value) return;

        var delay = 250 + Math.random() * 500;
        if (this.progressive_jackpot == null) {
            delay = 0;
        }

        this.progressive_jackpot = value;
        if (this.progressive_jackpot_timeout_id == undefined || this.progressive_jackpot_timeout_id == null) {
            var that = this;
            this.progressive_jackpot_timeout_id = window.setTimeout(function () {
                $("#progressive_value3").css({ opacity: 0.0 });
                $("#progressive_value3").animate({ opacity: 1.0 }, 1000, function () { });
                $("#progressive_value3").html(that.progressive_jackpot);
                that.update_progressive_label_widths();
                that.progressive_jackpot_timeout_id = null;

            }, delay);
        }
        this.update_progressive_label_widths();
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
		var jackpot_total = m * credit_progressive_jackpot;
        this.display_jackpot(jackpot_total, credit_progressive_jackpot);
    },

    update_progressive_label_widths: function () {
        var block_width = 253;
        var padding = 2;

        for (var i = 1; i <= this.RULESET.progressive_paytable.length; i++) {
            $("#progressive_label" + i).css("width", (block_width - $("#progressive_value" + i).outerWidth() - padding) + "px");
        }
    }
});

function init_roulette(key, my_player_ident, my_public_id, starting_server_seed_hash, initial_leaderboards, initial_mygames, chatlog, ruleset, last_numbers, default_progressive_bet, sound_volume ) {
    var sound_list = [ 
        ['boop', 'boop.wav', true, 1],
        ['win1', 'win1.wav', false, 1],
        ['pay_coins', 'coinpay.wav', false, 1],
        ['win_on_deal', 'slot_machine_bet_10.wav', false, 1],
        ['win_double_game', 'slot_machine_win_22.wav', false, 1],
        ['seven_card', 'slot_machine_bet_01.wav', false, 1],
        ['win_progressive', 'slot_machine_win_19.wav', false, 1],
        ['show_card', 'carddeal.wav', false, 3]
    ];
    common_init( 'Roulette', key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, chatlog, sound_list, sound_volume );
    
    dialog_system.init_help( ["/static/images/rou-help-howtoplay.png" ] );
    
    game_system = new RouletteSystem( starting_server_seed_hash, ruleset, last_numbers, default_progressive_bet );
    game_system.call_update_service();

    //we need to resize chat again, since blackjack does some progressive table size changing..
    chat_system.adjust_height(false);
    game_system.fill_last_numbers( last_numbers, false );
}

