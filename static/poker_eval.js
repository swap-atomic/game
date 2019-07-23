
var Poker = Class.extend( {
    init: function(options) {
        this.name = "error";
        this.hand_names = [];
        this.hand_names_caps = [];
        this.prizes = [];
    },
    get_hand_prize_amount: function( bet_size, hand_eval ) {
        return this.prizes[bet_size-1][hand_eval];
    },
    get_hand_eval_name: function(hand_eval) {
        return this.hand_names[hand_eval];     
    },
    get_hand_eval_name_caps: function(hand_eval) {
        return this.hand_names_caps[hand_eval];     
    },
    get_hand_eval_name_periods: function(hand_eval) {
        return this.hand_names_periods[hand_eval];     
    },

    get_card_rank_number: function( card ) {
        var value = 0;
        if( card[0] == 'a' ) {
            value = 14;
        }
        else if( card[0] == 'k' ) {
            value = 13;
        }
        else if( card[0] == 'q' ) {
            value = 12;
        }
        else if( card[0] == 'j' ) {
            value = 11;
        }
        else if( card[0] == 't' ) {
            value = 10;
        }
        else {
            value = parseInt(card[0], 10);
        }
            
        return value;
    },

    assert_hand: function(hand, expected_eval, expected_prize) {
        e = this.evaluate_hand(hand);
        if( e != expected_eval ) {
            console.log( this.name + " eval " + hand + " is not " + expected_eval + ". Code returned " + e );
        }

        p = this.get_hand_prize_amount( 1, e );
        if( p != expected_prize ) {
            console.log( "prize " + hand + " is not " + expected_prize + ". Code returned " + p );
        }
    },

    get_four_of_a_kind_detail: function(hand, rank_count) {
        var fifth_card = null;
        var rank = null;
        var positions = [0,0,0,0,0];
        for( var r in rank_count ) {
            if( rank_count[r] == 4 ) {
                rank = r[0];
                for( var i = 0; i < hand.length; i++ ) {
                    if( hand[i][0] == rank ) {
                        positions[i] = 1;
                    } else {
                        fifth_card = hand[i];
                    }
                }
                break;
            }
        }
        return [rank, fifth_card, positions]
    },

    get_n_to_a_royal_flush_detail: function(hand, n, ranks, suit_count, suit_count_sorted) {
        var suit = null;
        var other_cards = [];
        var positions = [0,0,0,0,0];
        // If the last n items in ranks (since its sorted) are all >= 10 and are of the same suit
        if(suit_count_sorted[0] >= n && ranks.length > (5-n) && ranks[5-n] >= 10) {
            for( var s in suit_count ) {
                if( suit_count[s] >= n ) {
                    suit = s[0];
                    for( var i = 0; i < 5; i++ ) {
                        if( hand[i][1] == s[0] && (hand[i][0] == 't' || hand[i][0] == 'j' || hand[i][0] == 'q' || hand[i][0] == 'k' || hand[i][0] == 'a') ) {
                            positions[i] = 1;
                        } else {
                            other_cards.push(hand[i]);
                        }
                    }
                }
            }
        }
        if(other_cards.length == (5-n)) {
            return [suit, other_cards, positions];
        } else {
            return [null, [], []];
        }
    },

    get_full_house_detail: function(hand, rank_count, rank_count_sorted) {
        var rank1 = null; //3 of
        var rank2 = null; //2 of
        if( rank_count_sorted[0] == 3 && rank_count_sorted[1] == 2 ) {
            for( var r in rank_count ) {
                if( rank_count[r] == 3 ) {
                    rank1 = r;
                } else if( rank_count[r] == 2 ) {
                    rank2 = r;
                }
            }
        }
        return [rank1, rank2];
    },

    get_three_of_a_kind_detail: function(hand, rank_count, rank_count_sorted) {
        var rank = null;
        var other_cards = [];
        var positions = [0,0,0,0,0];
        if( rank_count_sorted[0] == 3 && rank_count_sorted[1] == 1 && (rank_count_sorted[2] == undefined || rank_count_sorted[2] == 1 ) ) {
            for( var r in rank_count ) {
                if( rank_count[r] == 3 ) {
                    rank = r;
                    for( var i = 0; i < 5; i++ ) {
                        if( hand[i][0] == r[0] ) {
                            positions[i] = 1;
                        } else {
                            other_cards.push(hand[i]);
                        }
                    }
                }
            }
        }
        return [rank, other_cards, positions];
    },

    get_n_to_a_straight_flush_detail: function(hand, n, suit_count, card_to_hand_index, exclude_twos) {
        var that = this;
        exclude_twos = exclude_twos || false;
        for( var s in suit_count ) {
            if( suit_count[s] >= n ) {
                // rip out cards of this suit
                var subset = [];
                for( var i = 0; i < hand.length; i++ ) {
                    if(hand[i][1] == s[0] && (!exclude_twos || this.get_card_rank_number(hand[i]) != 2)) {
                        subset.push(hand[i]);
                    }
                }

                // sort the hand by rank
                var sorted_subset = subset.slice(0);
                sorted_subset.sort( function(a,b) { return that.get_card_rank_number(a)-that.get_card_rank_number(b); } );

                // if there's an ace at the end, put it at the beginning too
                // this will allow us to find straights that start or end with an ace
                if( sorted_subset[sorted_subset.length-1][0] == 'a' ) {
                    sorted_subset.unshift(sorted_subset[sorted_subset.length-1]);
                }

                // build the rank array
                var rarr = [];
                for( var i = 0; i < sorted_subset.length; i++ ) {
                    var v = this.get_card_rank_number(sorted_subset[i]);
                    if( v == 14 && i == 0 ) v = 1;
                    rarr.push(v);
                }

                // we've got a set of N to a flush, now look for N to a straight
                for( var c = 0; c < (subset.length - n + 1); c++ ) {
                    if( ( rarr[c+n-1] - rarr[c] ) < 5 ) {
                        var cards = [];
                        var other_cards = [];
                        var positions = [0,0,0,0,0];

                        // now we have N cards all within 5 of eachother and all with the same suit.. we're golden!
                        for( var i = c; i < n; i++ ) {
                            positions[card_to_hand_index[sorted_subset[i]]] = 1;
                            cards.push(sorted_subset[i]);
                        }

                        for( var i = 0; i < hand.length; i++ ) {
                            if( positions[i] == 0 ) {
                                other_cards.push(hand[i]);
                            }
                        }

                        return [s, cards, other_cards, positions];
                    }
                }
            }
        }
        return [null, [], [], [0,0,0,0,0]];
    },

    get_n_to_an_outside_straight_detail: function(hand, n, rank_count_sorted, card_to_hand_index) {
        var that = this;

        if( rank_count_sorted[0] <= 2 && rank_count_sorted[1] == 1 ) { //at least 4 cards must be of different ranks, this check guarantees that
            // sort hand according to rank
            var sorted_hand = hand.slice(0);
            sorted_hand.sort( function(a,b) { return that.get_card_rank_number(a)-that.get_card_rank_number(b); } );

            // NOTE! A-2-3-4 is NOT an outside straight draw
            // // if there's an ace at the end, put it at the beginning too
            // // this will allow us to find straights that start or end with an ace
            // if( sorted_hand[sorted_hand.length-1][0] == 'a' ) {
            //     sorted_hand.unshift(sorted_hand[sorted_hand.length-1]);
            // }

            for( var c = 0; c < (sorted_hand.length-n+1); c++ ) {
                // if the next n cards are all sequentially in rank order, then we're good to go
                var good = true;
                for( var i = c; i < (c+n-1); i++ ) {
                    var v = this.get_card_rank_number(sorted_hand[i]);
                    //if( i == 0 && v == 14 ) v = 1;
                    if( v + 1 != this.get_card_rank_number(sorted_hand[i+1]) ) {
                        good = false;
                        break;
                    }
                }

                if(good) {
                    // the last card cannot be an ace, that's not an outside straight draw
                    if( this.get_card_rank_number(sorted_hand[c+n-1]) == 14 ) {
                        good = false;
                    }
                }

                if(good) {
                    var cards = [];
                    var other_cards = hand.slice(0);
                    var position = [0,0,0,0,0];
                    for( var i = c; i < c+n; i++ ) {
                        cards.push(sorted_hand[i]);
                        position[card_to_hand_index[sorted_hand[i]]] = 1;
                        other_cards.splice(other_cards.indexOf(sorted_hand[i]), 1);
                    }
                    return [cards, other_cards, position];
                }
            }
        }
        return [null, [], [0,0,0,0,0]];
    },

    get_n_to_a_straight_detail: function(hand, n, rank_count_sorted, card_to_hand_index, exclude_twos) {
        var that = this;
        exclude_twos = exclude_twos || false;

        var newhand = [];
        for( var i = 0; i < hand.length; i++ ) {
            if( !exclude_twos || ( this.get_card_rank_number(hand[i]) != 2 ) ) {
                newhand.push(hand[i]);
            }
        }

        // sort hand according to rank
        var sorted_hand = newhand.slice(0);
        sorted_hand.sort( function(a,b) { return that.get_card_rank_number(a)-that.get_card_rank_number(b); } );

        // if there's an ace at the end, put it at the beginning too
        // this will allow us to find straights that start or end with an ace
        if( sorted_hand[sorted_hand.length-1][0] == 'a' ) {
            sorted_hand.unshift(sorted_hand[sorted_hand.length-1]);
        }

        for( var c = 0; c < (sorted_hand.length-n+1); c++ ) {
            // build a hand spanning N cards, removing pairs/triples/etc 

            var lastv = this.get_card_rank_number(sorted_hand[c]);
            if( c == 0 && lastv == 14 ) lastv = 1;

            var testhand = [];
            testhand.push(sorted_hand[c]);

            for( var i = 1; testhand.length < n && (c+i) < sorted_hand.length; i++ ) {
                var v = this.get_card_rank_number(sorted_hand[c+i]);
                if( v == lastv ) continue;
                testhand.push(sorted_hand[c+i]);
                lastv = v;
            }

            if( testhand.length == n ) {
                // if the next n cards span less than a distance of 5, then we're good to go
                var distance = 4; //one less, since we only check 4 cards
                var lastv = this.get_card_rank_number(testhand[0]);
                if( lastv == 14 ) lastv = 1;
                for( var i = 1; i < n; i++ ) {
                    var v = this.get_card_rank_number(testhand[i]);
                    var dx = v - lastv;
                    distance -= dx;
                    if( distance < 0 ) {
                        break;
                    }
                    lastv = v;
                }

                if( distance >= 0 ) { //got through N cards with less than 5 
                    var cards = [];
                    var other_cards = newhand.slice(0);
                    var position = [0,0,0,0,0];
                    for( var i = 0; i < n; i++ ) {
                        cards.push(testhand[i]);
                        position[card_to_hand_index[testhand[i]]] = 1;
                        other_cards.splice(other_cards.indexOf(testhand[i]), 1);
                    }
                    return [cards, other_cards, position];
                }
            }
        }
        return [null, [], [0,0,0,0,0]];
    },


    get_pair_details: function(hand, rank_count) {
        var pairs = [];
        var all_positions = [0,0,0,0,0];
        for( var r in rank_count ) {
            if( rank_count[r] == 2 ) {
                var curpair = [];
                var positions = [0,0,0,0,0];
                for( var i = 0; i < hand.length; i++ ) {
                    if( hand[i][0] == r ) {
                        curpair.push(hand[i]);
                        positions[i] = 1;
                        all_positions[i] = 1;
                    }
                }
                pairs.push([r, curpair, positions]);
            }
        }

        //sort pairs based on rank
        var that = this;
        pairs.sort( function(a,b) { return that.get_card_rank_number(a[0])-that.get_card_rank_number(b[0]); } );

        return [pairs.length, pairs, all_positions];
    },

    get_n_to_a_flush_detail: function(hand, n, suit_count, exclude_twos) {
        var suit = null;
        var other_cards = [];
        var positions = [0,0,0,0,0];
        exclude_twos = exclude_twos || false;
        for( var s in suit_count ) {
            if( suit_count[s] >= n ) {
                suit = s[0];
                for( var i = 0; i < hand.length; i++ ) {
                    if( hand[i][1] == suit && (!exclude_twos || this.get_card_rank_number(hand[i]) != 2) ) {
                        positions[i] = 1;
                    } else {
                        other_cards.push(hand[i]);
                    }
                }
                break;
            }
        }
        return [suit, other_cards, positions]
    },

    get_high_cards_detail: function(hand) {
        var cards = [];
        var position = [0,0,0,0,0];
        var bysuit = {'s': [[], [0,0,0,0,0]], 'c': [[], [0,0,0,0,0]], 'h': [[], [0,0,0,0,0]], 'd': [[], [0,0,0,0,0]]};
        for( var i = 0; i < hand.length; i++ ) {
            if( this.get_card_rank_number(hand[i]) >= this.get_card_rank_number(this.high_card_cutoff) ) {
                position[i] = 1;
                cards.push(hand[i]);
                bysuit[hand[i][1]][0].push(hand[i]);
                bysuit[hand[i][1]][1][i] = 1;
            }
        }
        return [cards, bysuit, position];
    },


});

