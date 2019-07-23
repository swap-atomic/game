var VideoPokerSystem = GameSystem.extend({
    init: function (prizes, starting_server_seed_hash, credit_btc_value_in, unfinished_game) {
        this._super('videopoker', starting_server_seed_hash, credit_btc_value_in, ['videopoker', 'blackjack', 'roulette', 'craps']);

        // Constants
        this.NUM_CARDS = 5;
        this.MAX_BET_SIZE = 5;
        this.MAX_DOUBLE_LEVEL = 2;

        this.GAME_PHASE_PRE_GAME = 0; // game not started, no cards visible
        this.GAME_PHASE_AWAITING_DEAL = 1; // clicked deal, cleared cards, sent AJAX request
        this.GAME_PHASE_DEALING_CARDS = 2; // got AJAX response + cards are cleared, can now deal cards
        this.GAME_PHASE_SELECT_HELD_CARDS = 3; // done dealing cards, waiting for hold command
        this.GAME_PHASE_AWAITING_HOLD = 4; // issued hold command via AJAX
        this.GAME_PHASE_FINISHING = 5; // got final game result, play win anim stuff (the WIN number counts up from 0)
        this.GAME_PHASE_WIN_COUNTER_COUNTING = 6; // the win counter is counting up
        this.GAME_PHASE_DOUBLE_DEALER_AWAITING_RESULT = 7; // User says that he wants to play double-or-nothing! Waiting for server to send dealer card.
        this.GAME_PHASE_DOUBLE_PICK_CARD = 8; // Waiting for user to pick a card
        this.GAME_PHASE_DOUBLE_PICK_AWAITING_RESULT = 9; // Waiting for server to return the result of picking a card
        this.GAME_PHASE_DOUBLE_DONE = 10; // User got the final result. Can now either continue double-or-nothing (if he won) or draw a fresh set of cards.

        this.cards = null;
        this.original_cards = null;
        this.holds = [false, false, false, false, false];
        this.bet_size = 1;
        this.hand_eval = 0;
        this.paytable = 0;
        this.last_firework_time = 0;
        this.double_level = 0;
        this.double_down_multiplier = 0;
        this.next_double_down_server_seed_hash = null;
        this.double_down_games = null;
        this.game_phase = this.GAME_PHASE_PRE_GAME;
        this.autoplay_mode_normal_double_down_rate = 1; //Sometimes is the default in the HTML
        this.idle_time = 0;

        //  - argh need to store this so that we can re-create the verify button data after a double down game is played...
        this.verify_hold_result = null;
        //  - argh this.cards is reused for double down games, so the recreation of verify data will fail when evaluating the hand...
        // so we need to store the regular game cards here...
        this.verify_final_cards = null;

        //  - We could also just hard code this in poker.js...
        for (var i = 0; i < poker_games.length; i++) {
            poker_games[i].prizes = prizes[i];
        }

        this.update_bet_column();
        this.update_clickables();
        this.init_handlers();
        this.time_update();

        if (unfinished_game['game_id'] != undefined || unfinished_game['game_id'] != null) {
            this.restore_unfinished_game(unfinished_game);
        }
    },

    restore_unfinished_game: function (unfinished_game) {
        this.cards = unfinished_game['cards'];
        this.original_cards = this.cards.slice(0);
        this.game_id = unfinished_game['game_id'];
        this.client_seed = unfinished_game['client_seed'];
        this.deal_hash = unfinished_game['deal_hash'];
        this.game_unique_id = unfinished_game['unique_id']
        this.game_phase = this.GAME_PHASE_DEALING_CARDS;
        this.reveal_deal_result(function () {
            window.setTimeout(function () {
                alert("We have restored an unfinished game of Video Poker for you. Completing this game will not cost any credits.");
            }, 500);
        });
    },

    update_bet_column: function () {
        $(".payout_column").removeClass("selected");
        $("#payout_column" + this.bet_size).addClass("selected");
        $("#bet_text").html("BET " + this.bet_size);
        if (this.bet_size == 5) {
            $("#jackpot-switch").prop("checked", true)
        } else {
            $("#jackpot-switch").prop("checked", false)
        }

    },

    update_buttons: function () {
        $("#control_betone").removeClass("on");
        $("#control_betmax").removeClass("on");
        if (this.game_phase == this.GAME_PHASE_PRE_GAME || this.game_phase == this.GAME_PHASE_DOUBLE_DONE) {
            $("#control_betone").addClass('on');
            $("#control_betmax").addClass('on');
            $("#control_paytables").removeClass();
        }
        else {
            $("#control_paytables").addClass("off");
        }

        if (autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED || autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING) {
            $("#control_draw").removeClass();
            $("#control_draw").addClass("off");
            $("#control_double").addClass("off");
        } else {
            $("#control_draw").removeClass();
            if (this.game_phase == this.GAME_PHASE_PRE_GAME) {

            }
            else if (this.game_phase == this.GAME_PHASE_SELECT_HELD_CARDS) {
                //  - Just keep it saying DRAW always.
                //$("#control_draw").addClass("hold");
                $(".hold").addClass("ghost");
            }
            else {
                $("#control_draw").addClass("off");
                $(".hold").removeClass("ghost");
            }

            if (this.game_phase == this.GAME_PHASE_DOUBLE_DEALER_AWAITING_RESULT ||
                this.game_phase == this.GAME_PHASE_DOUBLE_PICK_CARD ||
                this.game_phase == this.GAME_PHASE_DOUBLE_PICK_AWAITING_RESULT) {

                $("#control_draw").addClass("off");
            }
            if (this.game_phase == this.GAME_PHASE_DOUBLE_DONE) {
                $("#control_draw").removeClass("off");
            }

            if (this.can_play_double_dealer()) {
                $("#control_double").removeClass("off");
            }
            else {
                $("#control_double").addClass("off");
            }
        }
    },

    time_update: function () {
        var that = this;
        this.blink_on = !this.blink_on;
        this.idle_time += this.BLINK_DELAY;

        //  - Use hand_eval!
        // Blink the thing you're currently able to win
        $(".payout_item").removeClass("blink");
        $(".payout_item").removeClass("win");
        //this.blink_on = !this.blink_on;
        if (this.hand_eval > 0) {
            $("#payout_item" + this.hand_eval).addClass("win");
            if (this.blink_on) {
                $("#payout_item" + this.hand_eval).addClass("blink");
            }
        }

        // Blink the draw button
        if (this.game_phase == this.GAME_PHASE_PRE_GAME || this.game_phase == this.GAME_PHASE_SELECT_HELD_CARDS || this.game_phase == this.GAME_PHASE_FINISHING || this.game_phase == this.GAME_PHASE_DOUBLE_DONE) {
            //  - Should be in sprite sheet
            if (this.blink_on) {
                $("#control_draw").addClass("bright");
            }
            else {
                $("#control_draw").removeClass("bright");
            }
        }

        if (this.can_play_double_dealer()) {
            if (this.blink_on) {
                $("#control_double").addClass("bright");
            }
            else {
                $("#control_double").removeClass("bright");
            }
        }

        // Blink the PLAY 5 CREDITS text
        if (this.game_phase == this.GAME_PHASE_PRE_GAME || this.game_phase == this.GAME_PHASE_DOUBLE_DONE) {
            // Show immediately if no game has been played yet
            // Wait 30 seconds after the first game
            if (this.games_played == 0 || this.idle_time > 30000) {
                if (this.idle_time % 2000 == 0) {
                    $("#play_five_credits_container").show();
                }
                else if (this.idle_time % 2000 == 1000) {
                    $("#play_five_credits_container").hide();
                }
            }
        }
        else {
            this.idle_time = 0;
            $("#play_five_credits_container").hide();
        }

        window.setTimeout(function () {
            that.time_update();
        }, this.BLINK_DELAY);
    },

    display_card: function (id, rank_suit) {
        $("#card" + id).removeClass();
        $("#card" + id).addClass("game-card");

        //  - Special wild card
        //  - Magic number to indicate deuces wild = bad
        if (this.paytable == 5 && rank_suit[0] == '2') {
            rank_suit = rank_suit + '_wild';
        }
        $("#card" + id).addClass("card_" + rank_suit);
    },
    reveal_deal_result: function (extra_callback) {
        var that = this;
        sound_system.play_sound("deal_five");
        reveal_card = function (i) {
            that.display_card(i, that.cards[i])
            if (i == 4) {
                that.game_phase = that.GAME_PHASE_SELECT_HELD_CARDS;
                that.update_buttons();
                that.update_clickables();
                if (extra_callback != null) {
                    extra_callback();
                }
                if (autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_HOLD_ONLY) {
                    autoplay_system.autoplay_hold();
                }
                if (that.hand_eval > 0) {
                    window.setTimeout(function () {
                        sound_system.play_sound("win_on_deal");
                    }, that.WIN_SOUND_DELAY);
                }
            }
            if (i < 4) {
                window.setTimeout(function () { reveal_card(i + 1); }, that.CARD_DELAY);
            }
        };

        window.setTimeout(function () { reveal_card(0) }, that.CARD_DELAY);
    },

    reseed: function (cb) {
        var that = this;
        $.ajax({
            url: "/videopoker/reseed"
        }).done(function (reseed_request) {
            if (reseed_request.result == true) {
                that.set_next_server_seed_hash(reseed_request.server_seed_hash);
                cb();
            }
        });
    },

    clear_cards: function (should_play_sound) {
        var that = this;

        // Quick local test for credits
        // TODO - adjust bet size down after /hold and /double_pick ?
        if (this.num_credits < this.bet_size) {
            account_system.show_no_credits_dialog();
            return;
        }

        // Generate a random number and pass it off to the server
        // this.client_seed = get_client_seed();
        if (!this.check_client_seed()) {
            return;
        }

        this.game_phase = this.GAME_PHASE_AWAITING_DEAL;
        this.update_buttons();
        this.update_clickables();

        this.double_level = 0;
        $("#double_controls").hide();

        this.original_cards = this.cards = null;
        this.draw_win_amount(0, this.WIN_TEXT_WIN);

        this.num_credits -= this.bet_size;
        this.update_credits();
        use_fake_credits_string = "use_fake_credits=" + account_system.use_fake_credits;

        if (should_play_sound) {
            sound_system.play_sound("pay_coins");
        }

        this.client_seed = $("#next_client_seed").val();
        $("#next_client_seed").prop('disabled', true);

        $.ajax({
            url: "/videopoker/deal?bet_size=" + this.bet_size + "&paytable=" + this.paytable + "&server_seed_hash=" + this.next_server_seed_hash + "&client_seed=" + this.client_seed + "&credit_btc_value=" + this.credit_btc_value + "&" + use_fake_credits_string
        }).done(function (deal_result) {
            if (deal_result['error'] != null) {
                if (deal_result['error'] == "insufficient_funds") {
                    account_system.show_no_credits_dialog();
                } else if (deal_result['error'] == 'shutting_down') {
                    account_system.show_shutting_down_dialog();
                } else if (deal_result['error'] == 'need_seed') {
                    that.num_credits += that.bet_size;
                    that.update_credits();
                    that.reseed(function () {
                        that.clear_cards(false);
                    });
                }
                else {
                    alert("Internal server error. Please try again later. (" + deal_result['error'] + ")");
                }
                that.game_phase = that.GAME_PHASE_PRE_GAME;
                that.update_clickables();
                return;
            }
            that.cards = deal_result['cards'];
            that.original_cards = that.cards.slice(0);
            that.game_id = deal_result['game_id']
            that.game_unique_id = deal_result['unique_id']
            if (account_system.use_fake_credits) {
                that.game_unique_id = that.games_played;
            }
            that.hand_eval = deal_result['hand_eval']
            that.deal_hash = deal_result['deal_hash']
            if (that.game_phase == that.GAME_PHASE_DEALING_CARDS) {
                // Already done blanking out the old cards, can now deal cards
                that.reveal_deal_result(null);
            }
            that.set_balance(deal_result['intbalance'], true, deal_result['fake_intbalance']);
            account_system.shutting_down(deal_result['shutdown_time'], false);
            that.update_progressive_jackpot($('#payout_column5 div:first'), deal_result.progressive_jackpot);
        }).fail(function () {
            that.game_phase = that.GAME_PHASE_PRE_GAME;
            that.update_buttons();
            that.update_clickables();
            that.num_credits += that.bet_size;
            that.update_credits();
            alert("Error connecting to server. Please check your internet connection, try again, or reload the page.");
        });

        for (var i = 0; i < this.NUM_CARDS; i++) {
            this.display_card(i, "back");
            window.setTimeout(function () {
                that.game_phase = that.GAME_PHASE_DEALING_CARDS;
                that.update_clickables();
                if (that.cards != null) {
                    // Done blanking out cards, and we have the AJAX data already,
                    // so can start dealing them out.
                    that.reveal_deal_result(null);
                }
            }, this.CARD_DELAY);

            this.holds[i] = false;
        }
        $(".hold").removeClass("on");
        $("#hold0").removeClass("double_dealer");
    },

    countup_wins: function (p) {
        var that = this;
        this.draw_win_amount(p, this.WIN_TEXT_WIN);
        this.num_credits += 1;
        this.update_credits();

        var delay = 100;
        if (p > 50) {
            delay = 25;
        }
        else if (p > 10) {
            delay = 50;
        }

        var poker_game = poker_games[this.paytable];
        if (poker_game.is_hand_eval_worth_fireworks(this.hand_eval) && !isMobile.any()) {
            this.maybe_create_firework();
        }

        if (p >= this.prize) {
            this.game_phase = this.GAME_PHASE_PRE_GAME;
            this.update_buttons();
            this.update_clickables();
            return;
        }

        window.setTimeout(function () {
            that.countup_wins(p + 1);
        }, delay);

    },

    enable_verify_button: function (new_row) {
        var that = this;

        // Use closures to lock in these game state values
        var _game_id = this.game_id;
        var _deal_hash = this.deal_hash;
        var _client_seed = this.client_seed;
        var _original_cards = this.original_cards.slice(0);
        //var _cards = this.cards.slice(0);
        var _cards = this.verify_cards.slice(0);
        var _bet_size = this.bet_size;
        var _original_holds = this.holds.slice(0);
        var _double_down_games = this.double_down_games; //don't copy via slice(), i want to be able to get all the games as they're changing.
        var _verify_hold_result = clone(that.verify_hold_result);
        var _paytable = that.paytable;

        new_row.find("div.verify_button").click(function () {
            var dd_games = new Array();
            for (var i = 0; i < _double_down_games.length; i++) {
                if (_double_down_games[i].deal_hash_source != undefined) {
                    dd_games.push(_double_down_games[i]);
                }
            }
            that.check_game(true, _game_id, _deal_hash, _verify_hold_result['deal_hash_source'],
                       _verify_hold_result['game_seed'], _verify_hold_result['last_server_seed_hash'], _client_seed,
                       _verify_hold_result['client_seed'], _original_cards, _verify_hold_result['cards'],
                       _original_holds, _verify_hold_result['original_num_holds'], _verify_hold_result['num_not_held'],
                       _cards, _paytable, _verify_hold_result['hand_eval'], _bet_size, _verify_hold_result['prize'], _verify_hold_result['progressive_win'], dd_games);
            return false;
        });
    },

    reveal_wins: function (hold_result) {
        this.game_phase = this.GAME_PHASE_WIN_COUNTER_COUNTING;

        this.verify_hold_result = hold_result;
        this.verify_cards = this.cards;

        if (this.prize > 0) {
            window.setTimeout(function () {
                sound_system.play_sound("win1");
            }, this.WIN_SOUND_DELAY);
            // Skip the count up if you're in autoplay (since otherwise you won't see the final number)
            // Start at 1 since that's what the first WIN X should say. It shouldn't start at WIN 0.
            //  - Do all the other games have this same problem???
            var start = 1;
            if (autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED) {
                start = this.prize;
            }
            this.countup_wins(start);
        } else {
            this.game_phase = this.GAME_PHASE_PRE_GAME;
            this.update_buttons();
            this.update_clickables();
        }

        var timestamp = (new Date()).getTime();
        var lb = {
            game: 'videopoker',
            timestamp: timestamp / 1000,
            player_ident: account_system.player_ident,
            public_id: account_system.public_id,
            gamedata: {
                multiplier: -1,
                paytable: game_system.paytable,
                intgameearnings: (this.credit_btc_value * this.prize) - hold_result['intbet'],
                intbetamount: hold_result['intbet'],
                intoriginalwinnings: this.credit_btc_value * this.prize,
                intwinnings: this.credit_btc_value * this.prize,
                progressive_win: 0,
                unique_id: this.game_unique_id,
                hand_eval: this.hand_eval
            }
        };

        var new_row = leaderboard_system.process_row('mygames', lb, false, false);
        this.enable_verify_button(new_row);

        // Display mygames page if it's the first game played
        if (this.games_played == 0) {
            $("#tab4").trigger("click");
        }
        this.games_played++;

        //  - Insta-add your game to the recent list
        //  - Should wait until all cards have been revealed!
        if (this.prize > 0) {
            leaderboard_system.process_row("recent", lb, false, false);
        }

        this.set_next_server_seed_hash(hold_result.server_seed_hash);
        this.next_double_down_server_seed_hash = hold_result.double_down_server_seed_hash;
    },

    reveal_hold_result: function (hold_result, card, should_play_single_sound) {
        var that = this;
        while (this.holds[card] == true && card < 5) {
            card++
        }

        if (card == 5) {
            this.reveal_wins(hold_result);
            return;
        }

        if (should_play_single_sound) {
            //sound_system.play_sound( "show_card" + card );
            sound_system.play_rotating("show_card");
        }
        this.display_card(card, this.cards[card]);
        window.setTimeout(function () {
            that.reveal_hold_result(hold_result, card + 1, should_play_single_sound);
        }, this.CARD_DELAY);
    },

    hold_cards: function () {
        var that = this;
        this.game_phase = this.GAME_PHASE_AWAITING_HOLD;
        this.update_buttons();
        this.update_clickables();

        var original_num_holds = 0;

        str = "";
        for (var i = 0; i < this.NUM_CARDS; i++) {
            str = str + (this.holds[i] ? "1" : "0");

            if (this.holds[i]) {
                original_num_holds += 1;
            }
        }

        sound_system.play_sound('boop');

        $.ajax({
            url: "/videopoker/hold?game_id=" + this.game_id + "&holds=" + str + "&server_seed=" + this.next_server_seed_hash
        }).done(function (hold_result) {
            if (hold_result['error'] != null) {
                alert("Error (" + hold_result['error'] + ")");
                that.game_phase = that.GAME_PHASE_PRE_GAME;
                that.update_clickables();
                that.update_buttons();
                return;
            }

            var num_not_held = 0;
            for (var i = 0; i < that.NUM_CARDS; i++) {
                if (that.holds[i] == false) {
                    that.display_card(i, "back");

                    that.cards[i] = hold_result['cards'][num_not_held];
                    num_not_held++;
                }
            }
            that.set_balance(hold_result['intbalance'], false, hold_result['fake_intbalance']);
            that.game_phase = that.GAME_PHASE_FINISHING;
            that.hand_eval = hold_result['hand_eval'];
            that.btc_bet = Bitcoin.int_amount_to_string(hold_result['intbet']);
            that.prize = hold_result['prize'];
            that.btc_prize = Bitcoin.int_amount_to_string(hold_result['prize'] * that.credit_btc_value);
            that.original_prize = that.prize;
            that.progressive_win = hold_result['progressive_win'];

            that.update_clickables();

            var result = that.check_game(false, that.game_id, that.deal_hash, hold_result['deal_hash_source'],
                                    hold_result['game_seed'], that.next_server_seed_hash, that.client_seed,
                                    hold_result['client_seed'], that.original_cards, hold_result['cards'],
                                    that.holds, original_num_holds, num_not_held, that.cards, that.paytable, that.hand_eval,
                                    that.bet_size, that.prize, that.progressive_win, null);
            if (result != true) {
                that.show_server_lied_dialog(result, null, that.game_id);
            }

            // These are required if we ever want to verify this game later...
            hold_result['original_num_holds'] = original_num_holds;
            hold_result['num_not_held'] = num_not_held;

            hold_result['last_server_seed_hash'] = that.next_server_seed_hash;

            // A new double down list is created even if you can't play (it remains empty until the next game)
            that.double_down_games = new Array();
            that.double_down_multiplier = 1;

            window.setTimeout(function () {
                if (num_not_held == 5) {
                    sound_system.play_sound("deal_five");
                }
                that.reveal_hold_result(hold_result, 0, num_not_held != 5);
            }, that.CARD_DELAY);
        }).fail(function () {
            that.game_phase = that.GAME_PHASE_SELECT_HELD_CARDS;
            that.update_buttons();
            that.update_clickables();
            alert("Error connecting to server. Please check your internet connection, try again, or reload the page.");
        });
    },

    // Called by AccountSystem
    handle_balance_update: function (intbalance) {
        if (this.game_phase == this.GAME_PHASE_PRE_GAME || this.game_phase == this.GAME_PHASE_DOUBLE_DONE) {
            this.calculate_credits();
        }
    },

    set_balance: function (intbalance, should_update_credits, fake_intbalance) {
        account_system.set_btc_balance(intbalance, fake_intbalance);

        if (should_update_credits) {
            this.calculate_credits();
        }
    },

    check_game: function (show_dialog_after, game_id, deal_hash, deal_hash_source, game_seed, server_seed_hash, client_seed, reported_client_seed, orig_cards, hold_result_cards, holds, original_num_holds, num_not_held, final_cards, ptable, hand_eval, bet_size, prize, progressive_win, dd_games) {
        var game_cards = deal_hash_source.substring(1, 104 + 1);

        var idx = game_seed.indexOf(client_seed);
        var server_seed = game_seed.substring(0, idx);

        var game_is_legit = false;
        var proof_error = null;
        var proves_server_seed = false;
        var proves_deck = false;
        var proves_hand_evaluation = false;
        var proves_prize = false;

        var poker_game = poker_games[ptable];
        // first make sure the hash is legitimate
        // 1. Our seed is reported exactly as we sent it
        // 2. Our seed is included somewhere in the game seed
        // 3. The game seed is included into the source hash
        if (reported_client_seed == client_seed && game_seed.indexOf(client_seed) != -1 && deal_hash_source.indexOf(game_seed) != -1) {
            // Next, extract the server's seed from the game_seed and SHA-256 it, and make sure the hash matches the hash provided
            // before the hand is dealt.
            //var li = game_seed.lastIndexOf(client_seed);
            //var announced_server_seed = game_seed.substring(0, li);
            var li = game_seed.lastIndexOf(client_seed);
            var announced_server_seed = game_seed.substr(0, li) + game_seed.substr(li + client_seed.length);
            var check_server_seed_hash = SHA256(announced_server_seed);
            if (check_server_seed_hash == server_seed_hash) {
                proves_server_seed = true;

                // Next, perform the shuffle on a deck of cards and verify the deck is exactly the one that we got.
                // 1. Python's random module first hashes the game seed using SHA256
                // 2. The hash is turned into a sequence of bytes
                // 3. The bytes are appended to the seed
                // 4. The result is used to seed a Mersenne Twister
                var hasher = new jsSHA(game_seed, "ASCII");
                var hashed_game_seed = hasher.getHash("SHA-512", "HEX");
                var hash_bytes = new Array()

                // Concat the original seed with the hash of the seed
                for (var i = 0; i < game_seed.length; i++) {
                    hash_bytes.push(game_seed.charCodeAt(i));
                }

                for (var i = 0; i < 128; i += 2) {
                    hash_bytes.push(parseInt(hashed_game_seed.substring(i, i + 2), 16));
                }

                // Convert the hash_bytes into an array of 32-bit words starting from the right
                var word_array = byte_array_to_words(hash_bytes);

                var twister = new MersenneTwister();
                twister.init_by_array(word_array, word_array.length);

                // At this point we need to shuffle the deck (it must match the one on the server or else we'll get the wrong answer)
                var check_cards = this.STANDARD_CARDS.slice(0); // copy
                shuffle(twister, check_cards)
                check_cards = check_cards.join("");

                // This verifies the deck order hasn't changed
                if (check_cards == game_cards) {
                    // Here, we verify that the hash of the deal_hash_source (what the server gave us in /deal) matches the actual hash
                    var check_hash = SHA256(deal_hash_source);
                    if (check_hash == deal_hash) {
                        proves_deck = true;

                        // Verify the cards that were given in both deal and hold to have actually came from the deck
                        if (orig_cards[0] == game_cards.substring(0, 2) &&
                            orig_cards[1] == game_cards.substring(2, 4) &&
                            orig_cards[2] == game_cards.substring(4, 6) &&
                            orig_cards[3] == game_cards.substring(6, 8) &&
                            orig_cards[4] == game_cards.substring(8, 10)) {

                            var good = true;
                            for (var i = 0; i < hold_result_cards.length; i++) {
                                if (hold_result_cards[i] != game_cards.substring(10 + i * 2, 10 + (i * 2) + 2)) {
                                    good = false;
                                    break;
                                }
                            }

                            if (good && original_num_holds == (this.NUM_CARDS - num_not_held)) {
                                // Make sure the resulting hand we have is _actually_ the hand reported by the server
                                if (poker_game.evaluate_hand(final_cards) == hand_eval) {
                                    proves_hand_evaluation = true;
                                    //var pt = poker_game.prizes[bet_size - 1];
                                    //if( (hand_eval < HAND_JACKS_OR_BETTER && prize == 0 ) || ( hand_eval >= HAND_JACKS_OR_BETTER && pt[hand_eval] == (prize-progressive_win) ) ) {
                                    if ((hand_eval == poker_game.HAND_NOTHING && prize == 0) || (hand_eval > poker_game.HAND_NOTHING && poker_game.get_hand_prize_amount(bet_size, hand_eval) == (prize - progressive_win))) {
                                        proves_prize = true;
                                        game_is_legit = true;
                                    } else {
                                        //server gave us a bad prize
                                        proof_error = "prize";
                                    }
                                } else {
                                    //server misevaluated our hand
                                    proof_error = "hand_eval";
                                }
                            } else {
                                //server gave us bad cards in hold?
                                proof_error = "hold";
                            }
                        } else {
                            //server dealt wrong?
                            proof_error = "deal";
                        }
                    } else {
                        //server lied about the game hash
                        proof_error = "game_hash";
                    }
                } else {
                    //our generated deck from game seed doesn't match
                    proof_error = "deck";
                }
            } else {
                proof_error = "server_seed";
            }
        } else {
            //server didn't use our client_seed
            proof_error = "client_seed";
        }


        if (show_dialog_after) {
            var idx = game_seed.indexOf(client_seed);
            var server_seed = game_seed.substring(0, idx);
            if (idx >= 0) {
                //  - game_seed.slice(idx + client_seed.length, game_seed.length - idx - client_seed.length); is always an empty string
                game_seed = server_seed + "<b>" + client_seed + "</b>" + game_seed.slice(idx + client_seed.length, game_seed.length - idx - client_seed.length);
            }

            var hold_str = "";
            for (var i = 0; i < 5; i++) {
                if (holds[i]) {
                    hold_str += orig_cards[i];
                }
            }
            this.show_provably_fair_dialog(game_id, server_seed, server_seed_hash, client_seed, game_seed, game_cards, deal_hash, deal_hash_source, hold_str, final_cards, poker_game.get_hand_eval_name(hand_eval), prize - progressive_win, proves_server_seed, proves_deck, proves_hand_evaluation, proves_prize);
        }

        //  - This will populate the double down stuff in the dialog that has just popped up!
        if (dd_games != null) {
            this.check_double_games(show_dialog_after, dd_games);
        }

        return game_is_legit ? true : proof_error;
    },

    get_pretty_cards: function (s) {
        s = s.replace(/t/g, "T");
        s = s.replace(/j/g, "J");
        s = s.replace(/q/g, "Q");
        s = s.replace(/k/g, "K");
        s = s.replace(/a/g, "A");
        return s;
    },

    show_provably_fair_dialog: function (game_id, server_seed, server_seed_hash, client_seed, game_seed, game_cards, deal_hash, hash_string, held_cards, final_hand, hand_evaluation, prize, proves_server_seed, proves_deck, proves_hand_evaluation, proves_prize) {

        // Make game cards perty
        game_cards = this.get_pretty_cards(game_cards);
        held_cards = this.get_pretty_cards(held_cards);
        final_hand = this.get_pretty_cards(final_hand.join(''));

        // Main game stuff
        $("#provably_fair_gameid").html(game_id);
        $("#provably_fair_server_seed").html(server_seed);
        $("#provably_fair_server_seed_hash").html(server_seed_hash);
        $("#provably_fair_client_seed").html(client_seed);
        $("#provably_fair_game_seed").html(game_seed);
        $("#provably_fair_game_hash").html(deal_hash);
        $("#provably_fair_game_cards").html(game_cards);

        $("#provably_fair_held_cards").html(held_cards);
        $("#provably_fair_final_hand").html(final_hand);
        $("#provably_fair_hand_evaluation").html(hand_evaluation);
        $("#provably_fair_prize").html(prize);

        //  - Use sprite sheet, added some display delays.
        $("#provably_fair_dialog .result_image").removeClass("pass");
        $("#provably_fair_dialog .result_image").removeClass("fail");
        $("#provably_fair_dialog .result_image").css('visibility', 'hidden');


        $("#pf_tab_main").click(function () {
            $("#pf_tabs li a").removeClass("selected");
            $(this).addClass("selected");
            $(".pf_page").removeClass("selected");
            $(".pfdd_page").removeClass("selected");
            $("#pf_page_main").addClass("selected");

            return false;
        });



        window.setTimeout(function () {
            $("#provably_fair_proves_server_seed").css('visibility', 'visible');
            $("#provably_fair_proves_server_seed").addClass(proves_server_seed ? "pass" : "fail");
        }, 500);
        window.setTimeout(function () {
            $("#provably_fair_proves_deck").css('visibility', 'visible');
            $("#provably_fair_proves_deck").addClass(proves_deck ? "pass" : "fail");
        }, 1000);
        window.setTimeout(function () {
            $("#provably_fair_proves_hand_evaluation").css('visibility', 'visible');
            $("#provably_fair_proves_hand_evaluation").addClass(proves_hand_evaluation ? "pass" : "fail");
        }, 1500);
        window.setTimeout(function () {
            $("#provably_fair_proves_prize").css('visibility', 'visible');
            $("#provably_fair_proves_prize").addClass(proves_prize ? "pass" : "fail");
        }, 2000);

        $('#provably_fair_dialog').lightbox_me({
            centered: true,
            onLoad: function () {
                $('#pf_tab_main').click();
                $('#provably_fair_dialog').trigger('reposition');
            }
        });
    },

    check_double_games: function (show_dialog_after, double_down_games) {

        var game_is_legit = new Array();
        var proof_error = new Array();
        var proves_server_seed = new Array();
        var proves_deck = new Array();
        var proves_prize = new Array();
        var result = new Array();

        for (var game_index = 0; game_index < double_down_games.length; game_index++) {
            var double_down_game = double_down_games[game_index];
            var game_cards = double_down_game.deal_hash_source.substring(1, 104 + 1);

            game_is_legit.push(false);
            proof_error.push(null);
            proves_server_seed.push(false);
            proves_deck.push(false);
            proves_prize.push(false);

            // first make sure the hash is legitimate
            // 1. Our seed is reported exactly as we sent it
            // 2. Our seed is included somewhere in the game seed
            // 3. The game seed is included into the source hash
            if (double_down_game.client_seed == double_down_game.real_client_seed
               && double_down_game.game_seed.indexOf(double_down_game.client_seed) != -1
               && double_down_game.deal_hash_source.indexOf(double_down_game.game_seed) != -1) {
                // Next, extract the server's seed from the game_seed and SHA-256 it, and make sure the hash matches the hash provided
                // before the hand is dealt.
                var li = double_down_game.game_seed.lastIndexOf(double_down_game.client_seed);
                var announced_server_seed = double_down_game.game_seed.substring(0, li);
                //var li = game_seed.lastIndexOf(client_seed);
                //var announced_server_seed = game_seed.replace(client_seed,'');
                var check_server_seed_hash = SHA256(announced_server_seed);
                if (check_server_seed_hash == double_down_game.server_seed_hash) {
                    proves_server_seed[game_index] = true;

                    // Next, perform the shuffle on a deck of cards and verify the deck is exactly the one that we got.
                    // 1. Python's random module first hashes the game seed using SHA256
                    // 2. The hash is in turned into a sequence of bytes
                    // 3. The bytes are appended to the seed
                    // 4. The result is used to seed a Mersenne Twister
                    var hasher = new jsSHA(double_down_game.game_seed, "ASCII");
                    var hashed_game_seed = hasher.getHash("SHA-512", "HEX");
                    var hash_bytes = new Array()

                    // Concat the original seed with the hash of the seed
                    for (var i = 0; i < double_down_game.game_seed.length; i++) {
                        hash_bytes.push(double_down_game.game_seed.charCodeAt(i));
                    }

                    for (var i = 0; i < 128; i += 2) {
                        hash_bytes.push(parseInt(hashed_game_seed.substring(i, i + 2), 16));
                    }

                    // Convert the hash_bytes into an array of 32-bit words starting from the right
                    var word_array = new Array();
                    for (var i = hash_bytes.length - 1; i >= 0; ) {
                        var n = 0;
                        for (var j = 0; j < 4 && i >= 0; j++, i--) {
                            n += (hash_bytes[i] * 16777216);
                            if (j != 3 && i != 0) {
                                n = n / 256;
                            } else if (j != 3 && i == 0) {
                                n = n / (1 << (8 * (3 - j)));
                            }
                        }
                        word_array.push(n);
                    }

                    var twister = new MersenneTwister();
                    twister.init_by_array(word_array, word_array.length);

                    // At this point we need to shuffle the deck (it must match the one on the server or else we'll get the wrong answer)
                    var check_cards = this.STANDARD_CARDS.slice(0); // copy
                    shuffle(twister, check_cards)
                    check_cards = check_cards.join("");

                    // This verifies the deck order hasn't changed
                    if (check_cards == game_cards) {
                        // Here, we verify that the hash of the deal_hash_source (what the server gave us in /double_dealer) matches the actual hash
                        var check_hash = SHA256(double_down_game.deal_hash_source);
                        if (check_hash == double_down_game.deal_hash) {
                            proves_deck[game_index] = true;

                            // Verify the cards that were given in both deal and hold to have actually came from the deck
                            if (double_down_game.dealer_card == double_down_game.cards[0] &&
                                double_down_game.cards[0] == check_cards.substring(0, 2) &&
                                double_down_game.cards[1] == check_cards.substring(2, 4) &&
                                double_down_game.cards[2] == check_cards.substring(4, 6) &&
                                double_down_game.cards[3] == check_cards.substring(6, 8) &&
                                double_down_game.cards[4] == check_cards.substring(8, 10)) {

                                //  - Can just use a vanilla poker game instance to get access to the card rank method
                                poker_game = poker_games[0];
                                var held_card_rank = poker_game.get_card_rank_number(double_down_game.cards[double_down_game.hold]);
                                var dealer_card_rank = poker_game.get_card_rank_number(double_down_game.dealer_card);

                                if (dealer_card_rank > held_card_rank && double_down_game.prize == 0) {
                                    proves_prize[game_index] = true;
                                    double_down_game.winlosepush = 'lose';
                                } else if (dealer_card_rank == held_card_rank && double_down_game.prize == double_down_game.round_prize) {
                                    proves_prize[game_index] = true;
                                    double_down_game.winlosepush = 'push';
                                } else if (dealer_card_rank < held_card_rank && double_down_game.prize == (double_down_game.round_prize * 2)) {
                                    proves_prize[game_index] = true;
                                    double_down_game.winlosepush = 'win';
                                } else {
                                    proof_error[game_index] = "prize";
                                    double_down_game.winlosepush = 'N/A';
                                }

                                if (proves_prize[game_index]) {
                                    game_is_legit[game_index] = true;
                                }

                            } else {
                                //server dealt wrong?
                                proof_error[game_index] = "deal";
                            }
                        } else {
                            //server lied about the game hash
                            proof_error[game_index] = "game_hash";
                        }
                    } else {
                        //our generated deck from game seed doesn't match
                        proof_error[game_index] = "deck";
                    }
                } else {
                    proof_error[game_index] = "server_seed";
                }
            } else {
                //server didn't use our client_seed
                proof_error[game_index] = "client_seed";
            }

            if (game_is_legit[game_index]) {
                result.push(true);
            } else {
                result.push(proof_error[game_index]);
            }
        }

        if (show_dialog_after) {
            this.update_provably_fair_double_down_dialog(double_down_games, result, proves_server_seed, proves_deck, proves_prize);
        }

        return result;
    },

    update_provably_fair_double_down_dialog: function (double_down_games, result, proves_server_seed, proves_deck, proves_prize) {
        var num_games = double_down_games.length;

        $('.pfdd_tab').remove();
        $('.pfdd_page').remove();

        var page_content = $('#provably_fair_double_down_content_template').html();
        var did_animations = new Array();

        //  - We already have the main page tabs set up...? 
        // So just append the doubledown tabs...

        for (var game_index = 0; game_index < double_down_games.length; game_index++) {
            $('#pf_tabs').append('<li><a href="#" class="pfdd_tab" id="pfdd_tab' + game_index + '">Double ' + (game_index + 1) + '</a></li>');

            $('#pf_page_container').append("<div class='pfdd_page' id='pfdd_page" + game_index + "'></div>");
            $("#pfdd_page" + game_index).html(page_content);
            $("#pfdd_page" + game_index).find('*').each(function (i, e) {
                var old_id = $(e).attr("id");
                if (old_id != null && old_id != undefined) {
                    $(e).attr("id", $(e).attr("id") + game_index);
                }
            });

            $("#pfdd_gameid" + game_index).html(double_down_games[game_index].game_id);
            $("#pfdd_server_seed_hash" + game_index).html(double_down_games[game_index].server_seed_hash);
            $("#pfdd_client_seed" + game_index).html(double_down_games[game_index].client_seed);
            $("#pfdd_game_seed" + game_index).html(double_down_games[game_index].game_seed);
            $("#pfdd_game_hash" + game_index).html(double_down_games[game_index].deal_hash);
            $("#pfdd_dealer_card" + game_index).html(double_down_games[game_index].dealer_card);

            $("#pfdd_game_hash_source" + game_index).html(double_down_games[game_index].deal_hash_source);
            $("#pfdd_chosen_card" + game_index).html(double_down_games[game_index].cards[double_down_games[game_index].hold]);
            $("#pfdd_win" + game_index).html(double_down_games[game_index].winlosepush);
            $("#pfdd_prize" + game_index).html(double_down_games[game_index].prize);
            $("#pfdd_wager" + game_index).html(double_down_games[game_index].round_prize);

            did_animations.push(false);
        }

        $('#pf_tabs').append('<li class="finaltab pfdd_tab"</li>');

        //  - Use sprite sheet, added some display delays.
        $(".pfdd_page").find(".result_image").removeClass("pass");
        $(".pfdd_page").find(".result_image").removeClass("fail");
        $(".pfdd_page").find(".result_image").css('visibility', 'hidden');

        $("#pf_tabs li a.pfdd_tab").click(function () {
            var id = $(this).attr("id");
            var idx = id.charAt(id.length - 1);
            $("#pf_tabs li a").removeClass("selected");
            $(this).addClass("selected");
            $(".pf_page").removeClass("selected");
            $(".pfdd_page").removeClass("selected");
            $("#pfdd_page" + idx).addClass("selected");

            idx = parseInt(idx);

            if (!did_animations[idx]) {
                window.setTimeout(function () {
                    $("#pfdd_proves_server_seed" + idx).css('visibility', 'visible');
                    $("#pfdd_proves_server_seed" + idx).addClass(proves_server_seed[idx] ? "pass" : "fail");
                }, 500);
                window.setTimeout(function () {
                    $("#pfdd_proves_deck" + idx).css('visibility', 'visible');
                    $("#pfdd_proves_deck" + idx).addClass(proves_deck[idx] ? "pass" : "fail");
                }, 1000);
                window.setTimeout(function () {
                    $("#pfdd_proves_prize" + idx).css('visibility', 'visible');
                    $("#pfdd_proves_prize" + idx).addClass(proves_prize[idx] ? "pass" : "fail");
                }, 1500);
                did_animations[idx] = true;
            }
            return false;
        });

    },

    update_progressive_jackpot: function (div, new_value, total_jackpot) {
        var frac = Math.floor((new_value % 10000) / 100.0);
        var dec = Math.floor(new_value / 10000.0);
		var that = this;
        if (frac < 10) {
            frac = '0' + frac;
        }

        div.html('' + (4000 + dec) + '.' + frac);
		var progValue = parseFloat((4000 + dec) + '.' + frac);
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
        var total_jackpot = total_jackpot / 100000000;
        that.display_jackpot(total_jackpot, progValue);
		

    },
    update_clickables: function () {
        if (this.game_phase == this.GAME_PHASE_PRE_GAME || this.game_phase == this.GAME_PHASE_SELECT_HELD_CARDS || this.game_phase == this.GAME_PHASE_DOUBLE_DONE) {
            $("#control_draw").addClass("clickable");
        } else {
            $("#control_draw").removeClass("clickable");
        }

        if (this.game_phase == this.GAME_PHASE_SELECT_HELD_CARDS) {
            $(".card_holder").addClass("clickable");
        }
        else {
            $(".card_holder").removeClass("clickable");
        }

        if (this.game_phase == this.GAME_PHASE_PRE_GAME || this.game_phase == this.GAME_PHASE_DOUBLE_DONE) {
            $("#control_btc, #credits_holder").addClass("clickable");
            $("#control_betone").addClass("clickable");
            $("#control_betmax").addClass("clickable");
            $("#control_paytables").addClass("clickable");

            for (var i = 1; i <= 5; i++) {
                $("#payout_column" + i).addClass("clickable");
            }
        } else {
            $("#control_btc, #credits_holder").removeClass("clickable");
            $("#control_betone").removeClass("clickable");
            $("#control_betmax").removeClass("clickable");
            $("#control_paytables").removeClass("clickable");

            for (var i = 1; i <= 5; i++) {
                $("#payout_column" + i).removeClass("clickable");
            }
        }

        // DOUBLE GAME STUFF
        if (this.can_play_double_dealer()) {
            $("#control_double").addClass("clickable");
        }
        else {
            $("#control_double").removeClass("clickable");
        }

        if (this.game_phase == this.GAME_PHASE_DOUBLE_PICK_CARD) {
            // Don't make card_holder0 clickable since that's the dealer's card.
            $("#card_holder1").addClass("clickable");
            $("#card_holder2").addClass("clickable");
            $("#card_holder3").addClass("clickable");
            $("#card_holder4").addClass("clickable");
        }
    },

    handle_betone: function () {
        if (this.game_phase != this.GAME_PHASE_PRE_GAME && this.game_phase != this.GAME_PHASE_DOUBLE_DONE) {
            return;
        }
        sound_system.play_sound('boop');
        this.bet_size++;
        if (this.bet_size > this.MAX_BET_SIZE) {
            this.bet_size = 1;
        }
        this.update_bet_column();
    },

    handle_betmax: function () {
        if (this.game_phase != this.GAME_PHASE_PRE_GAME && this.game_phase != this.GAME_PHASE_DOUBLE_DONE) {
            return;
        }
        if (this.bet_size == this.MAX_BET_SIZE) {
            return;
        }
        sound_system.play_sound('boop');
        this.bet_size = this.MAX_BET_SIZE;
        this.update_bet_column();
    },

    handle_draw: function (e) {
        var that = this;

        if (e != undefined) e.preventDefault();

        //  - Check game phase
        if (this.game_phase == this.GAME_PHASE_PRE_GAME || this.game_phase == this.GAME_PHASE_DOUBLE_DONE) {
            // Only check during pre-game, since we should allow 'hold' to finish games
            //if(account_system.shutting_down_time != null && (account_system.shutting_down_time-((new Date()).getTime() / 1000)) < (30*60)) {
            if (account_system.should_show_shutting_down_dialog()) {
                account_system.show_shutting_down_dialog();
                return;
            }

            // New game
            if (this.next_server_seed_hash == null) {
                this.reseed(function () {
                    that.clear_cards(true);
                });
            } else {
                this.clear_cards(true);
            }
        }
        else if (this.game_phase == this.GAME_PHASE_SELECT_HELD_CARDS) {
            // Cards held, get extra cards
            this.hold_cards();
        }
    },

    handle_hold: function (id) {
        //  - Double game
        if (this.game_phase == this.GAME_PHASE_DOUBLE_PICK_CARD && id != 0) {
            this.play_double_pick(id);
            return;
        }

        if (this.game_phase != this.GAME_PHASE_SELECT_HELD_CARDS && this.game_phase != this.GAME_PHASE_DOUBLE_DONE) {
            return;
        }

        if (this.holds[id] == false) {
            $("#hold" + id).removeClass("ghost");
            $("#hold" + id).addClass("on");
            this.holds[id] = true;
        }
        else {
            $("#hold" + id).addClass("ghost");
            $("#hold" + id).removeClass("on");
            this.holds[id] = false;
        }
    },

    handle_double: function () {
        if (this.can_play_double_dealer()) {
            this.play_double_dealer();
            return false;
        }
    },

    handle_paytables: function () {
        if (this.game_phase != this.GAME_PHASE_PRE_GAME && this.game_phase != this.GAME_PHASE_DOUBLE_DONE) {
            return;
        }
        //  - Indicate which one you currently have selected 
        $("#paytables_dialog").lightbox_me({
            centered: true
        });
    },

    handle_auto: function () {
        if (autoplay_system.autoplay_phase != autoplay_system.AUTOPLAY_PHASE_STOPPED) {
            autoplay_system.autoplay_stop();
            return;
        }

        $("#autoplay_dialog").css('width', '500px');
        this.handle_autospeed_select();

		let autoplay_dialog = document.querySelector("#autoplay_dialog");
		let options = autoplay_dialog && isMobile.any() ? mobileLightboxOptions(autoplay_dialog) : {};
		$("#autoplay_dialog").lightbox_me({
			centered: true,
			...options
		});
    },

    handle_autospeed_select: function () {

//        $("#autoplay_mode_normal_speed option:selected").removeAttr("selected");

//        $($("#autoplay_mode_normal_speed option")[autoplay_system.autoplay_speed]).prop('selected', true);

        $("#autoplay_dialog .options_container").hide();
        $(".autoplay_mode_item.selected .options_container").show();
    },

    handle_autoplay_mode: function (div) {
        $("#autoplay_dialog .autoplay_mode_item").removeClass("selected");
        div.addClass("selected");
        this.handle_autospeed_select();
    },

    handle_autoplay_start: function () {
        var p = $("#autoplay_dialog .autoplay_mode_item.selected").attr('id');
        if (p == 'autoplay_mode_hold') {
            autoplay_system.autoplay_holdonly();
        } else if (p == 'autoplay_mode_normal') {
            autoplay_system.autoplay_start();
        }

        $("#autoplay_dialog").trigger("close");
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
                //  - Disable backspace mapping to back button, so that users in incognito aren't screwed and lose their account_key.
                return true;
            case 9: //tab
                this.handle_betone();
                return true;
            case 13: //enter
                this.handle_draw();
                return true;
            case 49: //1
            case 50: //2
            case 51: //3
            case 52: //4
            case 53: //5
                this.handle_hold(ev.keyCode - 49);
                return true;
            case 68: //d
                this.handle_double();
                return true;
        }
        return false;
    },

    can_play_double_dealer: function () {
        poker_game = poker_games[this.paytable];
        if (!poker_game.can_double_down(this.hand_eval)) {
            return false;
        }

        //  - We still need to check if prize > 0 even though we checked hand_eval, since losing double-down
        // will set your prize to 0, in which case you should not be able to play again.
        if (this.game_phase == this.GAME_PHASE_PRE_GAME) {
            if (this.prize > 0) {
                return true;
            }
        }
        else if (this.game_phase == this.GAME_PHASE_DOUBLE_DONE) {
            if (this.prize > 0 && this.double_level <= this.MAX_DOUBLE_LEVEL) {
                return true;
            }
        }
        return false;
    },

    play_double_dealer: function () {
        var that = this;

        if (this.next_double_down_server_seed_hash == null) {
            alert("ERROR: Double down is not available.");
            return;
        }

        //  - Update the game state, so that you can't push the DRAW button anymore
        this.game_phase = this.GAME_PHASE_DOUBLE_DEALER_AWAITING_RESULT;

        this.update_buttons();
        this.update_clickables();

        this.draw_win_amount(this.prize * 2, this.WIN_TEXT_DOUBLE);

        $(".hold").removeClass("on");
        for (var i = 0; i < this.NUM_CARDS; i++) {
            this.display_card(i, "back");
        }
        $("#hold0").addClass("double_dealer");

        // var double_client_seed = get_client_seed();
        var double_client_seed = $("#next_client_seed").val();
        $("#next_client_seed").prop('disabled', true);

        $.ajax({
            url: "/videopoker/double_dealer?game_id=" + this.game_id + "&client_seed=" + double_client_seed + "&level=" + this.double_level + "&server_seed_hash=" + this.next_double_down_server_seed_hash
        }).done(function (double_result) {
            that.game_phase = that.GAME_PHASE_DOUBLE_PICK_CARD

            that.update_buttons();
            that.update_clickables();
            // alert( double_result );
            if (double_result['error'] != null) {
                alert("Internal server error. Please try again later. (" + double_result['error'] + ")");
                return;
            }
            that.set_balance(double_result['intbalance'], true, double_result['fake_intbalance']);

            $("#hold1").addClass("ghost");
            $("#hold2").addClass("ghost");
            $("#hold3").addClass("ghost");
            $("#hold4").addClass("ghost");

            that.display_card(0, double_result['dealer_card'])
            //sound_system.play_sound( "show_card0" );
            sound_system.play_rotating("show_card");

            // Add the game info to the double_down_games for provably fair
            var double_down_game = {
                real_client_seed: double_client_seed,
                server_seed_hash: that.next_double_down_server_seed_hash,
                deal_hash: double_result['deal_hash'],
                dealer_card: double_result['dealer_card'],
                level: that.double_level,
                credit_btc_value: that.credit_btc_value,
                bet_size: that.bet_size,
                round_prize: that.prize, // The prize this double round is worth (0, prize, or prize*2)
                game_id: that.game_id,
                win: false
            };
            that.double_down_games.push(double_down_game);
        }).fail(function () {
            that.game_phase = that.GAME_PHASE_PRE_GAME;
            that.update_buttons();
            that.update_clickables();
            alert("Error connecting to server. Please check your internet connection, try again, or reload the page.");
        });

    },

    reveal_double_pick_result: function (double_down_game) {
        var that = this;
        var is_push = double_down_game.prize == double_down_game.round_prize;
        reveal_double_pick = function (i) {
            //sound_system.play_sound( "show_card" + i );
            sound_system.play_rotating("show_card");
            that.display_card(i, that.cards[i])
            if (i == 4) {
                that.draw_win_amount(that.prize, that.WIN_TEXT_WIN);
                if (that.prize > 0) {
                    that.double_level++;

                    if (!is_push) {
                        that.double_down_multiplier *= 2;
                    }

                    sound_system.play_sound("win_double_game");
                }
                else {
                    that.double_down_multiplier = 0;
                }

                //var payment_div = $("#mygames_row_" + top_mygames_id + " td.payment" );
                //leaderboard_system.draw_leaderboard_payment( payment_div, that.double_down_multiplier, that.btc_prize ); 

                that.game_phase = that.GAME_PHASE_DOUBLE_DONE;
                that.update_buttons();
                that.update_clickables();

                //  - Insta add your own game to leaderboard
                var timestamp = (new Date()).getTime();
                var lb = {
                    game: 'videopoker',
                    timestamp: timestamp / 1000,
                    player_ident: account_system.player_ident,
                    public_id: account_system.public_id,
                    gamedata: {
                        multiplier: that.double_down_multiplier,
                        paytable: that.paytable,
                        intgameearnings: (that.credit_btc_value * double_down_game['prize']) - Bitcoin.string_amount_to_int(that.btc_bet),
                        intbetamount: Bitcoin.string_amount_to_int(that.btc_bet),
                        intoriginalwinnings: Bitcoin.string_amount_to_int(that.btc_prize),
                        intwinnings: that.credit_btc_value * double_down_game['prize'],
                        progressive_win: 0,
                        unique_id: that.game_unique_id,
                        hand_eval: that.hand_eval
                    }
                };
                leaderboard_system.process_row("recent", lb, false, false);
                var new_row = leaderboard_system.process_row('mygames', lb, false, false);
                that.enable_verify_button(new_row);
            }
            if (i < 4) setTimeout(function () { reveal_double_pick(i + 1); }, that.CARD_DELAY);
        };

        window.setTimeout(function () { reveal_double_pick(1); }, this.CARD_DELAY);

    },

    play_double_pick: function (hold) {
        var that = this;
        this.game_phase = this.GAME_PHASE_DOUBLE_PICK_AWAITING_RESULT;
        this.update_buttons();
        this.update_clickables();

        $(".hold").removeClass("ghost");
        $("#hold" + hold).addClass("on");

        var double_down_game = this.double_down_games[that.double_level];

        $.ajax({
            url: "/videopoker/double_pick?game_id=" + that.game_id + "&level=" + that.double_level + "&hold=" + hold
        }).done(function (double_result) {
            if (double_result['error'] != null) {
                // TODO - better error messages?
                alert("Internal server error. Please try again later. (" + double_result['error'] + ")");
                return;
            }

            that.set_balance(double_result['intbalance'], true, double_result['fake_intbalance']);

            that.prize = double_result['prize']
            that.cards = double_result['cards']
            that.next_double_down_server_seed_hash = double_result['double_down_server_seed_hash'];

            //  - Either show the seed for the next double down game or the next main game (if you lost or won 8x)
            // We check for multiplier of 4 since it hasn't beed doubled yet from this win.
            //  - Calling set_next_server_seed_hash() breaks autoplay since it tries to use the double down hash for the next regular game.
            // Not playing autoplay still screws up, but it is able to recover by calling reseed().
            // So for now disable the next_server_seed display for double down, but enable the client seed text box at least.
            /*
            if (that.prize == 0 || that.double_down_multiplier == 4) { 
                that.set_next_server_seed_hash(that.verify_hold_result.server_seed_hash);
            }
            else {
                that.set_next_server_seed_hash(that.next_double_down_server_seed_hash);
            }
            */
            $("#next_client_seed").prop('disabled', false);


            double_down_game['deal_hash_source'] = double_result['deal_hash_source'];
            double_down_game['prize'] = double_result['prize'];
            double_down_game['game_seed'] = double_result['game_seed'];
            double_down_game['client_seed'] = double_result['client_seed'];
            double_down_game['cards'] = double_result['cards'];
            double_down_game['win'] = (double_result['prize'] > 0);
            double_down_game['hold'] = hold;
            double_down_game['prize'] = double_result['prize'];

            var result = that.check_double_games(false, [double_down_game]);
            if (result[0] != true) {
                that.show_server_lied_dialog(result[0], double_down_game, that.game_id);
            }

            that.reveal_double_pick_result(double_down_game);


        }).fail(function () {
            that.game_phase = that.GAME_PHASE_DOUBLE_PICK_CARD;
            that.update_buttons();
            that.update_clickables();
            $(".hold").removeClass("on");
            alert("Error connecting to server. Please check your internet connection, try again, or reload the page.");
        });

    },

    //  - Need to call this code again when the table is redrawn because a differnet paytable was selected
    set_payout_column_click_handlers: function () {
        var that = this;
        $(".payout_column").unbind('click');
        $(".payout_column").click(function () {
            if ($(this).hasClass("first") || (that.game_phase != that.GAME_PHASE_PRE_GAME && that.game_phase != that.GAME_PHASE_DOUBLE_DONE)) {
                return;
            }
            sound_system.play_sound('boop');
            id = $(this).attr('id')
            that.bet_size = id.charAt(id.length - 1);
            that.update_bet_column();
        });
    },

    init_handlers: function () {
        var that = this;

        $("#jackpot-switch").change(() => {
            if ($("#jackpot-switch").is(':checked')) {
                that.bet_size = 5
            } else {
                that.bet_size = 4
            }
            sound_system.play_sound('boop');
            that.update_bet_column()
        })

        $("#control_paytables").click(function () {
            that.handle_paytables();
            return false;
        });
        $(".paytable_select").click(function () {
            $('#paytables_dialog').trigger('close');
            var id = $(this).attr("id");
            that.paytable = id[id.length - 1];
            $("#control_paytables").removeClass();
            $("#control_paytables").addClass("paytable_game");
            $("#control_paytables").addClass("paytable_game" + that.paytable);
            $("#control_paytables").addClass("clickable");
            $("#control_help").hide();
            game_names = ["JACKS OR BETTER", "TENS OR BETTER", "BONUS POKER", "DOUBLE BONUS", "DBL DBL BONUS", "DEUCES WILD", "BONUS DELUXE"];
            $("#section-header-game").html(game_names[that.paytable])
            that.animate_paytable();
            return false;
        });

        $("#control_autoplay").click(function () {
            that.handle_auto();
        });

        $(".autoplay_mode_item").click(function () {
            that.handle_autoplay_mode($(this));
        });

        $("#autoplay_dialog .autoplay_start_image").click(function () {
            that.handle_autoplay_start();
        });

        var autoplay_speed_changed = function (option) {
            autoplay_system.autoplay_speed = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_normal_speed").change(function () { autoplay_speed_changed($(this)); });

        var autoplay_double_down_rate_changed = function (option) {
            that.autoplay_mode_normal_double_down_rate = parseInt($(option).children(":selected").val());
        };

        $("#autoplay_mode_normal_double_down_rate").change(function () { autoplay_double_down_rate_changed($(this)); });

        $("#control_betone").click(function () {
            that.handle_betone();
        });

        $("#control_betmax").click(function () {
            that.handle_betmax();
        });

        this.set_payout_column_click_handlers();

        $(".show_expected_return_link").on('click', function () {
            that.show_expected_return_dialog();
            return false;
        });
        $(".show_provably_fair_explain_link").click(function () {
            dialog_system.show_provably_fair_explain_dialog(that.game_name);
            return false;
        });
        $(".dialog .confirm_button").click(function () {
            $('.dialog').trigger('close');
        });
        $("#fixed_bet_size_button").click(function () {
            $('#fixed_bet_size_dialog').trigger('close');
        });

        $("#control_btc").click(function () {
            if (that.game_phase != that.GAME_PHASE_PRE_GAME && that.game_phase != that.GAME_PHASE_DOUBLE_DONE) {
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
            else if (id == "btc_item_05") {
                $("#control_btc").addClass("btc_token_05");
                that.credit_btc_value = 5000000; // "0.05" BTC
            }
            else {
                alert("Unknown BTC/credit value.");
                return false;
            }
            that.set_balance(account_system.btc_int_balance, that.game_phase == that.GAME_PHASE_PRE_GAME || that.game_phase == that.GAME_PHASE_SELECT_HELD_CARDS, account_system.fake_btc_int_balance);

            // Tell server!
            $.ajax({
                url: "account/set_credit_btc_value?credit_btc_value=" + that.credit_btc_value + "&game=videopoker"
            }).done(function (withdrawal_result) {
                // Do nothing
            });

            return false;
        });

        $("#control_draw").click(function (e) {
            that.handle_draw(e);
        });

        $(".card_holder").click(function () {
            var id = $(this).attr("id").charAt($(this).attr("id").length - 1);
            that.handle_hold(id);
        });

        $(document).keydown(function (ev) {
            if (!$("input").is(":focus") && that.handle_keypress(ev)) {
                ev.preventDefault();
            }
        });

        $("#control_double").click(function () {
            that.handle_double();
        });

        $(window).on('beforeunload', function () {
            if (that.game_phase == that.GAME_PHASE_AWAITING_DEAL ||
                that.game_phase == that.GAME_PHASE_DEALING_CARDS ||
                that.game_phase == that.GAME_PHASE_SELECT_HELD_CARDS ||
                that.game_phase == that.GAME_PHASE_AWAITING_HOLD ||
                that.game_phase == that.GAME_PHASE_DOUBLE_DEALER_AWAITING_RESULT ||
                that.game_phase == that.GAME_PHASE_DOUBLE_PICK_CARD ||
                that.game_phase == that.GAME_PHASE_DOUBLE_PICK_AWAITING_RESULT ||
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STARTED ||
                autoplay_system.autoplay_phase == autoplay_system.AUTOPLAY_PHASE_STOPPING) {
                return 'You are in the middle of a game.  If you leave, you will be forfeiting your bet.'
            }
        });

    },

    call_update_service: function () {

        var that = this;
        if (this.user_is_active) {
            var timestamp = (new Date()).getTime();
            $.ajax({
                url: "/videopoker/update?credit_btc_value=" + this.credit_btc_value + "&last=" + leaderboard_system.last_leaderboard_time + "&chatlast=" + chat_system.last_chatlog_index + "&_=" + timestamp
            }).done(function (update_result) {
                wowbar_system.handle_update(update_result);

                that.update_progressive_jackpot($('#payout_column5 div:first'), update_result.progressive_jackpot, update_result.total_jackpot);

                leaderboard_system.process_leaderboard_data(update_result.leaderboard, false);

                chat_system.process_chatlog(update_result.chatlog, false);
            });

        }

        window.setTimeout(function () {
            that.call_update_service();
        }, 2000);
    },

    draw_paytable: function () {
        var poker_game = poker_games[this.paytable];
        var num_hands = poker_game.hand_names.length;

        // Remember current value of jackpot so it doesn't sit at 4000 for a few seconds
        //jackpot = $('#payout_column5').children('div').first().html();
        jackpot = $('#payout_column5 div:first').html();

        s = ""
        s += "<div class='payout_column first'>";
        for (var i = 1; i < num_hands; i++) {
            s += "<div class='payout_item' id='payout_item" + (num_hands - i) + "'>";
            s += "<div class='name'>";
            s += poker_game.get_hand_eval_name_caps(num_hands - i);
            s += "</div>";
            s += "<div class='periods'>";
            s += poker_game.get_hand_eval_name_periods(num_hands - i);
            s += "</div>";
            s += "</div>";
        }
        s += "</div>";

        for (var bet = 0; bet < 5; bet++) {
            s += "<div id='payout_column" + (bet + 1) + "' class='payout_column clickable";
            if (bet == 4) {
                s += " last";
            }
            if (bet + 1 == this.bet_size) {
                s += " selected";
            }
            s += "'>";
            for (var val = 1; val < num_hands; val++) {
                s += "<div class='payout_item'>";
                s += poker_game.prizes[bet][num_hands - val];
                s += "</div>";
            }
            s += "</div>";
        }

        $("#payout").html(s);
        this.set_payout_column_click_handlers();

        $('#payout_column5 div:first').html(jackpot);
    },

    animate_paytable: function () {
        var that = this;

        // http://gsgd.co.uk/sandbox/jquery/easing/jquery.easing.1.3.js 
        jQuery.easing['jswing'] = jQuery.easing['swing'];
        jQuery.extend(jQuery.easing, {
            easeOutCubic: function (x, t, b, c, d) {
                return c * ((t = t / d - 1) * t * t + 1) + b;
            }
        });

        var fade_speed = 200;
        $("#payout").slideUp(fade_speed, 'easeOutCubic', function () {
            // Stay closed for a few ms
            window.setTimeout(function () {
                that.draw_paytable();

                $("#payout").slideDown(fade_speed, function () {
                    $("#control_help").show();
                    setTimeout(function () {
                        chat_system.adjust_height(true, function () {
                            chat_system.goto_bottom();
                        });
                    }, 0);
                });
            }, 200);

        });

    }

});

function init_videopoker(key, my_player_ident, my_public_id, prizes, starting_server_seed_hash, initial_leaderboards, initial_mygames, chatlog, credit_btc_value_in, sound_volume, unfinished_game ) {
    var sound_list = [ 
        ['boop', 'boop.wav', true, 1],
        ['show_card', 'carddeal.wav', false, 5],
        ['win_double_game', 'slot_machine_win_22.wav', false, 1],
        ['win_on_deal', 'slot_machine_bet_10.wav', false, 1],
        ['win1', 'win1.wav', false, 1],
        ['pay_coins', 'coinpay.wav', false, 1],
        ['deal_five', 'deal_five.wav', false, 1]
    ];
    common_init( 'Video Poker', key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, chatlog, sound_list, sound_volume );
    game_system = new VideoPokerSystem( prizes, starting_server_seed_hash, credit_btc_value_in, unfinished_game );
	
    dialog_system.init_help( ["/static/images/how_to_play.png", "/static/images/hands.png", "/static/images/help_doubledown.png", "/static/images/help_extras.png" ] );
    
    game_system.call_update_service();
}

