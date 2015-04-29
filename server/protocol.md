Protocol Outline

Every message is a JSON object.

't' field is type.

USERID, GAMEID are numeric identifiers

GAMEDSC is a game descriptor of the form
{ "id":GAMEID, "white":USERDSC, "black":USERDSC, "start":TIME }

USERDSC is a user descriptor of the form
{ "id":USERID, "handle":HANDLE }


=>   Hello request (client->server)
{ "t":"hello_req", "handle":"HANDLE", (auth) }

Hello response (server->client)
{ "t":"hello", "id": USERID }


=>   Request users and games (client->server)
{ "t":"users_games_req" }

Users and games (server->client)
{ "t":"users_games", "users":[ USERDSC, USERDSC, ... ], "games":[ GAMEDSC, GAMEDSC, .... ] }

Don't bother with separate updates for now; resend the entire list to every connected player on update.


=>   Make offer (client->server)
{ "t":"make_offer", "to":USERID }

Notify of offer (server->client)
{ "t":"offer", "by":USERDSC, "to":USERDSC, "status":OFFER_STATUS }
where OFFER_STATUS is one of "new", "accepted", "rejected", "cancelled"

=>   Accept/Refuse offer (client->server)
{ "t":"offer_rsp", "by":USERID, "to":USERID, "status":OFFER_STATUS }
where OFFER_STATUS is one of "accepted","rejected"


=>   Follow a game (client->server)
{ "t":"watch_game", "id":GAMEID }

=>   Leave/stop following a game (client->server)
{ "t":"leave_game", "id":GAMEID }


Send a game to a client
{ "t":"game", "dsc":GAMEDSC, "moves":[ MOVE, MOVE, ... ] }

Update a game with a move
{ "t":"game_upd", id:GAMEID, "move":MOVE }

End a game
{ "t":"game_over", id:GAMEID, "status":GAME_STATUS }
where GAME_STATUS is "cancelled", ... ?

=>   Make a move (client->server)
{ "t":"move", id:GAMEID, "move":MOVE }

A move is currently an array of three digits indicating the layer, x, and y of the move.