var PokerNoJoker = Poker.extend( {
    init: function(options) {
        this._super(options);
        this.HAND_NOTHING = 0;
        // JacksOrBetter or TensOrBetter depending on game played
        this.HAND_WINNING_PAIR = 1;
        this.HAND_TWO_PAIR = 2;
        this.HAND_THREE_OF_A_KIND = 3;
        this.HAND_STRAIGHT = 4;
        this.HAND_FLUSH = 5;
        this.HAND_FULL_HOUSE = 6;
        this.HAND_FOUR_OF_A_KIND = 7;
        this.HAND_STRAIGHT_FLUSH = 8;
        this.HAND_ROYAL_FLUSH = 9;
        this.winning_pairs = [];
        this.high_card_cutoff = 't';
        this.RARE_HAND = this.HAND_FOUR_OF_A_KIND;
    },
    get_rank_info: function(hand) {
        var rank_count = {};
        var ranks = [];
        var suit_count = {};
        var card_to_hand_index = {};
        for( var ci = 0; ci < hand.length; ci++ ) {
            var card = hand[ci];

            card_to_hand_index[card] = ci;

            if(card[0] in rank_count) {
                rank_count[card[0]] = rank_count[card[0]] + 1;
            } else {
                rank_count[card[0]] = 1;
            }

            if(card[1] in suit_count) {
                suit_count[card[1]] = suit_count[card[1]] + 1
            } else {
                suit_count[card[1]] = 1;
            }

            ranks.push( this.get_card_rank_number(card) );
        }

        //  - Need to parseInt the values because javascript is treating the values as strings,
        // even though ranks only contains integers...
        ranks.sort( function(a,b){ return parseInt(a)-parseInt(b); })

        // sort reversed
        var rank_count_sorted = new Array();
        for( var r in rank_count ) {
            rank_count_sorted.push(rank_count[r]);
        }
        rank_count_sorted.sort( function(a,b){ return parseInt(b)-parseInt(a); })

        // sort reversed
        var suit_count_sorted = new Array();
        for( var r in suit_count ) {
            suit_count_sorted.push(suit_count[r]);
        }
        suit_count_sorted.sort( function(a,b){ return parseInt(b)-parseInt(a); })
        
        return [ranks, rank_count, rank_count_sorted, suit_count, suit_count_sorted, card_to_hand_index];
    },
    is_progressive_jackpot_winner: function(hand_eval) {
        return hand_eval == this.HAND_ROYAL_FLUSH
    },
    can_double_down: function(hand_eval) {
        return hand_eval > this.HAND_NOTHING && hand_eval <= this.HAND_FOUR_OF_A_KIND
    },

    get_num_high: function(hand) {
        var num_high = 0;
        for( var i = 0; i < hand.length; i++ ) {
            var value = this.get_card_rank_number(hand[i]);
            if( value >= this.get_card_rank_number(this.high_card_cutoff) ) { //a 'high' card is one that satisfies the pair clause
                num_high += 1;
            } 
        }
        return num_high;
    },

    get_num_low: function(hand) {
        return hand.length - this.get_num_high(hand);
    },

    get_four_of_a_kind: function(rank_count) {
        return this.HAND_FOUR_OF_A_KIND
    },

    get_is_flush: function(hand) {
        var is_flush = true;
        for( var i = 0; i < hand.length - 1; i++ ) {
            if(hand[i][1] != hand[i+1][1]) {
                is_flush = false
                break;
            }
        }
        return is_flush;
    },

    get_is_straight: function(ranks, rank_count_sorted) {
        var is_straight = false;
        if(rank_count_sorted[0] == 1) {
            if( ranks[4] - ranks[0] == 4 ) {
                is_straight = true;
            }
            if( ranks[4] == 14 && ranks[3] == 5 ) {
                // Special A2345 case
                is_straight = true;
            }
        }
        return is_straight;
    },

    is_joker_game: function() {
        return false;
    },
    is_hand_eval_worth_fireworks: function( hand_eval ) {
        return hand_eval >= this.HAND_FLUSH;
    },
    evaluate_hand: function( hand ) {
    
        // kh, 4s
        // card = rank + suit
        var result = this.get_rank_info(hand);
        var ranks = result[0];
        var rank_count = result[1];
        var rank_count_sorted = result[2];

        var is_flush = this.get_is_flush(hand);
        var is_straight = this.get_is_straight(ranks, rank_count_sorted);

        if( is_flush && is_straight ) {
            if( ranks[4] == 14 && ranks[3] == 13 ) {
                return this.HAND_ROYAL_FLUSH;
            }
            return this.HAND_STRAIGHT_FLUSH;
        }

        if( rank_count_sorted[0] == 4 ) {
            return this.get_four_of_a_kind(rank_count);
        }

        if( rank_count_sorted[0] == 3 && rank_count_sorted[1] == 2 ) {
            return this.HAND_FULL_HOUSE;
        } 

        if( is_flush ) {
            return this.HAND_FLUSH;
        }

        if( is_straight ) {
            return this.HAND_STRAIGHT;
        }

        if( rank_count_sorted[0] == 3 && rank_count_sorted[1] == 1 && rank_count_sorted[2] == 1 ) {
            return this.HAND_THREE_OF_A_KIND;
        }
        if( rank_count_sorted[0] == 2 && rank_count_sorted[1] == 2 && rank_count_sorted[2] == 1 ) {
            return this.HAND_TWO_PAIR;
        } 
            
        if( rank_count_sorted[0] == 2 && rank_count_sorted[1] == 1 && rank_count_sorted[2] == 1 && rank_count_sorted[3] == 1 ) {
            for( var i = 0; i < this.winning_pairs.length; i++ ) {
                var r = this.winning_pairs[i];
                if( r in rank_count && rank_count[r] == 2 ) {
                    return this.HAND_WINNING_PAIR;
                }
            }
        }

        return this.HAND_NOTHING;
    },

    recommend_hold: function(hand) {
        var that = this;
        var to_hold = [0,0,0,0,0];
        var all_hold = [1,1,1,1,1];
        var no_hold = [0,0,0,0,0];

        var result = this.get_rank_info(hand);
        var ranks = result[0];
        var rank_count = result[1];
        var rank_count_sorted = result[2];
        var suit_count = result[3];
        var suit_count_sorted = result[4];
        var card_to_hand_index = result[5];

        var is_flush = this.get_is_flush(hand);
        var is_straight = this.get_is_straight(ranks, rank_count_sorted);

        // 1. capture royal flush
        if( is_flush && is_straight ) return all_hold;

        // 2. capture four of a kind
        var fok_detail = this.get_four_of_a_kind_detail(hand, rank_count);
        if( fok_detail[0] != null ) return fok_detail[2];

        // 4 to a royal flush (use >= to capture would-be flushes)
        // If the last 4 items in ranks (since its sorted) are all >= 10
        var rf_detail = this.get_n_to_a_royal_flush_detail(hand, 4, ranks, suit_count, suit_count_sorted);
        if(rf_detail[0] != null) return rf_detail[2];

        // Full House
        var fh_detail = this.get_full_house_detail(hand, rank_count, rank_count_sorted);
        if( fh_detail[0] != null ) return all_hold;

        // Straight
        if( is_straight ) return all_hold;

        // Flush
        if( is_flush ) return all_hold;

        // Three of a kind
        var tok_detail = this.get_three_of_a_kind_detail(hand, rank_count, rank_count_sorted);
        if(tok_detail[0] != null) return tok_detail[2];

        // 4 to a straight flush
        var ftosf = this.get_n_to_a_straight_flush_detail(hand, 4, suit_count, card_to_hand_index);
        if(ftosf[0] != null) return ftosf[3];

        // 2 pair
        var pair_details = this.get_pair_details(hand, rank_count);
        if(pair_details[0] == 2) return pair_details[2];

        // high pair (jacks or better)
        if(pair_details[0] == 1 && this.get_card_rank_number(pair_details[1][0][0]) >= this.get_card_rank_number(this.high_card_cutoff)) return pair_details[1][0][2];

        // 3 to a royal flush
        var rf_detail = this.get_n_to_a_royal_flush_detail(hand, 3, ranks, suit_count, suit_count_sorted);
        if(rf_detail[0] != null) return rf_detail[2];

        // 4 to a flush
        var ftof = this.get_n_to_a_flush_detail(hand, 4, suit_count);
        if(ftof[0] != null) return ftof[2];

        // low pair
        if( pair_details[0] == 1 ) return pair_details[1][0][2];

        // 4 to an outside straight
        var ftoos = this.get_n_to_an_outside_straight_detail(hand, 4, rank_count_sorted, card_to_hand_index);
        if(ftoos[0] != null) return ftoos[2];

        // 2 suited high cards
        var hc_detail = this.get_high_cards_detail(hand);
        for( var s in hc_detail[1] ) {
            if( hc_detail[1][s][0].length >= 2 ) {
                return hc_detail[1][s][1];
            }
        }

        // 3 to a straight flush
        var thtosf = this.get_n_to_a_straight_flush_detail(hand, 3, suit_count, card_to_hand_index);
        if( thtosf[0] != null ) return thtosf[3];

        // 2 unsuited highcards (if more than 2, pick the lowest 2)
        if( hc_detail[0].length >= 2 ) {
            var sorted_cards = hc_detail[0].slice(0);
            sorted_cards.sort( function(a,b) { return that.get_card_rank_number(a)-that.get_card_rank_number(b); } );

            var to_hold = [0,0,0,0,0];
            for( var i = 0; i < 2; i++ ) {
                to_hold[card_to_hand_index[sorted_cards[i]]] = 1;
            }

            return to_hold;
        }

        // suited 10/j, 10/q, or 10/k
        // TODO - not sure how this one ties into high_card_cutoff or why 10 is special to pair with only jqk but not a?
        if( suit_count_sorted[0] >= 2 ) {
            for( var s in suit_count ) {
                if( suit_count[s] >= 2 ) {
                    var tc = null;
                    var oc = null;

                    for( var i = 0; i < 5; i++ ) {
                        if( hand[i][1] == s[0] ) {
                            if( hand[i][0] == 't' && tc == null ) tc = hand[i];
                            if( ('jqk').indexOf(hand[i][0]) != -1 && oc == null ) oc = hand[i];
                        }
                    }

                    if( tc != null && oc != null ) {
                        to_hold[card_to_hand_index[tc]] = 1;
                        to_hold[card_to_hand_index[oc]] = 1;
                        return to_hold;
                    }
                }
            }
        }

        // one high card
        if( hc_detail[0].length == 1 ) return hc_detail[2];

        // discard everything
        return no_hold;
    },
});

