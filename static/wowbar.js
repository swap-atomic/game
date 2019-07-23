function WowbarSystem() {
    var default_number = function(e) {
        return ('' + e).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
    }

    var btc_number = function(b) {
        b = b - (b % 1000000); // truncate the # so that decimals aren't crazy...
        var s = Bitcoin.int_amount_to_string(b);
        var i = s.indexOf('.');
        var before_number = (i >= 0) ? s.slice(0, s.indexOf('.')) : s;
        before_number = before_number.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
        return before_number + ((i >= 0) ? s.slice(s.indexOf('.')) : "");
    }

    this.stat_values = [
        { name: "games_played", text: "GAMES PLAYED", fmt: default_number },
        { name: "btc_winnings", text: "BTC WINNINGS", fmt: btc_number },
        { name: "progressive_jackpots_won", text: "JACKPOTS WON", fmt: default_number },
        { name: "players_online", text: "PLAYERS ONLINE", fmt: default_number }
    ];

    this.stat_timeout_ids = {};
    for( var e = 0; e < this.stat_values.length; e++ ) {
        $("#wowbar_stat" + (e+1) + "_name").html(this.stat_values[e].text);
    }
}

WowbarSystem.prototype.update_stat = function( stat_index, new_value )
{
    var div = $('#wowbar_stat' + (stat_index+1));

    var formatted_value = this.stat_values[stat_index].fmt(new_value); 

    if( this.stat_values[stat_index].value == formatted_value ) {
        return;
    }

    // first update means no delay, we want those numbers up immediately
    var delay = 250 + Math.random() * 2000;
    if( this.stat_values[stat_index].value == undefined ) {
        delay = 0;
    }

    this.stat_values[stat_index].value = formatted_value;

    if(this.stat_timeout_ids[stat_index] == undefined || this.stat_timeout_ids[stat_index] == null) {
        var that = this;
        this.stat_timeout_ids[stat_index] = window.setTimeout( function() { 
            div.css({ opacity: 0.0 });
            div.animate({ opacity: 1.0 }, 1000, function() {}); 
            div.html( that.stat_values[stat_index].value ); 
            that.stat_timeout_ids[stat_index] = null;
        }, delay );
    }

}

WowbarSystem.prototype.handle_update = function(update_result) {
    for( var e = 0; e < this.stat_values.length; e++ ) {
        if( this.stat_values[e].name in update_result ) {
            this.update_stat( e, update_result[this.stat_values[e].name] );
        }
    }
}
