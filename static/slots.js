var SlotsSystem = GameSystem.extend({
    init: function (starting_server_seed_hash, ruleset, credit_btc_value, free_spin_info) {
        //  - Why is the order of the games list not consistent?
        // TODO - Why is the game list needed at all?
        this.free_spins_left = 0;
        this._super('slots', starting_server_seed_hash, credit_btc_value, ['blackjack', 'videopoker', 'roulette', 'craps', 'slots', 'keno']);

        this.GAME_STATE_PRE_PULL = 0;
        this.GAME_STATE_PULLING = 1;
        this.game_state = this.GAME_STATE_PRE_PULL;

        // Initially all lines are shown at the same time (no blink), and then later the individual
        // winning lines and scatters are shown (repeating).
        this.WIN_REVEAL_STATE_SHOW_ALL = 0;
        this.WIN_REVEAL_STATE_SHOW_SCATTERS = 1;
        this.WIN_REVEAL_STATE_SHOW_INDIVIDUAL_LINES = 2;
        this.WIN_REVEAL_STATE_DONE = 3;
        this.win_reveal_state = this.WIN_REVEAL_STATE_DONE;

        this.payouts_dialog_loaded = false;

        this.RULESET = ruleset;

        this.init_handlers();

        this.progressive_jackpot = 0;
        this.progressive_jackpot_timeout_id = null;

        // Variables used to cycle the display of winning lines
        this.TIME_UPDATE_DELAY = 50;
        this.current_winning_line = 0;
        this.num_line_blinks = 0;
        this.pull_result = null;
        // regular blink
        this.time_since_blink = 0;
        this.winning_lines = null;
        this.line_blink_on = false;
        this.time_since_line_blink = 0;
        this.mouse_hover_line = 0;

        this.num_lines = 1;

        this.is_counting_up = false;
        this.time_update();
        this.update_controls();
        this.update_stat_label_widths();

        this.include_account_key = false;

        //  TEMP TEST!
        // this.handle_pull();
        //$(".line").addClass("on");

        if (free_spin_info.left > 0) {
            this.restore_unfinished_game(free_spin_info);
        }
    },

    restore_unfinished_game: function (free_spin_info) {

        this.num_lines = free_spin_info.num_lines;
        $("#control_lines_value").html(this.num_lines);

        $(".symbol_widget").removeClass("on");
        for (var i = 0; i < this.num_lines; i++) {
            $("#symbol_widget_" + i).addClass("on");
        }

        this.credit_btc_value = free_spin_info.credit_btc_value;
        $("#control_btc, #credits_holder").removeClass();
        $("#control_btc").addClass("btc_token");
        $("#control_btc, #credits_holder").addClass("clickable");
        if (this.credit_btc_value == 10000) {
            $("#control_btc").addClass("btc_token_0001");
        } else if (this.credit_btc_value == 100000) {
            $("#control_btc").addClass("btc_token_001");
        } else if (this.credit_btc_value == 500000) {
            $("#control_btc").addClass("btc_token_005");
        } else if (this.credit_btc_value == 1000000) {
            $("#control_btc").addClass("btc_token_01");
        }

        this.free_spins_left = free_spin_info.left;
        this.free_spins_use_fake_credits = free_spin_info.use_fake_credits;

        this.update_credits();
        this.update_controls();
    },

    get_visible_symbol: function (col, row) {
        var reel_pos = (this.pull_result.reel_positions[col] + row) % this.RULESET.reels[col].length;
        var symbol = this.RULESET.reels[col][reel_pos];
        return symbol;

        /*
        var symbol = this.RULESET.reels[col][ (reel_position + row) % this.RULESET.reels[col].length ];
        this.pull_result.reel_positions[col]
        */
    },

    draw_reel_column: function (col) {
        for (var row = 0; row < 3; row++) {
            var symbol = this.get_visible_symbol(col, row);
            $("#single_symbol_holder_" + row + "_" + col + " .symbol_image").removeClass().addClass("symbol_image").addClass("symbol_image_" + symbol);
        }
    },

    draw_winning_box: function (col, row, line_color) {
        var symbol_div = $("#single_symbol_holder_" + row + "_" + col)
        symbol_div.addClass("winner");

        var symbol_border_div = symbol_div.find(".symbol_border");
        symbol_border_div.css("border-color", line_color);
    },

    draw_line_winning_boxes: function (line_id, num_boxes) {
        var line_color = $("#segment_" + line_id + "_0").css("background-color");
        for (var box = 0; box < num_boxes; box++) {
            //  - Color of box needs to be the same as the winning line
            //var row = Slots.LINE_ORDER[line_id][box];
            var row = this.RULESET['lines'][line_id][box];
            this.draw_winning_box(box, row, line_color);
        }
    },

    blink_winning_line: function (winning_index, on) {

        if (this.pull_result == null) {
            console.log("ERROR: pull_result = null!");
            return;
        }

        var winning_line = this.winning_lines[winning_index];
        if (winning_line.line_eval_symbol == 0 || winning_line.line_eval_count < 2 || winning_line.winnings <= 0) {
            console.log("ERROR: trying to blink a line where line_eval_symbol==0 or line_eval_count < 2 or winnings==0");
            return;
        }

        this.clear_lines_and_winning_boxes();
        if (on) {
            this.draw_line_winning_boxes(winning_line.line_id, winning_line.line_eval_count);
            $("#line_" + winning_line.line_id).addClass("on");
            $("#symbol_widget_" + winning_line.line_id).addClass("winner");

            $("#line_pays_text").addClass("on");
            $("#line_pays_text").html("LINE WIN PAYS " + this.winning_lines[this.current_winning_line].winnings);
        }
        else {
            $("#line_pays_text").removeClass("on");
        }

        //  - The box needs to be the same color as the line!

        //  - Need to display the line win amount in credits (the text area)
    },

    blink_winning_scatters: function (on) {
        if (this.pull_result.num_scatters <= 1) {
            return;
        }

        if (!on) {
            return;
        }

        for (var col = 0; col < 5; col++) {
            for (row = 0; row < 3; row++) {
                if (this.get_visible_symbol(col, row) == this.RULESET['scatter']) {
                    this.draw_winning_box(col, row, "#ff0000");
                }
            }
        }

    },
    draw_all_winning_lines: function () {
        for (var winning_index = 0; winning_index < this.winning_lines.length; winning_index++) {
            var winning_line = this.winning_lines[winning_index];
            $("#line_" + winning_line.line_id).addClass("on");
            $("#symbol_widget_" + winning_line.line_id).addClass("winner");
        }
    },

    can_pull: function () {
        if (this.game_state != this.GAME_STATE_PRE_PULL) {
            return false;
        }
        return true;
    },

    set_reveal_state: function (state) {
        //  TEMP HACKY FIX - don't blow up if you win scatters but no lines
        if (state == this.WIN_REVEAL_STATE_SHOW_INDIVIDUAL_LINES && this.winning_lines.length == 0) {
            state = this.WIN_REVEAL_STATE_SHOW_SCATTERS;
        }

        this.win_reveal_state = state;
        this.time_since_line_blink = 0;
        this.line_blink_on = false;
        this.num_line_blinks = 0;
        this.clear_lines_and_winning_boxes();
        this.current_winning_line = 0;
    },

    time_update: function () {
        var that = this;

        //  - Note that there are two different timers and blinks going on here: a regular blink (buttons) and a line blink (winning lines)
        this.time_since_blink += this.TIME_UPDATE_DELAY;

        if (this.game_state == this.GAME_STATE_PRE_PULL) {
            //  - Need to initially show ALL winning lines all at once, and then switch to single line mode.
            //  TEMP - Also check for scatters (until they also award intwinnings in the back end)
            if (that.mouse_hover_line == 0 && this.pull_result != null && (this.pull_result.intwinnings > 0 || this.pull_result.num_scatters > 1)) {

                this.time_since_line_blink += this.TIME_UPDATE_DELAY;
                if (this.win_reveal_state == this.WIN_REVEAL_STATE_SHOW_ALL) {
                    this.draw_all_winning_lines();
                    this.blink_winning_scatters(true);

                    if (this.time_since_line_blink > 1000) {
                        this.set_reveal_state(this.pull_result.num_scatters > 1 ? this.WIN_REVEAL_STATE_SHOW_SCATTERS : this.WIN_REVEAL_STATE_SHOW_INDIVIDUAL_LINES);
                    }
                }
                else if (this.win_reveal_state == this.WIN_REVEAL_STATE_SHOW_SCATTERS) {
                    if (this.pull_result.num_scatters <= 1) {
                        this.set_reveal_state(this.WIN_REVEAL_STATE_SHOW_INDIVIDUAL_LINES);
                    }
                    else {
                        var line_blink_delay = 200;
                        if (this.line_blink_on) {
                            line_blink_delay = 400;
                        }
                        if (this.time_since_line_blink >= line_blink_delay) {
                            this.line_blink_on = !this.line_blink_on;
                            var scatter_prize = this.num_lines * this.RULESET['bonus_multipliers'][this.pull_result.num_scatters];
                            $("#line_pays_text").html("SCATTER WIN PAYS " + scatter_prize);
                            if (this.line_blink_on) {
                                $("#line_pays_text").addClass("on");
                            }
                            else {
                                $("#line_pays_text").removeClass("on");
                            }
                            this.time_since_line_blink = 0;
                            this.num_line_blinks++;
                            // Draw scatters blinking for a little while, and then switch to individual lines!
                            this.clear_lines_and_winning_boxes();
                            this.blink_winning_scatters(this.line_blink_on);
                            if (this.num_line_blinks > 5) {
                                this.set_reveal_state(this.WIN_REVEAL_STATE_SHOW_INDIVIDUAL_LINES);
                                this.num_line_blinks = 0;
                            }
                        }

                    }
                }
                else if (this.win_reveal_state == this.WIN_REVEAL_STATE_SHOW_INDIVIDUAL_LINES) {
                    var line_blink_delay = 200;
                    if (this.line_blink_on) {
                        line_blink_delay = 400;
                    }

                    if (this.time_since_line_blink >= line_blink_delay) {
                        this.line_blink_on = !this.line_blink_on;
                        this.time_since_line_blink = 0;
                        // Blink the winning line a couple times, and then move on to display the next winning line.
                        this.num_line_blinks++;
                        this.blink_winning_line(this.current_winning_line, this.line_blink_on);
                        if (this.num_line_blinks > 5) {
                            this.current_winning_line++;
                            if (this.current_winning_line == this.winning_lines.length) {
                                this.set_reveal_state(this.WIN_REVEAL_STATE_SHOW_SCATTERS);
                            }
                            this.num_line_blinks = 0;
                        }
                    }

                }

            }
        }


        if (this.time_since_blink >= this.BLINK_DELAY) {
            this.blink_on = !this.blink_on;
            this.time_since_blink = 0;

            if (this.blink_on) {
                $("#control_pull").addClass("bright");
            }
            else {
                $("#control_pull").removeClass("bright");
            }

        }

        if (this.game_state == this.GAME_STATE_PULLING) {
            for (var col = that.current_reel_reveal + 1; col < 5; col++) {
                //$("#spinning_column_" + col).css("background-position", "0px " + Math.floor(Math.random() * 30) * 100 + "px" );
                $("#spinning_column_" + col + ' .spin-inner').css("background-position", "0px " + Math.floor(Math.random() * 20) * 114 + "px");
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
                url: "/slots/update?last=" + leaderboard_system.last_leaderboard_time + "&chatlast=" + chat_system.last_chatlog_index + "&credit_btc_value=" + this.credit_btc_value + "&_=" + timestamp
            }).done(function (update_result) {
                wowbar_system.handle_update(update_result);
                leaderboard_system.process_leaderboard_data(update_result.leaderboard, false);
                chat_system.process_chatlog(update_result.chatlog, false);
                that.set_progressive_jackpot(update_result.progressive_jackpot, update_result.total_jackpot);
                that.update_stat_label_widths();
            });
        }

        window.setTimeout(function () {
            that.call_update_service();
        }, 2000);
    },

    package_pregame_info: function () {
        var inttotalbet = this.num_lines * this.credit_btc_value;
        if (this.free_spins_left > 0) {
            inttotalbet = 0;
        }

        var p = {
            server_seed_hash: this.next_server_seed_hash,
            client_seed: this.client_seed,
            credit_btc_value: this.credit_btc_value,
            num_lines: this.num_lines,
            inttotalbet: inttotalbet
        };
        return p;
    },

    package_game_info: function (finish_result) {
        var p = {
            pregame_info: this.last_pregame_info_package,
            game_id: finish_result.game_id,
            unique_id: finish_result.unique_id,
            game_seed: finish_result.game_seed,
            prizes: finish_result.prizes,
            num_scatters: finish_result.num_scatters,
            progressive_jackpot: finish_result.progressive_jackpot,
            progressive_win: finish_result.progressive_win,
            intgameearnings: finish_result.intgameearnings,
            intwinnings: finish_result.intwinnings,
            inttotalbet: finish_result.inttotalbet, // The server will tell us if this is a 'free' game by setting the totalbet to zero
            reel_positions: finish_result.reel_positions
        };

        if (account_system.use_fake_credits) {
            p['unique_id'] = this.games_played;
        }
        return p;
    },

    check_game: function (show_dialog, game_info_package) {
        var proof_error = null;

        var proves_server_seed = false;
        var proves_reels = false;
        var proves_prizes = false;
        var game_is_legit = false;

        // first make sure that our client seed was used in the game seed
        if (game_info_package.game_seed.indexOf(game_info_package.pregame_info.client_seed) != -1) {
            // Next, extract the server's seed from the game_seed and SHA-256 it, and make sure the hash matches the hash provided
            // before the hand is dealt.
            var li = game_info_package.game_seed.lastIndexOf(game_info_package.pregame_info.client_seed);
            var server_seed = game_info_package.game_seed.substr(0, li) + game_info_package.game_seed.substr(li + game_info_package.pregame_info.client_seed.length);
            if (SHA256(server_seed) == game_info_package.pregame_info.server_seed_hash) {
                proves_server_seed = true;

                // Next, produce a mersenne twister and pick random numbers for the reel positions and verify them against the numbers from the server
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

                // At this point we need to sample this.NUM_BLESSED_NUMBERS + this.RULESET['hit_scarab_extra_blessings'] numbers
                var reel_positions = new Array();
                for (var r = 0; r < this.RULESET['reels'].length; r++) {
                    reel_positions.push(randrange(twister, 1, this.RULESET['reels'][r].length + 1));
                }

                var valid_reel_positions = true;

                // First check first 20 numbers, then if we hit the scarab, check the next 3
                for (var r = 0; valid_reel_positions && r < this.RULESET['reels'].length; r++) {
                    if (reel_positions[r] != game_info_package.reel_positions[r]) {
                        valid_reel_positions = false;
                    }
                }

                if (valid_reel_positions) {
                    proves_reels = true;

                    var num_scatters = Slots.count_scatters(this.RULESET['reels'], reel_positions, this.RULESET['scatter']);
                    if (num_scatters == game_info_package.num_scatters) {
                        var p = Slots.get_prizes(this.RULESET['reels'], this.RULESET['lines'], this.RULESET['order_of_wins'], this.RULESET['wild'], this.RULESET['wild_can_be'], reel_positions, game_info_package.pregame_info.num_lines, this.RULESET['paytable']);
                        var prizes = p[0];
                        var total_prize = p[1];

                        // We have to add bonuses based on the # of scatters...
                        if (num_scatters in this.RULESET['bonus_multipliers']) {
                            total_prize += Math.max(0, Math.floor(game_info_package.pregame_info.num_lines * this.RULESET['bonus_multipliers'][num_scatters]));
                        }

                        // Because the jackpots are always changing, we can't guarantee them..
                        var intwinnings = game_info_package.intwinnings - game_info_package.progressive_win;
                        var valid_prizes = (total_prize * game_info_package.pregame_info.credit_btc_value) == intwinnings;

                        for (var line in prizes) {
                            if (!(line in game_info_package.prizes) || game_info_package.prizes[line][0][0] != prizes[line][0][0] || game_info_package.prizes[line][0][1] != prizes[line][0][1] || game_info_package.prizes[line][1] != prizes[line][1]) {
                                valid_prizes = false;
                                break;
                            }
                        }

                        for (var line in game_info_package.prizes) {
                            if (!(line in prizes) || game_info_package.prizes[line][0][0] != prizes[line][0][0] || game_info_package.prizes[line][0][1] != prizes[line][0][1] || game_info_package.prizes[line][1] != prizes[line][1]) {
                                valid_prizes = false;
                                break;
                            }
                        }

                        //console.log("computed prizes:");
                        //console.log(prizes);
                        //console.log("server prizes:");
                        //console.log(game_info_package.prizes);
                        if (valid_prizes) {
                            proves_prizes = true;
                            game_is_legit = true;
                        } else {
                            proof_error = "prize";
                        }
                    } else {
                        proof_error = "scatters";
                    }
                } else {
                    proof_error = "reels";
                }
            } else {
                proof_error = "server_seed";
            }
        } else {
            proof_error = "client_seed";
        }

        if (show_dialog) {
            this.show_provably_fair_dialog(game_info_package, proves_server_seed, proves_reels, proves_prizes);
        }

        return game_is_legit ? true : proof_error;
    },

    show_provably_fair_dialog: function (game_info_package, proves_server_seed, proves_reels, proves_prizes) {
        var server_seed = game_info_package.game_seed.replace(game_info_package.pregame_info.client_seed, '');

        // Main game stuff
        $("#provably_fair_gameid").html(game_info_package.game_id);
        $("#provably_fair_server_seed").html(server_seed);
        $("#provably_fair_client_seed").html(game_info_package.pregame_info.client_seed);
        $("#provably_fair_game_seed").html(game_info_package.game_seed);
        $("#provably_fair_reel_positions").html(game_info_package.reel_positions.join(", "));

        $("#provably_fair_num_lines").html(game_info_package.pregame_info.num_lines);
        $("#provably_fair_num_lines_won").html(Slots.get_num_lines_won(game_info_package.prizes));
        $("#provably_fair_num_scatters").html(game_info_package.num_scatters);

        $("#provably_fair_total_bet").html(Bitcoin.int_amount_to_string(game_info_package.pregame_info.inttotalbet));

        $("#provably_fair_progressive_win").html(Bitcoin.int_amount_to_string(game_info_package.progressive_win));

        var intwinnings = game_info_package.intwinnings;
        $("#provably_fair_prize").html(Bitcoin.int_amount_to_string(intwinnings));

        //  - Use sprite sheet, added some display delays.
        $("#provably_fair_dialog .result_image").removeClass("pass");
        $("#provably_fair_dialog .result_image").removeClass("fail");
        $("#provably_fair_dialog .result_image").css('visibility', 'hidden');

        window.setTimeout(function () {
            $("#provably_fair_proves_server_seed").css('visibility', 'visible');
            $("#provably_fair_proves_server_seed").addClass(proves_server_seed ? "pass" : "fail");
        }, 500);

        window.setTimeout(function () {
            $("#provably_fair_proves_reels").css('visibility', 'visible');
            $("#provably_fair_proves_reels").addClass(proves_reels ? "pass" : "fail");
        }, 1000);

        window.setTimeout(function () {
            $("#provably_fair_proves_prize").css('visibility', 'visible');
            $("#provably_fair_proves_prize").addClass(proves_prizes ? "pass" : "fail");
        }, 1500);

        ////////////////////////////////////////////////////////////////////////////////
        // show the dialog
        $("#pf_tab_main").click(function () {
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
            onLoad: function () {
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
            game: "slots",
            gamedata: {
                "unique_id": game_info_package.unique_id,
                "prizes": game_info_package.prizes,
                "intwinnings": game_info_package.intwinnings,
                "intgameearnings": game_info_package.intgameearnings,
                "inttotalbet": inttotalbet,
                "num_scatters": game_info_package.num_scatters,
                "num_lines": game_info_package.pregame_info.num_lines
            }
        };
        var new_row = leaderboard_system.process_row("mygames", lb, false, false);
        //if( intwinnings > 0 ) {
        if (game_info_package.intgameearnings > 0) {
            leaderboard_system.process_row("recent", lb, false, false);
        }

        new_row.find("div.verify_button").on('click', function () {
            that.check_game(true, game_info_package);
        });
        //}

        // Display mygames page if it's the first game played
        if (this.games_played == 0) {
            $("#tab4").trigger("click");
        }
        this.games_played++;

        // and check it right now!
        var game_check = this.check_game(false, game_info_package);
        if (game_check != true) {
            this.show_server_lied_dialog(game_check, null, game_info_package.unique_id);
        }
    },

    animate_reel_reveal: function (finish_result, callback) {
        that = this;
        function reveal(col) {

            $("#spinning_column_" + col).removeClass("on");
            $("#single_symbol_holder_0_" + col).addClass("on");
            $("#single_symbol_holder_1_" + col).addClass("on");
            $("#single_symbol_holder_2_" + col).addClass("on");
            //that.draw_reel_column( col, finish_result.reel_positions[col] );
            that.draw_reel_column(col);
            that.current_reel_reveal = col;
            if (col == 4) {
                callback()
            }
            else {
                window.setTimeout(function () {
                    reveal(col + 1);
                }, that.CARD_DELAY);

            }
        }
        reveal(0);
    },

    finish_game: function (finish_result) {
        var that = this;

        var game_info_package = this.package_game_info(finish_result);

        // must come after package_game_info
        this.set_next_server_seed_hash(finish_result.server_seed_hash);

        //  - Draw the final real positions in sequential order, starting with left (just like how videpoker card reveal works)
        /*
        for( var i = 0; i < 5; i++ ) {
        this.draw_reel_column( i, finish_result.reel_positions[i] );
        }
        */
        this.animate_reel_reveal(finish_result, function () {

            that.free_spins_left = finish_result.free_spin_info.left;
            that.free_spins_use_fake_credits = finish_result.free_spin_info.use_fake_credits;
            that.add_game_to_leaderboard(game_info_package);
            that.game_state = that.GAME_STATE_PRE_PULL;
            if (finish_result.intbalance != undefined) {
                account_system.set_btc_balance(finish_result['intbalance'], finish_result['fake_intbalance']);
            }


            that.winning_lines = null;
            //  TEMP - Also check for scatters, even though intwinnings ought to be > 0 in that case (need to fix the back end)
            if (finish_result.intwinnings > 0 || finish_result.num_scatters >= 2) {
                that.set_reveal_state(that.WIN_REVEAL_STATE_SHOW_ALL);
                that.winning_lines = new Array();
                for (line_id in finish_result.prizes) {
                    that.winning_lines.push({ line_id: line_id, line_eval_symbol: finish_result.prizes[line_id][0][0], line_eval_count: finish_result.prizes[line_id][0][1], winnings: finish_result.prizes[line_id][1] });
                }
                var num_lines = 0;
                for (line_id in finish_result.prizes) {
                    num_lines++;
                }
                s = "WIN ";
                if (num_lines > 0) {
                    s += "" + num_lines + " LINE";
                    if (num_lines > 1) {
                        s += "S";
                    }
                }
                if (finish_result.num_scatters >= 2) {
                    if (num_lines > 0) {
                        s += " + ";
                    }
                    s += "" + finish_result.num_scatters + " SCATTER BONUS";
                }
                $("#qty_pays_text").html(s);

                window.setTimeout(function () {
                    //  - Should the scatter win play if you get free spins, or just any ol scatter?
                    if (finish_result.num_scatters >= 2) {
                        sound_system.play_sound("win_scatter");
                    }
                    else {
                        sound_system.play_sound("win1");
                    }
                }, that.WIN_SOUND_DELAY);
            }

            // Can now show the updated credits value since the game is done.
            var credits_won = finish_result.intwinnings / that.credit_btc_value;
            that.is_counting_up = true;

            // Skip the count up if you're in autoplay (since otherwise you won't see the final number)
            var start = 0;
            if (autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED) {
                start = credits_won;
            }

            // Determine when to show fireworks!
            var show_fireworks = credits_won > 0 && ((finish_result.num_scatters >= 3) || (Slots.get_num_lines_won(finish_result.prizes) >= 10));
            that.counter_wins_timer_id = that.countup_wins(start, credits_won, show_fireworks, that.WIN_TEXT_WIN, function () {
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

        var delta = 1;
        var delay = 25;
        if (current > 100) {
            delta = 5;
        }
        else if (current > 50) {
            delta = 2;
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
            url: this.get_reseed_url()
        }).done(function (reseed_request) {
            if (reseed_request.result == true) {
                that.set_next_server_seed_hash(reseed_request.server_seed_hash);
                that.free_spins_left = 0;
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

    // Override the game.js version to handle the FREE SPINS display
    update_credits: function (num_decimals) {
        if (this.free_spins_left == 0) {
            $("#credits").removeClass("free_spin plural");
            this._super(num_decimals);
            return;
        }
        $("#credits").addClass("free_spin");
        if (this.free_spins_left >= 2) {
            $("#credits").addClass("plural");
        }
        this.draw_credit_digits(0, this.free_spins_left);
    },

    update_controls: function () {

        $("#control_lines_value").html(this.num_lines);
        switch (this.game_state) {
            case this.GAME_STATE_PRE_PULL:
                $(".spinning_column").removeClass("on");
                $(".single_symbol_holder").addClass("on");

                //  - Disable this if you have free spins!
                if (this.free_spins_left > 0) {
                    $("#control_btc, #credits_holder").removeClass("clickable");
                } else {
                    $("#control_btc, #credits_holder").addClass("clickable");
                }
                break;
            case this.GAME_STATE_PULLING:
                $(".spinning_column").addClass("on");
                $(".single_symbol_holder").removeClass("on");
                $("#control_btc, #credits_holder").removeClass("clickable");
                break;
        }

        if (this.free_spins_left > 0) {
            $("#control_btc, #credits_holder").removeClass("clickable");
        }
        $("#bet_text").html("BET " + this.num_lines);

        //  - Eventually full_row can display more relevant info, except for just the initial PLAY 20 LINES text...
        if (this.game_state != this.GAME_STATE_PRE_PULL || this.pull_result != null) {
            $("#full_row").html("");
        }

        if (this.can_pull()) {
            $("#control_pull").addClass("on");
        }
        else {
            $("#control_pull").removeClass("on");
        }

        // In autoplay, just disable all the buttons.
        if (autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED || autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING) {
            $("#control_btc, #credits_holder").removeClass("clickable");
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
            onClose: function () {
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
    },

    handle_autoplay_start: function () {
        this.last_progressive_jackpot = null; // TODO update this in _bless to the number of hits

        autoplay_system.autoplay_start(false);
        $("#autoplay_dialog").trigger("close");
        this.update_controls();
    },

    handle_pull: function (e) {

        var that = this;
        if (!this.can_pull()) {
            return;
        }

        //  - What was the point of this code??? (taken from craps)
        if (e != undefined) e.preventDefault();

        //this.client_seed = get_client_seed();
        if( !this.check_client_seed() ) {
            return;
        }

        var credit_string = "credit_btc_value=" + this.credit_btc_value;
        var num_lines_string = "num_lines=" + this.num_lines;
        var use_fake_credits_string = "use_fake_credits=" + account_system.use_fake_credits;

        var bet_size = this.credit_btc_value * this.num_lines;
        this.clear_lines_and_winning_boxes();
        $("#line_pays_text").html("");
        $("#qty_pays_text").html("");

        // Check balance
        if (bet_size > account_system.get_active_btc_int_balance()) {
            account_system.show_no_credits_dialog();
            return;
        }

        var is_free_spin = false;
        if (this.free_spins_left > 0) {
            this.free_spins_left -= 1;
            use_fake_credits_string = "use_fake_credits=" + this.free_spins_use_fake_credits;
            is_free_spin = true;
        }
        else {
            this.num_credits -= this.num_lines;
        }

        this.update_credits();
        that.current_reel_reveal = -1;
        this.game_state = this.GAME_STATE_PULLING;
        this.stop_countup_wins();
        this.set_reveal_state(this.WIN_REVEAL_STATE_DONE);

        if (is_free_spin) {
            sound_system.play_sound("play_free_game");
        }
        else {
            sound_system.play_sound("pay_coins");
        }
        this.update_controls();

        this.client_seed = $("#next_client_seed").val();
        $("#next_client_seed").prop('disabled', true);

        this.last_pregame_info_package = this.package_pregame_info();
        $.ajax({
            url: this.get_pull_url(credit_string, num_lines_string, use_fake_credits_string)
        }).done(function (pull_result) {
            if (pull_result['error'] != null) {
                that.game_state = that.GAME_STATE_PRE_PULL;
                if (pull_result['error'] == "insufficient_funds") {
                    account_system.show_no_credits_dialog();
                } else if (pull_result['error'] == 'shutting_down') {
                    account_system.show_shutting_down_dialog();
                } else if (pull_result['error'] == 'need_seed') {
                    // If your seed is dead, you lose all of your free spins, so there's no point in restoring the previous free_spins value
                    if (!is_free_spin) {
                        that.num_credits += this.credit_btc_value;
                    }
                    that.update_credits();
                    that.reseed(function () {
                        that.handle_pull();
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
            that.set_progressive_jackpot(pull_result.progressive_jackpot);
            that.update_stat_label_widths();

            account_system.shutting_down(pull_result['shutdown_time'], false);
            if (pull_result.shutdown_time != undefined && pull_result.shutdown_time != 0) {
                account_system.shutting_down(pull_result.shutting_down);
            }

        }).fail(function () {
            that.game_state = that.GAME_STATE_PRE_PULL;
            that.update_controls();
            if (is_free_spin) {
                that.free_spins_left += 1;
            }
            else {
                that.num_credits += that.num_lines;
            }
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
                return true;
            case 13: //enter
                this.handle_pull();
                return true;
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

        $("#control_pull").click(function (e) {
            that.handle_pull(e);
        });

        $("#control_autoplay").click(function () {
            that.handle_auto();
        });

        $("#autoplay_dialog .autoplay_start_image").click(function () {
            that.handle_autoplay_start();
        });

        $(window).on('beforeunload', function () {
            if (that.game_state != that.GAME_STATE_PRE_PULL ||
                that.free_spins_left > 0 ||
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED ||
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING) {
                return 'You are in the middle of a game.  If you leave, you will be forfeiting your bet.'
            }
        });

        var autoplay_speed_changed = function (option) {
            autoplay_system.autoplay_speed = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_basic_speed").change(function () { autoplay_speed_changed($(this)); });

        $(document).keydown(function (ev) {
            if (!$("input").is(":focus") && that.handle_keypress(ev)) {
                ev.preventDefault();
            }
        });

        $("#control_betmax").click(function () {
            let numLines = that.RULESET['lines'].length;
			let credits = that.num_credits;
            if (that.handle_change_num_lines(Math.min(numLines, credits))) {
                sound_system.play_sound('boop');
            }
        });

        $("#control_payouts").click(function () {
            that.handle_payouts();
        });
        $("#control_lines_inc").click(function () {
            that.handle_change_num_lines(that.num_lines + 1);
        });
        $("#control_lines_dec").click(function () {
            that.handle_change_num_lines(that.num_lines - 1);
        });

        $("#control_btc").click(function () {
            if (that.free_spins_left > 0) {
                return;
            }
            if (that.game_state != that.GAME_STATE_PRE_PULL) {
                return;
            }

            $('#btc_credit_dialog').lightbox_me({
                centered: true,
                onLoad: function () {

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
        $(".symbol_widget").bind("mouseenter", function () {
            id = $(this).attr('id')
            //that.mouse_hover_line = id.charAt( id.length-1 );
            // Remove the starting "symbol_widget_" text to get the id number
            that.mouse_hover_line = id.slice(14);
            that.clear_lines_and_winning_boxes();
            $("#line_" + that.mouse_hover_line).addClass("on");
        });
        $(".symbol_widget").bind("mouseleave", function () {
            that.mouse_hover_line = 0;
            that.clear_lines_and_winning_boxes();
        });

        $("#btc_credit_dialog .btc_item").click(function () {
            $(".btc_item").removeClass("selected");
            $(this).addClass("selected");

            window.setTimeout(function () {
                $("#btc_credit_dialog").trigger("close");
            }, 250);

            $("#control_btc, #credits_holder").removeClass();
            $("#control_btc").addClass("btc_token");
            $("#control_btc, #credits_holder").addClass("clickable");
            id = $(this).attr("id");
            if (id == "btc_item_0001") {
                $("#control_btc").addClass("btc_token_0001");
                that.credit_btc_value = 10000; // "0.0001" BTC
            }
            else if (id == "btc_item_001") {
                $("#control_btc").addClass("btc_token_001");
                that.credit_btc_value = 100000; // "0.001" BTC
            }
            else if (id == "btc_item_005") {
                $("#control_btc").addClass("btc_token_005");
                that.credit_btc_value = 500000; // "0.005" BTC
            }
            else if (id == "btc_item_01") {
                $("#control_btc").addClass("btc_token_01");
                that.credit_btc_value = 1000000; // "0.01" BTC
            }
            else {
                alert("Unknown BTC/credit value.");
                return false;
            }
            that.calculate_credits();

            // Tell server!
            $.ajax({
                url: "account/set_credit_btc_value?credit_btc_value=" + that.credit_btc_value + "&game=slots"
            }).done(function (withdrawal_result) {
                // Do nothing
            });

            return false;

        });

        $("#title_holder").click(function () {
            dialog_system.handle_help(1);
        });

    },

    clear_lines_and_winning_boxes: function () {
        $(".line").removeClass("on");
        $(".single_symbol_holder").removeClass("winner");
        $(".single_symbol_holder").css("border-color", "");
        $(".symbol_widget").removeClass("winner");
    },

    draw_full_winning_line: function (line_id) {
        // This is used to test that the winning boxes are correct for the line being drawn
        $("#line_" + line_id).addClass("on");
        this.draw_line_winning_boxes(line_id, 5);
    },
    draw_playing_lines: function (num_lines) {
        $(".line").removeClass("on");
        for (var i = 0; i < num_lines; i++) {
            $("#line_" + i).addClass("on");
        }
    },

    handle_payouts: function () {
        var that = this;
        $('#payouts_dialog').lightbox_me({
            centered: true
        });

        if (!this.payouts_dialog_loaded) {
            $.ajax({
                url: "/slots/ajax_payouts_dialog"
            }).done(function (content) {
                $("#payouts_dialog").html(content);
                $("#payouts_dialog .close_button, #payouts_dialog .confirm_button").click(function () {
                    $('.dialog').trigger('close');
                });
                that.payouts_dialog_loaded = true;
            });
        }
    },

    handle_change_num_lines: function (new_val) {
        if (this.game_state != this.GAME_STATE_PRE_PULL) {
            return false;
        }
        if (this.free_spins_left > 0) {
            return false;
        }

        var something_changed = true;
        this.num_lines = new_val;
        if (this.num_lines < 1) {
            this.num_lines = 1;
            something_changed = false;
        }
        if (this.num_lines > this.RULESET['lines'].length) {
            this.num_lines = this.RULESET['lines'].length;
            something_changed = false;
        }
        // This stops the winning blinking stuff so that you can see what lines you are playing
        this.set_reveal_state(this.WIN_REVEAL_STATE_DONE);

        this.update_controls();

        this.draw_playing_lines(this.num_lines);
        $(".symbol_widget").removeClass("on");
        for (var i = 0; i < this.num_lines; i++) {
            $("#symbol_widget_" + i).addClass("on");
        }

        return something_changed;
    },

    set_progressive_jackpot: function (jackpot, total_jackpot) {
        var newTotal = total_jackpot;
        if (this.progressive_jackpot == jackpot) {
            return;
        }

        if (this.progressive_jackpot_timeout_id == undefined || this.progressive_jackpot_timeout_id == null) {
            var delay = 250 + Math.random() * 500;
            if (this.progressive_jackpot == null) {
                delay = 0;
            }

            var that = this;
            this.progressive_jackpot_timeout_id = window.setTimeout(function () {
                var frac = Math.floor((jackpot % 10000) / 100.0);
                var dec = Math.floor(jackpot / 10000.0);

                //  - Need to add in the credits for the jackpot itself?
                dec += that.RULESET['paytable']["(1, 5)"];

                if (frac < 10) {
                    frac = '0' + frac;
                }

                $("#progressive_jackpot").css({ opacity: 0.2 });
                $("#progressive_jackpot").html('' + dec + '.' + frac);               
                console.log(jackpot);
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
                var jackpotFix = newTotal / 100000000;
                that.display_jackpot(jackpotFix, parseFloat(dec + '.' + frac));
                $("#progressive_jackpot").animate({ opacity: 1.0 }, 500, function () {
                    that.progressive_jackpot_timeout_id = null;
                });

                that.progressive_jackpot = jackpot;
            }, delay);
        }

    },

    update_stat_label_widths: function (only) {
        // these must match css
        var block_width = 50;
        var padding = 4;

        $("#fiveinarow").css("width", (block_width - $("#fiveinarow > .title_payout_value").outerWidth() - padding) + "px");
    },

    get_pull_url: function (credit_string, num_lines_string, use_fake_credits_string) {
        return "/slots/pull?server_seed_hash=" + this.next_server_seed_hash + "&client_seed=" + this.client_seed + "&" + credit_string + "&" + num_lines_string + "&" + use_fake_credits_string + this.use_account_key();
    },

    get_reseed_url: function () {
        return "/slots/reseed" + this.use_account_key(true);
    },
});

function init_slots(key, my_player_ident, my_public_id, starting_server_seed_hash, initial_leaderboards, initial_mygames, chatlog, ruleset, credit_btc_value, sound_volume, free_spin_info_json ) {
    //  - Only load the sounds that we actually end up using!
    var sound_list = [ 
        ['boop', 'boop.wav', true, 1],
        ['win_scatter', 'slot_machine_win_22.wav', false, 1],
        ['win1', 'win1.wav', false, 1],
        ['pay_coins', 'coinpay.wav', false, 1],
        ['play_free_game', 'slot_machine_bet_10.wav', false, 1],
    ];
    common_init( 'Slots', key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, chatlog, sound_list, sound_volume );
    
    game_system = new SlotsSystem( starting_server_seed_hash, ruleset, credit_btc_value, JSON.parse(free_spin_info_json) );
    game_system.call_update_service();

    dialog_system.init_help( ["/static/images/slt-help-howtoplay.png", "/static/images/slt-help-paytables1.png", "/static/images/slt-help-paytables2.png", "#help_reels" ] ); 

    //we need to resize chat again, since blackjack does some progressive table size changing..
    chat_system.adjust_height(false);
    //same for game size
    game_system.resizeHandler();
}