var PokerJacksOrBetter = PokerNoJoker.extend( {
    init: function(options) {
        this._super(options);
        this.name = "Jacks or Better";
        this.hand_names = [ "Nothing", "One Pair", "Two Pair", "3 of a Kind", "Straight", "Flush", "Full House", "4 of a Kind", "Straight Flush", "Royal Flush" ];
        this.hand_names_caps = [ "NOTHING", "JACKS OR BETTER", "TWO PAIR", "3 OF A KIND", "STRAIGHT", "FLUSH", "FULL HOUSE", "4 OF A KIND", "STRAIGHT FLUSH", "ROYAL FLUSH" ];
        this.hand_names_periods = [ "", "", "...............", "............", "...............", ".....................", "..........", "............", "..", "........" ];
        this.winning_pairs = ['j', 'q', 'k', 'a'];
        this.high_card_cutoff = 'j';
    },
});

var PokerTensOrBetter = PokerNoJoker.extend( {
    init: function(options) {
        this._super(options);
        this.name = "Tens or Better";
        this.hand_names = [ "Nothing", "One Pair", "Two Pair", "3 of a Kind", "Straight", "Flush", "Full House", "4 of a Kind", "Straight Flush", "Royal Flush" ];
        this.hand_names_caps = [ "NOTHING", "TENS OR BETTER", "TWO PAIR", "3 OF A KIND", "STRAIGHT", "FLUSH", "FULL HOUSE", "4 OF A KIND", "STRAIGHT FLUSH", "ROYAL FLUSH" ];
        this.hand_names_periods = [ "", "..", "...............", "............", "...............", ".....................", "..........", "............", "..", "........" ];
        this.winning_pairs = ['t', 'j', 'q', 'k', 'a'];
        this.high_card_cutoff = 't';
    }
});
var PokerBonusDeluxe = PokerJacksOrBetter.extend( {
    init: function(options) {
        this._super(options);
        this.name = "Bonus Deluxe";
    },
    can_double_down: function(hand_eval) {
        return hand_eval > this.HAND_NOTHING && hand_eval <= this.HAND_FULL_HOUSE;
    }
});
var PokerBonus = PokerJacksOrBetter.extend( {
    init: function(options) {
        this._super(options);
        this.name = "Bonus";
        this.hand_names = [ "Nothing", "One Pair", "Two Pair", "3 of a Kind", "Straight", "Flush", "Full House", "4 5-K", "4 2-4", "4 Aces", "Straight Flush", "Royal Flush" ];
        this.hand_names_caps = [ "NOTHING", "JACKS OR BETTER", "TWO PAIR", "3 OF A KIND", "STRAIGHT", "FLUSH", "FULL HOUSE", "4 5-K", "4 2-4", "4 ACES", "STRAIGHT FLUSH", "ROYAL FLUSH" ];
        this.hand_names_periods = [ "", "", "...............", "............", "...............", ".....................", "..........", "........................", "........................", "....................", "..", "........" ];
        this.HAND_NOTHING = 0;
        this.HAND_WINNING_PAIR = 1;
        this.HAND_TWO_PAIR = 2;
        this.HAND_THREE_OF_A_KIND = 3;
        this.HAND_STRAIGHT = 4;
        this.HAND_FLUSH = 5;
        this.HAND_FULL_HOUSE = 6;
        this.HAND_FOUR_OF_A_KIND_5_TO_K = 7;
        this.HAND_FOUR_OF_A_KIND_2_TO_4 = 8;
        this.HAND_FOUR_OF_A_KIND_ACES = 9;
        this.HAND_STRAIGHT_FLUSH = 10;
        this.HAND_ROYAL_FLUSH = 11;
        this.RARE_HAND = this.HAND_FOUR_OF_A_KIND_5_TO_K;
    },
    can_double_down: function(hand_eval) {
        return hand_eval > this.HAND_NOTHING && hand_eval <= this.HAND_FULL_HOUSE
    },
    get_four_of_a_kind: function(rank_count) {
        if( rank_count['a'] == 4 ) {
            return this.HAND_FOUR_OF_A_KIND_ACES;
        }
        else if( rank_count['2'] == 4 || rank_count['3'] == 4 || rank_count['4'] == 4 ) {
            return this.HAND_FOUR_OF_A_KIND_2_TO_4;
        }

        return this.HAND_FOUR_OF_A_KIND_5_TO_K;
    },
    get_four_of_a_kind_detail: function(hand, rank_count) {
        var fifth_card = null;
        var fifth_card_index;
        var rank = null;
        var positions = [0,0,0,0,0];
        for( var r in rank_count ) {
            if( rank_count[r] == 4 ) {
                rank = r[0];
                for( var i = 0; i < hand.length; i++ ) {
                    if( hand[i][0] == rank ) {
                        positions[i] = 1;
                    } else {
                        fifth_card = hand[i];
                        fifth_card_index = i;
                    }
                }
                var v = this.get_card_rank_number(fifth_card);
                if( v >= 2 && v <= 4 ) { // hold A-4 but throw away 5-K
                    positions[fifth_card_index] = 1;
                }
            }
        }
        return [rank, fifth_card, positions]
    }

});

