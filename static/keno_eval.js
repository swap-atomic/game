
Keno = function() {
}

Keno.get_pretty_game_eval = function(hit_numbers_count) {
    return "Hit " + hit_numbers_count + " numbers"; 
}

Keno.is_rare = function(hit_numbers_count) {
    //  - What should this be?
    return hit_numbers_count >= 6;
}
