function init_android(key, my_player_ident, my_public_id, initial_leaderboards, initial_mygames ) {
       
    sound_list = [];
    common_init( null, key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, null, sound_list );
	
    dialog_system.init_help( [] );
    
    //  - Can just use the home system stuff since we need the same functionality
    game_system = new HomeSystem();
    game_system.call_update_service();
}