var PokerDoubleBonus = PokerBonus.extend( {
    init: function(options) {
        this._super(options);
        this.name = "Double Bonus";
    }
});
var PokerDoubleDoubleBonus = PokerJacksOrBetter.extend( {
    init: function(options) {
        this._super(options);
        this.name = "Dbl Dbl Bonus";
        this.hand_names = [ "Nothing", "One Pair", "Two Pair", "3 of a Kind", "Straight", "Flush", "Full House", "4 5-K", "4 2-4", "4 Aces", "4 2-4 w/ A-4", "4 Aces w/ 2-4", "Straight Flush", "Royal Flush" ];
        this.hand_names_caps = [ "NOTHING", "JACKS OR BETTER", "TWO PAIR", "3 OF A KIND", "STRAIGHT", "FLUSH", "FULL HOUSE", "4 5-K", "4 2-4", "4 ACES", "4 2-4 W/ A-4", "4 Aces W/ 2-4", "STRAIGHT FLUSH", "ROYAL FLUSH" ];
        this.hand_names_periods = [ "", "", "...............", "............", "...............", ".....................", "..........", "........................", "........................", "....................", ".............", "..........", "..", "........" ];
        this.HAND_NOTHING = 0;
        this.HAND_WINNING_PAIR = 1;
        this.HAND_TWO_PAIR = 2;
        this.HAND_THREE_OF_A_KIND = 3;
        this.HAND_STRAIGHT = 4;
        this.HAND_FLUSH = 5;
        this.HAND_FULL_HOUSE = 6;
        this.HAND_FOUR_OF_A_KIND_5_TO_K = 7;
        this.HAND_FOUR_OF_A_KIND_2_TO_4 = 8;
        this.HAND_FOUR_OF_A_KIND_ACES = 9;
        this.HAND_FOUR_OF_A_KIND_2_TO_4_WITH_A_TO_4 = 10;
        this.HAND_FOUR_OF_A_KIND_ACES_WITH_2_TO_4 = 11;
        this.HAND_STRAIGHT_FLUSH = 12;
        this.HAND_ROYAL_FLUSH = 13;
        this.RARE_HAND = this.HAND_FOUR_OF_A_KIND_ACES;
    },
    can_double_down: function(hand_eval) {
        return hand_eval > this.HAND_NOTHING && hand_eval <= this.HAND_FULL_HOUSE
    }, 
    get_four_of_a_kind: function(rank_count) {
        if( rank_count['a'] == 4 ) {
            if( rank_count['2'] == 1 || rank_count['3'] == 1 || rank_count['4'] == 1 ) {
                return this.HAND_FOUR_OF_A_KIND_ACES_WITH_2_TO_4;
            }
            return this.HAND_FOUR_OF_A_KIND_ACES;
        }
        else if( rank_count['2'] == 4 || rank_count['3'] == 4 || rank_count['4'] == 4 ) {
            if( rank_count['a'] == 1 || rank_count['2'] == 1 || rank_count['3'] == 1 || rank_count['4'] == 1 ) {
                return this.HAND_FOUR_OF_A_KIND_2_TO_4_WITH_A_TO_4;
            }
            return this.HAND_FOUR_OF_A_KIND_2_TO_4;
        }

        return this.HAND_FOUR_OF_A_KIND_5_TO_K;
    },

    get_four_of_a_kind_detail: function(hand, rank_count) {
        var fifth_card = null;
        var fifth_card_index;
        var rank = null;
        var positions = [0,0,0,0,0];
        for( var r in rank_count ) {
            if( rank_count[r] == 4 ) {
                rank = r[0];
                for( var i = 0; i < hand.length; i++ ) {
                    if( hand[i][0] == rank ) {
                        positions[i] = 1;
                    } else {
                        fifth_card = hand[i];
                        fifth_card_index = i;
                    }
                }
                var v = this.get_card_rank_number(fifth_card);
                var r = this.get_card_rank_number(rank);
                if( r == 14 ) { //four aces
                    if( v >= 2 && v <= 4 ) { // hold 2-4 but throw away 5-K (fifth card will never be an ace..)
                        positions[fifth_card_index] = 1;
                    }
                } else if ( r >= 2 && r <= 4 ) { // four 2s, 3s, or 4s
                    if( v == 14 || ( v >= 2 && v <= 4 ) ) { // fifth card is A-4
                        positions[fifth_card_index] = 1;
                    }
                } else { 
                    //same as four aces
                    if( v >= 2 && v <= 4 ) { // hold 2-4 but throw away 5-K (fifth card will never be an ace..)
                        positions[fifth_card_index] = 1;
                    }
                }
            }
        }
        return [rank, fifth_card, positions]
    }

});
var PokerDeucesWild = Poker.extend( {
    init: function(options) {
        this._super(options);
        this.name = "Deuces Wild";
        this.hand_names = [ "Nothing", "3 of a Kind", "Straight", "Flush", "Full House", "4 of a Kind", "Straight Flush", "5 of a Kind", "Wild R Flush", "4 Deuces", "Natural R Flush" ];
        this.hand_names_caps = [ "NOTHING", "3 OF A KIND", "STRAIGHT", "FLUSH", "FULL HOUSE", "4 OF A KIND", "STRAIGHT FLUSH", "5 OF A KIND", "WILD R FLUSH", "4 DEUCES", "NATURAL R FLUSH" ];
        this.hand_names_periods = [ "", ".............", "................", "......................", "...........", ".............", "...", ".............", "........", "................", "." ];
        this.HAND_NOTHING = 0;
        this.HAND_THREE_OF_A_KIND = 1;
        this.HAND_STRAIGHT = 2;
        this.HAND_FLUSH = 3;
        this.HAND_FULL_HOUSE = 4;
        this.HAND_FOUR_OF_A_KIND = 5;
        this.HAND_STRAIGHT_FLUSH = 6;
        this.HAND_FIVE_OF_A_KIND = 7;
        this.HAND_WILD_ROYAL_FLUSH = 8;
        this.HAND_FOUR_DEUCES = 9;
        this.HAND_NATURAL_ROYAL_FLUSH = 10;
        this.high_card_cutoff = 't';
        this.RARE_HAND = this.HAND_FIVE_OF_A_KIND;
    },
    is_progressive_jackpot_winner: function(hand_eval) {
        return hand_eval == this.HAND_NATURAL_ROYAL_FLUSH;
    },
    can_double_down: function(hand_eval) {
        return hand_eval > this.HAND_NOTHING && hand_eval <= this.HAND_WILD_ROYAL_FLUSH;
    },
    get_rank_info: function(hand) {
        var rank_count = {};
        var ranks = [];
        var suit_count = {};
        var card_to_hand_index = {};
        var jokers = 0;
        for( var ci = 0; ci < hand.length; ci++ ) {
            var card = hand[ci];

            card_to_hand_index[card] = ci;
            
            value = this.get_card_rank_number(card);
            if( value == 2 ) {
                jokers += 1;
                continue;
            }

            if(card[0] in rank_count) {
                rank_count[card[0]] = rank_count[card[0]] + 1;
            } else {
                rank_count[card[0]] = 1;
            }

            if(card[1] in suit_count) {
                suit_count[card[1]] = suit_count[card[1]] + 1
            } else {
                suit_count[card[1]] = 1;
            }

            ranks.push( value );
        }

        //  - Need to parseInt the values because javascript is treating the values as strings,
        // even though ranks only contains integers...
        ranks.sort( function(a,b){ return parseInt(a)-parseInt(b); })

        // sort reversed
        var rank_count_sorted = new Array();
        for( var r in rank_count ) {
            rank_count_sorted.push(rank_count[r]);
        }
        rank_count_sorted.sort( function(a,b){ return parseInt(b)-parseInt(a); })

        // sort reversed
        var suit_count_sorted = new Array();
        for( var r in suit_count ) {
            suit_count_sorted.push(suit_count[r]);
        }
        suit_count_sorted.sort( function(a,b){ return parseInt(b)-parseInt(a); })
 
        return [ranks, rank_count, rank_count_sorted, suit_count, suit_count_sorted, card_to_hand_index, jokers];
    },

    get_is_flush: function(hand) {
        var is_flush = true;
        var required_suit = null;
        for( i = 0; i < hand.length; i++ ) {
            // Skip jokers, effectively making them fill in the suit they should be
            if( this.get_card_rank_number( hand[i][0] ) == 2 ) {
                continue;
            }

            if( required_suit == null ) {
                required_suit = hand[i][1];
                continue;
            }

            if( hand[i][1] != required_suit ) {
                is_flush = false;
                break;
            }
        }
        return is_flush
    },

    get_is_straight: function(ranks, rank_count_sorted, jokers) {
        var is_straight = false;
        var required_rank = null;
        var required_jokers = 0;
        var i = 0;
        
        //console.log("Ranks: " + ranks);
        //console.log("jokers: " + jokers);
        if( rank_count_sorted[0] == 1 ) {
            while( i < ranks.length ) {

                if( required_rank == null ) {
                    if( ranks[ranks.length-1] == 14 && ranks[ranks.length-2] <= 5 ) {
                        // Convert ace into a 1 and insert in front of list
                        required_rank = 2;
                        // weird that [1]+ranks.slice was causing the list to get all fucked up.
                        // Using unshift seems to have fixed it
                        ranks = ranks.slice(0, ranks.length-1);
                        ranks.unshift(1)
                        //console.log("Fixed ranks: " + ranks);
                    }
                    else {
                        required_rank = ranks[0] + 1;
                    }
                    i += 1;
                    continue
                }

                //console.log("Check: " + required_rank + "==" + ranks[i] );
                if( ranks[i] != required_rank ) {
                    required_jokers += 1;
                }
                else {
                    i += 1;
                }

                required_rank += 1;
            }

            //console.log("required_jokers: " + required_jokers);
            if( jokers >= required_jokers ) {
                is_straight = true;
            }
                
        }

        var ending_high_card = ranks[ranks.length-1] + jokers - required_jokers;
        //console.log("ending_high: " + ending_high_card);
        if( ending_high_card > 14 ) {
            ending_high_card = 14;
        }
        return [is_straight, ending_high_card];
    },

    is_joker_game: function() {
        return true;
    },
    is_hand_eval_worth_fireworks: function( hand_eval ) {
        return hand_eval >= this.HAND_STRAIGHT_FLUSH;
    },
    evaluate_hand: function( hand ) {
        var result = this.get_rank_info(hand);
        var ranks = result[0];
        var rank_count = result[1];
        var rank_count_sorted = result[2];
        var jokers = result[6];
        
        var is_flush = this.get_is_flush(hand);
        var result = this.get_is_straight(ranks, rank_count_sorted, jokers);
        var is_straight = result[0];
        var ending_high_card = result[1];

        if( is_flush && is_straight ) {
            if( ending_high_card == 14 ) {
                if( jokers == 0 ) {
                    return this.HAND_NATURAL_ROYAL_FLUSH;
                }
            }
        }

        if( jokers == 4 ) {
            return this.HAND_FOUR_DEUCES;
        }

        if( is_flush && is_straight ) {
            if( ending_high_card == 14 ) {
                return this.HAND_WILD_ROYAL_FLUSH;
            }
        }

        if( rank_count_sorted[0] + jokers == 5 ) {
            return this.HAND_FIVE_OF_A_KIND;
        }

        if( is_flush && is_straight ) {
            return this.HAND_STRAIGHT_FLUSH;
        }

        if( rank_count_sorted[0] + jokers == 4 ) {
            return this.HAND_FOUR_OF_A_KIND;
        }

        var required_jokers = 3 - rank_count_sorted[0] + 2 - rank_count_sorted[1];
        if( jokers >= required_jokers ) {
            return this.HAND_FULL_HOUSE
        }

        if( is_flush ) {
            return this.HAND_FLUSH;
        }

        if( is_straight ) {
            return this.HAND_STRAIGHT;
        }

        if( rank_count_sorted[0] + jokers == 3 && rank_count_sorted[1] == 1 && rank_count_sorted[2] == 1 ) {
            return this.HAND_THREE_OF_A_KIND;
        }

        return this.HAND_NOTHING;
    },

    recommend_hold: function(hand) {
        var that = this;
        var to_hold = [0,0,0,0,0];
        var all_hold = [1,1,1,1,1];
        var no_hold = [0,0,0,0,0];

        var result = this.get_rank_info(hand);
        var ranks = result[0];
        var rank_count = result[1];
        var rank_count_sorted = result[2];
        var suit_count = result[3];
        var suit_count_sorted = result[4];
        var card_to_hand_index = result[5];
        var jokers = result[6];

        // 1. four deuces
        var fok_detail = this.get_four_of_a_kind_detail(hand, rank_count);
        if( fok_detail[0] != null && this.get_card_rank_number(fok_detail[0]) == 2 ) return fok_detail[2];
        
        var is_flush = this.get_is_flush(hand);
        var is_straight = this.get_is_straight(ranks, rank_count_sorted, 0)[0];

        var hc_detail = this.get_high_cards_detail(hand);
        if( jokers == 3 ) {
            //three of the cards are 2s so if the other two are suited high cards, then we have a royal flush and hold all cards
            for( var s in suit_count ) {
                if( hc_detail[1][s][0].length == 2 ) return all_hold;
            }
            
            //TODO five of a kind (2 + 3 jokers) ?
            //TODO flush (other two cards are the same suit)
            //TODO straight (other two cards are within 5 ranks)

            //otherwise, just hold the 2s
            for( var i = 0; i < hand.length; i++ ) {
                if( this.get_card_rank_number(hand[i]) == 2 ) {
                    to_hold[i] = 1;
                }
            }
            return to_hold;
        } 
        
        var pair_details = this.get_pair_details(hand, rank_count);
        if( jokers == 2 ) {
            //if we have three suited high cards then we have a RF
            for( var s in suit_count ) {
                if( hc_detail[1][s][0].length == 3 ) return all_hold;
            }

            // if we have three of the same rank, then we have five of a kind
            var thok_detail = this.get_three_of_a_kind_detail(hand, rank_count, rank_count_sorted);
            if( thok_detail[0] != null ) return all_hold; 

            //if we have any pairs other than the 2s hold the four of a kind
            if( pair_details[0] > 1 ) {
                for( var i = 0; i < pair_details[0]; i++ ) {
                    if( this.get_card_rank_number(pair_details[1][i][0]) != 2 ) {
                        // hold the jokers
                        for( var j = 0; j < hand.length; j++ ) {
                            if( this.get_card_rank_number(hand[j]) == 2 ) {
                                pair_details[1][i][2][j] = 1;
                            }
                        }
                        return pair_details[1][i][2];
                    }
                }
            }
            
            //if we have two suited high cards plus 2 jokers, then we're 4 to a RF
            for( var s in suit_count ) {
                if( hc_detail[1][s][0].length == 2 ) {
                    // hold the jokers
                    for( var j = 0; j < hand.length; j++ ) {
                        if( this.get_card_rank_number(hand[j]) == 2 ) {
                            hc_detail[1][s][1][j] = 1;
                        }
                    }
                    return hc_detail[1][s][1];
                }
            }

            //flush (2s are not counted in the suits)
            var ftof_detail = this.get_n_to_a_flush_detail(hand, 3, suit_count);
            if( ftof_detail[0] != null ) return all_hold;

            //TODO - 4 to a straight flush with 2 consecutive singletons,6-7 or higher

            //hold the jokers
            for( var i = 0; i < hand.length; i++ ) {
                if( this.get_card_rank_number(hand[i]) == 2 ) {
                    to_hold[i] = 1;
                }
            }
            return to_hold;
        } 

        if( jokers == 1 ) {
            // if we have three of the same rank, then we have four of a kind
            var thok_detail = this.get_three_of_a_kind_detail(hand, rank_count, rank_count_sorted);
            if( thok_detail[0] != null ) {
                for( var i = 0; i < hand.length; i++ ) {
                    if( this.get_card_rank_number(hand[i]) == 2 ) {
                        //only 1 joker, return the 3 of a kind + joker
                        thok_detail[2][i] = 1;
                        return thok_detail[2];
                    }
                }
            }

            //rf
            var rf_detail = this.get_n_to_a_royal_flush_detail(hand, 4, ranks, suit_count, suit_count_sorted);
            if(rf_detail[0] != null) return all_hold;

            //4 to a royal flush (3+joker)
            var rf_detail = this.get_n_to_a_royal_flush_detail(hand, 3, ranks, suit_count, suit_count_sorted);
            if(rf_detail[0] != null) {
                for( var i = 0; i < hand.length; i++ ) {
                    if( this.get_card_rank_number(hand[i]) == 2 ) {
                        rf_detail[2][i] = 1;
                        return rf_detail[2];
                    }
                }
            }

            //Full house -- only way we can have full house is if there are two other pairs (which can't be 2s, otherwise we'd have more than 1 joker)
            if( pair_details[0] == 2 ) return all_hold;

            //TODO - 4 to a straight flush with 3 consecutive singletons,5-7 or higher

            //3 of a kind
            if( pair_details[0] == 1 ) {
                for( var i = 0; i < hand.length; i++ ) {
                    if( this.get_card_rank_number(hand[i]) == 2 ) {
                        pair_details[1][0][2][i] = 1;
                        return pair_details[1][0][2];
                    }
                }
            }

            //straight (straight flushes will be caught here, regardless)
            var ftos_detail = this.get_n_to_a_straight_detail(hand, 4, rank_count_sorted, card_to_hand_index, true);
            if( ftos_detail[0] != null ) return all_hold;

            //flush (2s are not counted in the suits)
            var ftof_detail = this.get_n_to_a_flush_detail(hand, 4, suit_count);
            if( ftof_detail[0] != null ) return all_hold;

            //3 to a royal flush
            //if we have two suited high cards plus 1 joker, then we're 3 to a RF
            for( var s in suit_count ) {
                if( hc_detail[1][s][0].length == 2 ) {
                    // hold the joker
                    for( var j = 0; j < hand.length; j++ ) {
                        if( this.get_card_rank_number(hand[j]) == 2 ) {
                            hc_detail[1][s][1][j] = 1;
                            return hc_detail[1][s][1];
                        }
                    }
                }
            }

            //TODO - 3 to a straight flush with 2 consecutive singletons,6-7 or higher

            //joker + 1 high card
            if( hc_detail[0].length >= 1 ) {
                //take the highest of the high cards
                var high_rank = 0;
                var last_i = null;
                var res = [0,0,0,0,0];
                for( var i = 0; i < hand.length; i++ ) {
                    if( this.get_card_rank_number(hand[i]) == 2 ) {
                        //hc_detail[2][i] = 1;
                        //return hc_detail[2];
                        res[i] = 1;
                    } else if( this.get_card_rank_number(hand[i]) > high_rank ) {
                        if(last_i != null) res[last_i] = 0;
                        res[i] = 1;
                        last_i = i;
                        high_rank = this.get_card_rank_number(hand[i]);
                    }
                }
                return res;
            }

            //deuce only
            for( var i = 0; i < hand.length; i++ ) {
                if( this.get_card_rank_number(hand[i]) == 2 ) {
                    to_hold[i] = i;
                    return to_hold;
                }
            }
        } 
        
        /* no jokers */ {
            if( is_flush && is_straight ) return all_hold; //captures royal flush

            // 4 to a royal flush (use >= to capture would-be flushes)
            // If the last 4 items in ranks (since its sorted) are all >= 10
            var rf_detail = this.get_n_to_a_royal_flush_detail(hand, 4, ranks, suit_count, suit_count_sorted);
            if(rf_detail[0] != null) return rf_detail[2];

            // anything between three of a kind and four of a kind
            {
                // Four of a kind
                if( fok_detail[0] != null ) return fok_detail[2];

                // Full House
                var fh_detail = this.get_full_house_detail(hand, rank_count, rank_count_sorted);
                if( fh_detail[0] != null ) return all_hold;

                // flush and straight
                if( is_flush || is_straight ) return all_hold;

                // Three of a kind
                var tok_detail = this.get_three_of_a_kind_detail(hand, rank_count, rank_count_sorted);
                if(tok_detail[0] != null) return tok_detail[2];
            }

            // 4 to a straight flush
            var ftosf = this.get_n_to_a_straight_flush_detail(hand, 4, suit_count, card_to_hand_index);
            if(ftosf[0] != null) return ftosf[3];

            // 3 to a royal flush
            var rf_detail = this.get_n_to_a_royal_flush_detail(hand, 3, ranks, suit_count, suit_count_sorted);
            if(rf_detail[0] != null) return rf_detail[2];

            // 4 to a flush
            var ftof = this.get_n_to_a_flush_detail(hand, 4, suit_count);
            if(ftof[0] != null) return ftof[2];

            // 4 to an outside straight
            var ftoos = this.get_n_to_an_outside_straight_detail(hand, 4, rank_count_sorted, card_to_hand_index);
            if(ftoos[0] != null) return ftoos[2];

            // 3 to a straight flush
            var thtosf = this.get_n_to_a_straight_flush_detail(hand, 3, suit_count, card_to_hand_index);
            if( thtosf[0] != null ) return thtosf[3];

            // 4 to any straight
            var ftois = this.get_n_to_a_straight_detail(hand, 4, rank_count_sorted, card_to_hand_index, true);
            if( ftois[0] != null ) return ftois[2];

            // a pair, any pair
            if( pair_details[0] >= 1 ) return pair_details[1][0][2];

            // 3 to an outside straight
            var ftoos = this.get_n_to_an_outside_straight_detail(hand, 3, rank_count_sorted, card_to_hand_index);
            if(ftoos[0] != null) return ftoos[2];

            // 2 to a royal flush, JQ high
            for( var s in hc_detail[1] ) {
                var hc = hc_detail[1][s];
                if( hc[0].length == 2 ) {
                    if( ( this.get_card_rank_number(hc[0][0]) == 11 && this.get_card_rank_number(hc[0][1]) == 12 ) ||
                        ( this.get_card_rank_number(hc[0][1]) == 11 && this.get_card_rank_number(hc[0][0]) == 12 ) ) {
                        return hc[1];
                    }
                }
            }

            // 2 suited high cards
            for( var s in hc_detail[1] ) {
                if( hc_detail[1][s][0].length >= 2 ) {
                    return hc_detail[1][s][1];
                }
            }

            // 3 to any straight
            var ftois = this.get_n_to_a_straight_detail(hand, 3, rank_count_sorted, card_to_hand_index, true);
            if( ftois[0] != null ) return ftois[2];
        }

        // discard everything
        return no_hold;
    },
});


/*
var HAND_ROYAL_FLUSH = 9;
var HAND_STRAIGHT_FLUSH = 8;
var HAND_FOUR_OF_A_KIND = 7;
var HAND_FULL_HOUSE = 6;
var HAND_FLUSH = 5;
var HAND_STRAIGHT = 4;
var HAND_THREE_OF_A_KIND = 3;
var HAND_TWO_PAIR = 2;
var HAND_JACKS_OR_BETTER = 1;
var HAND_NOTHING = 0;

var evaluate_hand = function( hand ) {

    // kh, 4s
    // card = rank + suit
    var rank_count = {};
    var ranks = [];
    for( var ci = 0; ci < hand.length; ci++ ) {
        var card = hand[ci];

        if(card[0] in rank_count) {
            rank_count[card[0]] = rank_count[card[0]] + 1
        } else {
            rank_count[card[0]] = 1;
        }

        var value = 0;
        if( card[0] == 'a' ) {
            value = 14;
        } else if( card[0] == 'k' ) {
            value = 13;
        } else if( card[0] == 'q' ) {
            value = 12;
        } else if( card[0] == 'j' ) {
            value = 11;
        } else if( card[0] == 't' ) {
            value = 10;
        } else {
            value = parseInt(card[0], 10);
        }

        ranks.push( value );
    }

    var is_flush = true;
    for( var i = 0; i < hand.length - 1; i++ ) {
        if(hand[i][1] != hand[i+1][1]) {
            is_flush = false
            break;
        }
    }

    //  - Need to parseInt the values because javascript is treating the values as strings,
    // even though ranks only contains integers...
    ranks.sort( function(a,b){ return parseInt(a)-parseInt(b); })

    // sort reversed
    var rank_count_sorted = new Array();
    for( var r in rank_count ) {
        rank_count_sorted.push(rank_count[r]);
    }
    rank_count_sorted.sort( function(a,b){ return parseInt(b)-parseInt(a); })
    
    var is_straight = false;
    if(rank_count_sorted[0] == 1) {
        if( ranks[4] - ranks[0] == 4 ) {
            is_straight = true;
        }
        if( ranks[4] == 14 && ranks[3] == 5 ) {
            // Special A2345 case
            is_straight = true;
        }
    }

    if( is_flush && is_straight ) {
        if( ranks[4] == 14 ) {
            return HAND_ROYAL_FLUSH;
        }
        return HAND_STRAIGHT_FLUSH;
    }

    if( rank_count_sorted[0] == 4 )
        return HAND_FOUR_OF_A_KIND;

    if( rank_count_sorted[0] == 3 && rank_count_sorted[1] == 2 )
        return HAND_FULL_HOUSE;

    if( is_flush )
        return HAND_FLUSH;

    if( is_straight )
        return HAND_STRAIGHT;

    if( rank_count_sorted[0] == 3 && rank_count_sorted[1] == 1 && rank_count_sorted[2] == 1 )
        return HAND_THREE_OF_A_KIND;
    if( rank_count_sorted[0] == 2 && rank_count_sorted[1] == 2 && rank_count_sorted[2] == 1 )
        return HAND_TWO_PAIR;
    if( rank_count_sorted[0] == 2 && rank_count_sorted[1] == 1 && rank_count_sorted[2] == 1 && rank_count_sorted[3] == 1 ) {
        if( ('j' in rank_count && rank_count['j'] == 2 ) || ('q' in rank_count && rank_count['q'] == 2) || ('k' in rank_count && rank_count['k'] == 2) || ('a' in rank_count && rank_count['a'] == 2) )
            return HAND_JACKS_OR_BETTER;
    }

    return HAND_NOTHING;
}

function get_card_rank_number( card ) {
    var value = 0;
    if     ( card[0] == 'a' ) value = 14;
    else if( card[0] == 'k' ) value = 13;
    else if( card[0] == 'q' ) value = 12;
    else if( card[0] == 'j' ) value = 11;
    else if( card[0] == 't' ) value = 10;
    else                      value = parseInt(card[0]);
    return value;
}


// PASS
//alert( evaluate_hand( ['3s','js','jc','5c','4c'] )  );
//alert( evaluate_hand( ['jh','jd','8s','7s','6h'] )  );
//alert( evaluate_hand( ['tc','9d','8d','7d','6h'] )  );
//alert( evaluate_hand( ['tc','9c','8c','7c','6c'] )  );
//alert( evaluate_hand( ['3c','9c','8c','7c','6c'] )  );
//alert( evaluate_hand( ['tc','9d','td','td','9h'] )  );
//alert( evaluate_hand( ['tc','td','ts','7d','th'] )  );
//alert( evaluate_hand( ['tc','qc','jc','ac','kc'] )  );
*/

function run_poker_js_unit_tests( poker_games ) {
    //  - Because the prizes come form the server, we need to call this after init_videopoker is called...
    console.log("Starting poker_eval.js unit tests!");
    
    var deuces = poker_games[5];
    deuces.assert_hand( ['kc', 'ac', 'qc', 'jc', 'tc'], deuces.HAND_NATURAL_ROYAL_FLUSH, 250 )
    deuces.assert_hand( ['ks', 'as', 'qs', 'js', 'ts'], deuces.HAND_NATURAL_ROYAL_FLUSH, 250 )
    
    deuces.assert_hand( ['2c', '2s', '9c', '2h', '2d'], deuces.HAND_FOUR_DEUCES, 200 )
    deuces.assert_hand( ['2c', '2d', 'qc', '2h', '2s'], deuces.HAND_FOUR_DEUCES, 200 )
    deuces.assert_hand( ['2c', '2d', '2s', '2h', 'qd'], deuces.HAND_FOUR_DEUCES, 200 )
    deuces.assert_hand( ['2c', '2d', '2s', '2h', 'ad'], deuces.HAND_FOUR_DEUCES, 200 )
    
    deuces.assert_hand( ['kc', '2d', 'qc', 'jc', 'tc'], deuces.HAND_WILD_ROYAL_FLUSH, 25 )
    deuces.assert_hand( ['kc', '2d', 'qc', '2h', 'tc'], deuces.HAND_WILD_ROYAL_FLUSH, 25 )
    deuces.assert_hand( ['2c', '2d', 'qc', '2h', 'tc'], deuces.HAND_WILD_ROYAL_FLUSH, 25 )
    deuces.assert_hand( ['2c', '2d', 'as', '2h', 'qs'], deuces.HAND_WILD_ROYAL_FLUSH, 25 )
    deuces.assert_hand( ['2c', '2d', 'as', '2h', 'ks'], deuces.HAND_WILD_ROYAL_FLUSH, 25 )
    deuces.assert_hand( ['2c', '2d', 'as', '2h', 'ts'], deuces.HAND_WILD_ROYAL_FLUSH, 25 )
    deuces.assert_hand( ['2c', '2d', 'js', '2h', 'ts'], deuces.HAND_WILD_ROYAL_FLUSH, 25 )
    
    deuces.assert_hand( ['5c', '5s', '2s', '5h', '5d'], deuces.HAND_FIVE_OF_A_KIND, 15 )
    deuces.assert_hand( ['qc', 'qs', '2s', '2h', 'qd'], deuces.HAND_FIVE_OF_A_KIND, 15 )
    deuces.assert_hand( ['qc', 'qs', '2s', '2h', 'qd'], deuces.HAND_FIVE_OF_A_KIND, 15 )
    deuces.assert_hand( ['2c', 'qs', '2s', '2h', 'qd'], deuces.HAND_FIVE_OF_A_KIND, 15 )
    
    deuces.assert_hand( ['7c', '2s', '9c', '2h', '2d'], deuces.HAND_STRAIGHT_FLUSH, 10 )
    deuces.assert_hand( ['7c', '8c', '9c', 'jc', '2d'], deuces.HAND_STRAIGHT_FLUSH, 10 )
    deuces.assert_hand( ['7c', '8c', '9c', 'tc', '2d'], deuces.HAND_STRAIGHT_FLUSH, 10 )
    deuces.assert_hand( ['2d', '8c', '9c', 'tc', '7c'], deuces.HAND_STRAIGHT_FLUSH, 10 )
    deuces.assert_hand( ['as', '2s', '3s', '4s', '5s'], deuces.HAND_STRAIGHT_FLUSH, 10 )
    deuces.assert_hand( ['2s', '5s', '3s', 'as', '4s'], deuces.HAND_STRAIGHT_FLUSH, 10 )
    
    deuces.assert_hand( ['7c', '2s', '9d', '2h', '2d'], deuces.HAND_FOUR_OF_A_KIND, 4 )
    deuces.assert_hand( ['7c', '8s', '2c', '2h', '2d'], deuces.HAND_FOUR_OF_A_KIND, 4 )
    deuces.assert_hand( ['2c', '2d', 'as', '2h', 'kh'], deuces.HAND_FOUR_OF_A_KIND, 4 )
    deuces.assert_hand( ['5c', '5s', 'as', '5h', '5d'], deuces.HAND_FOUR_OF_A_KIND, 4 )
    deuces.assert_hand( ['2c', '2d', '3c', '3h', '5s'], deuces.HAND_FOUR_OF_A_KIND, 4 )
    deuces.assert_hand( ['8c', '8d', '2c', 'qh', '2s'], deuces.HAND_FOUR_OF_A_KIND, 4 )
    
    deuces.assert_hand( ['5c', '5d', '3c', '3h', '5s'], deuces.HAND_FULL_HOUSE, 4 )
    deuces.assert_hand( ['5c', '2d', '3c', '3h', '5s'], deuces.HAND_FULL_HOUSE, 4 )
    deuces.assert_hand( ['8c', '8d', '2c', 'qh', 'qs'], deuces.HAND_FULL_HOUSE, 4 )
    
    deuces.assert_hand( ['5c', '6c', 'tc', 'jc', 'qc'], deuces.HAND_FLUSH, 3 )
    deuces.assert_hand( ['5c', '6c', '2d', 'jc', 'qc'], deuces.HAND_FLUSH, 3 )
    deuces.assert_hand( ['5c', '2h', '2d', 'jc', 'qc'], deuces.HAND_FLUSH, 3 )
    
    deuces.assert_hand( ['5c', '6s', '7c', '8c', '9c'], deuces.HAND_STRAIGHT, 2 )
    deuces.assert_hand( ['5c', '6s', '2c', '8c', '9c'], deuces.HAND_STRAIGHT, 2 )
    deuces.assert_hand( ['5c', '6s', '2c', '8c', '2h'], deuces.HAND_STRAIGHT, 2 )
    deuces.assert_hand( ['5c', '4s', 'as', '2h', '3d'], deuces.HAND_STRAIGHT, 2 )
    deuces.assert_hand( ['7c', '4s', '5s', '3h', '6d'], deuces.HAND_STRAIGHT, 2 )
    deuces.assert_hand( ['9c', '8s', '2s', '5h', '6d'], deuces.HAND_STRAIGHT, 2 )
    deuces.assert_hand( ['7c', '8s', '2c', '5h', '6d'], deuces.HAND_STRAIGHT, 2 )
    deuces.assert_hand( ['7c', '2s', '9c', '2h', 'jd'], deuces.HAND_STRAIGHT, 2 )
    deuces.assert_hand( ['ac', '2s', '3c', '4h', '2d'], deuces.HAND_STRAIGHT, 2 )
    deuces.assert_hand( ['7c', '8s', '9c', '2h', '2d'], deuces.HAND_STRAIGHT, 2 )
    deuces.assert_hand( ['ks', 'ah', 'qs', 'js', 'ts'], deuces.HAND_STRAIGHT, 2 )
    deuces.assert_hand( ['ks', 'ah', '2s', 'js', 'ts'], deuces.HAND_STRAIGHT, 2 )
    
    deuces.assert_hand( ['7c', '2s', '9c', '2h', 'qd'], deuces.HAND_THREE_OF_A_KIND, 1 )
    deuces.assert_hand( ['7c', '2s', '9c', '2h', 'qd'], deuces.HAND_THREE_OF_A_KIND, 1 )
    deuces.assert_hand( ['7c', '7s', '9c', '2h', 'qd'], deuces.HAND_THREE_OF_A_KIND, 1 ) 
    deuces.assert_hand( ['7c', '7s', '9c', '7h', 'qd'], deuces.HAND_THREE_OF_A_KIND, 1 ) 
    
    deuces.assert_hand( ['7c', '8s', 'tc', '5h', '6d'], deuces.HAND_NOTHING, 0 )
    deuces.assert_hand( ['7c', '8s', '9c', '4h', '2d'], deuces.HAND_NOTHING, 0 )
    deuces.assert_hand( ['7c', '8s', '9c', 'th', '5d'], deuces.HAND_NOTHING, 0 )
    deuces.assert_hand( ['7c', '8s', '9c', 'th', 'qd'], deuces.HAND_NOTHING, 0 )
    deuces.assert_hand( ['7c', '2s', '9c', 'th', 'qd'], deuces.HAND_NOTHING, 0 )
    deuces.assert_hand( ['5c', '3h', '2d', 'jc', 'qc'], deuces.HAND_NOTHING, 0 )
    
    var bonus = poker_games[2];
    bonus.assert_hand( ['5c', '5s', 'as', '5h', '5d'], bonus.HAND_FOUR_OF_A_KIND_5_TO_K, 25 );
    bonus.assert_hand( ['qc', 'ks', 'kc', 'kh', 'kd'], bonus.HAND_FOUR_OF_A_KIND_5_TO_K, 25 );
    bonus.assert_hand( ['4c', '4s', 'as', '4h', '4d'], bonus.HAND_FOUR_OF_A_KIND_2_TO_4, 40 );
    bonus.assert_hand( ['2c', '2s', 'as', '2h', '2d'], bonus.HAND_FOUR_OF_A_KIND_2_TO_4, 40 );
    bonus.assert_hand( ['ac', 'as', 'qs', 'ah', 'ad'], bonus.HAND_FOUR_OF_A_KIND_ACES, 80 );
    
    var double_bonus = poker_games[3];
    double_bonus.assert_hand( ['5c', '5s', 'as', '5h', '5d'], double_bonus.HAND_FOUR_OF_A_KIND_5_TO_K, 50 )
    double_bonus.assert_hand( ['qc', 'ks', 'kc', 'kh', 'kd'], double_bonus.HAND_FOUR_OF_A_KIND_5_TO_K, 50 )
    double_bonus.assert_hand( ['4c', '4s', 'as', '4h', '4d'], double_bonus.HAND_FOUR_OF_A_KIND_2_TO_4, 80 )
    double_bonus.assert_hand( ['2c', '2s', 'as', '2h', '2d'], double_bonus.HAND_FOUR_OF_A_KIND_2_TO_4, 80 )
    double_bonus.assert_hand( ['ac', 'as', 'qs', 'ah', 'ad'], double_bonus.HAND_FOUR_OF_A_KIND_ACES, 160 )
    double_bonus.assert_hand( ['ac', 'as', '3s', '4h', '5d'], double_bonus.HAND_WINNING_PAIR, 1 )
    double_bonus.assert_hand( ['ac', 'as', '3s', '3h', '5d'], double_bonus.HAND_TWO_PAIR, 1 )
    double_bonus.assert_hand( ['ac', 'as', 'ah', '4h', '5d'], double_bonus.HAND_THREE_OF_A_KIND, 3 )
    
    var double_double_bonus = poker_games[4];
    double_double_bonus.assert_hand( ['5c', '5s', 'as', '5h', '5d'], double_double_bonus.HAND_FOUR_OF_A_KIND_5_TO_K, 50 )
    double_double_bonus.assert_hand( ['qc', 'ks', 'kc', 'kh', 'kd'], double_double_bonus.HAND_FOUR_OF_A_KIND_5_TO_K, 50 )
    double_double_bonus.assert_hand( ['4c', '4s', '5s', '4h', '4d'], double_double_bonus.HAND_FOUR_OF_A_KIND_2_TO_4, 80 )
    double_double_bonus.assert_hand( ['2c', '2s', '8s', '2h', '2d'], double_double_bonus.HAND_FOUR_OF_A_KIND_2_TO_4, 80 )
    double_double_bonus.assert_hand( ['ac', 'as', 'qs', 'ah', 'ad'], double_double_bonus.HAND_FOUR_OF_A_KIND_ACES, 160 )
    double_double_bonus.assert_hand( ['4c', '4s', 'as', '4h', '4d'], double_double_bonus.HAND_FOUR_OF_A_KIND_2_TO_4_WITH_A_TO_4, 160 )
    double_double_bonus.assert_hand( ['2c', '2s', '4s', '2h', '2d'], double_double_bonus.HAND_FOUR_OF_A_KIND_2_TO_4_WITH_A_TO_4, 160 )
    double_double_bonus.assert_hand( ['ac', 'as', '2s', 'ah', 'ad'], double_double_bonus.HAND_FOUR_OF_A_KIND_ACES_WITH_2_TO_4, 400 )
    double_double_bonus.assert_hand( ['ac', 'as', '4s', 'ah', 'ad'], double_double_bonus.HAND_FOUR_OF_A_KIND_ACES_WITH_2_TO_4, 400 )
    
    var tens_or_better = poker_games[1];
    tens_or_better.assert_hand( ['kc', '9s', 'ks', 'as', 'ts'], tens_or_better.HAND_WINNING_PAIR, 1 );
    tens_or_better.assert_hand( ['tc', '9s', 'ks', 'as', 'ts'], tens_or_better.HAND_WINNING_PAIR, 1 );
    tens_or_better.assert_hand( ['8c', '9s', 'ts', 'as', '8s'], tens_or_better.HAND_NOTHING, 0 );
    
    var jacks_or_better = poker_games[0];
    jacks_or_better.assert_hand( ['kh', 'ks', 'kc', '4c', 'kd'], jacks_or_better.HAND_FOUR_OF_A_KIND, 25 ) 
    
    jacks_or_better.assert_hand( ['kh', 'ks', 'kc', '4c', '4d'], jacks_or_better.HAND_FULL_HOUSE, 9 )
    jacks_or_better.assert_hand( ['4s', '9c', '4h', '4c', '4d'], jacks_or_better.HAND_FOUR_OF_A_KIND, 25 )
    jacks_or_better.assert_hand( ['4s', '5s', '6s', '7s', '8s'], jacks_or_better.HAND_STRAIGHT_FLUSH, 50 )
    jacks_or_better.assert_hand( ['as', '2s', '3s', '4s', '5s'], jacks_or_better.HAND_STRAIGHT_FLUSH, 50 )
    jacks_or_better.assert_hand( ['2s', '5s', '3s', 'as', '4s'], jacks_or_better.HAND_STRAIGHT_FLUSH, 50 )
    jacks_or_better.assert_hand( ['4s', '9s', 'ks', 'as', 'ts'], jacks_or_better.HAND_FLUSH, 6 )
    jacks_or_better.assert_hand( ['kc', '9s', 'ks', 'as', 'ts'], jacks_or_better.HAND_WINNING_PAIR, 1 )
    jacks_or_better.assert_hand( ['tc', '9s', 'ks', 'as', 'ts'], jacks_or_better.HAND_NOTHING, 0 )
    jacks_or_better.assert_hand( ['8c', '9s', '8s', 'as', 'ts'], jacks_or_better.HAND_NOTHING,0 )
    jacks_or_better.assert_hand( ['8c', '9s', '8s', '9d', 'ts'], jacks_or_better.HAND_TWO_PAIR,2 )
    jacks_or_better.assert_hand( ['8c', '8d', '8s', '9d', 'qs'], jacks_or_better.HAND_THREE_OF_A_KIND,3 )
    jacks_or_better.assert_hand( ['8c', '9d', 'js', 'qd', 'ts'], jacks_or_better.HAND_STRAIGHT,4 )
    jacks_or_better.assert_hand( ['kc', 'ad', 'js', 'qd', 'ts'], jacks_or_better.HAND_STRAIGHT,4 )
    jacks_or_better.assert_hand( ['2c', '4d', 'as', '3d', '5s'], jacks_or_better.HAND_STRAIGHT,4 )
    jacks_or_better.assert_hand( ['kc', 'ac', 'qc', 'jc', 'tc'], jacks_or_better.HAND_ROYAL_FLUSH, 250 )
    
    var bonus_deluxe = poker_games[6];

    bonus_deluxe.assert_hand( ['4s', '9c', '4h', '4c', '4d'], bonus_deluxe.HAND_FOUR_OF_A_KIND, 80 );
    bonus_deluxe.assert_hand( ['8c', '9s', '8s', '9d', 'ts'], bonus_deluxe.HAND_TWO_PAIR,1 );
    bonus_deluxe.assert_hand( ['tc', '8c', '8s', '9d', 'ts'], bonus_deluxe.HAND_TWO_PAIR,1 );
    bonus_deluxe.assert_hand( ['8c', '9s', '8s', 'as', 'ts'], bonus_deluxe.HAND_NOTHING,0 );
    bonus_deluxe.assert_hand( ['as', '2s', '3s', '4s', '5s'], bonus_deluxe.HAND_STRAIGHT_FLUSH, 50 );

    //console.log("what the fuck - " + (([1] + [3,4,5]) == ([13,4,5])));
}

if( false ) {
    $(document).ready(function() {
        Blackjack.test();
    });
}

